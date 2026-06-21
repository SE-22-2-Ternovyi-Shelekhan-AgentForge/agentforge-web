import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { api, API_BASE, getToken } from '../api';
import { useAuth } from '../auth.jsx';
import TraceModal from '../components/TraceModal.jsx';
import ChatModal from '../components/ChatModal.jsx';

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [details, setDetails] = useState(null);
  const [teams, setTeams] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  // Whether the user manually dismissed the "waiting for agents" lock (escape
  // hatch for the rare case a session never produces a result/error).
  const [overridePending, setOverridePending] = useState(false);

  const connRef = useRef(null);
  const [connReady, setConnReady] = useState(false);
  const [traceSession, setTraceSession] = useState(null);
  const [modalChat, setModalChat] = useState(null); // 'new' | chat object | null
  const bottomRef = useRef(null);

  async function loadChats() {
    try {
      setChats(await api.myChats());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadChats();
    api.teams().then(setTeams).catch(() => {});
  }, []);

  // Load details for the active conversation.
  useEffect(() => {
    if (!activeId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setStatus(null);
    setOverridePending(false);
    api
      .chatDetails(activeId)
      .then((d) => !cancelled && setDetails(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Establish the SignalR connection once.
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/chat`, { accessTokenFactory: () => getToken() })
      .withAutomaticReconnect()
      .build();

    conn.on('MessageAppended', (msg) => {
      setStatus(null);
      // Appending the assistant reply makes the last message non-user, which
      // clears the derived "waiting" lock automatically.
      setDetails((prev) =>
        prev && msg.conversationId === prev.conversationId
          ? { ...prev, messages: [...prev.messages, msg] }
          : prev,
      );
    });

    conn.on('SessionEvent', (evt) => {
      const who = evt?.agentRole ? `${evt.agentRole}` : 'Агенти';
      setStatus(`${who} працює…`);
    });

    conn.on('SessionFailed', (err) => {
      setStatus(null);
      // The orchestrator persists a system message on failure but only pushes
      // the SessionFailed event. Mirror that message locally so the chat (and
      // the derived lock) matches what a page reload would show.
      const sysMsg = {
        role: 'system',
        senderName: 'system',
        content: `[${err?.errorType || 'error'}] ${err?.errorMessage || 'невідома помилка'}`,
        timestamp: new Date().toISOString(),
        agentSessionId: err?.sessionId,
      };
      setDetails((prev) =>
        prev ? { ...prev, messages: [...prev.messages, sysMsg] } : prev,
      );
    });

    let disposed = false;
    const startPromise = conn
      .start()
      .then(() => {
        if (disposed) return;
        connRef.current = conn;
        setConnReady(true);
      })
      .catch(() => {
        if (!disposed) setConnReady(false);
      });

    return () => {
      disposed = true;
      // Wait for negotiation to settle before stopping, otherwise StrictMode's
      // immediate unmount aborts it mid-negotiation and logs a spurious error.
      startPromise.finally(() => conn.stop());
      connRef.current = null;
      setConnReady(false);
    };
  }, []);

  // Join/leave the SignalR group for the active conversation.
  useEffect(() => {
    if (!connReady || !activeId) return;
    const conn = connRef.current;
    conn.invoke('JoinConversation', activeId).catch(() => {});
    return () => {
      conn.invoke('LeaveConversation', activeId).catch(() => {});
    };
  }, [connReady, activeId]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [details?.messages, status]);

  async function onChatSaved(id) {
    setModalChat(null);
    await loadChats();
    if (activeId === id) {
      // Editing the open conversation — refresh its details (title/team may have changed).
      setDetails(await api.chatDetails(id).catch(() => details));
    } else {
      setActiveId(id);
    }
  }

  async function removeChat(id, e) {
    e.stopPropagation();
    if (!window.confirm('Видалити розмову?')) return;
    try {
      await api.deleteChat(id);
      if (activeId === id) setActiveId(null);
      await loadChats();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    setError(null);
    setSending(true);
    try {
      const res = await api.sendMessage({
        conversationId: activeId,
        content: input,
        senderName: user.displayName,
      });
      setDetails((prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.message] } : prev,
      );
      setInput('');
      setStatus('Агенти працюють…');
      setOverridePending(false); // a fresh request — re-arm the waiting lock
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSending(false);
    }
  }

  const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
  const teamId = details?.teamId && details.teamId !== EMPTY_GUID ? details.teamId : null;
  const hasTeam = teamId != null;
  const teamLabel =
    details?.teamName || teams.find((t) => t.agentTeamId === teamId)?.name || teamId;

  // A session is in progress when the last message is the user's and no agent
  // reply/system message has arrived yet. Derived from data so it survives page
  // reloads; `overridePending` lets the user force-unlock if it's stuck.
  const lastMessage = details?.messages?.[details.messages.length - 1];
  const pendingReply = !overridePending && lastMessage?.role === 'user';
  const inputLocked = !hasTeam || sending || pendingReply;

  return (
    <div className="d-flex w-100" style={{ minHeight: 0 }}>
      {/* Sidebar */}
      <aside
        className="border-end border-secondary d-flex flex-column"
        style={{ width: 280, backgroundColor: '#0a0c12' }}
      >
        <div className="p-3 border-bottom border-secondary">
          <button className="btn btn-primary w-100 fw-bold" onClick={() => setModalChat('new')}>
            + Нова розмова
          </button>
        </div>
        <div className="flex-grow-1 overflow-auto">
          {chats.length === 0 && (
            <p className="text-secondary small p-3 mb-0">Розмов ще немає.</p>
          )}
          {chats.map((c) => (
            <div
              key={c.conversationId}
              onClick={() => setActiveId(c.conversationId)}
              className={`d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary ${
                activeId === c.conversationId ? 'bg-dark' : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div className="text-truncate">
                <div className="text-truncate">{c.title}</div>
                <div className="text-secondary small">{c.teamName || 'без команди'}</div>
              </div>
              <button
                className="btn btn-sm btn-link text-secondary p-0 ms-2"
                onClick={(e) => removeChat(c.conversationId, e)}
                title="Видалити"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0, backgroundColor: '#05070a' }}>
        {error && (
          <div className="alert alert-danger m-3 mb-0 py-2 d-flex justify-content-between">
            <span>{error}</span>
            <button className="btn-close btn-close-white" onClick={() => setError(null)} />
          </div>
        )}

        {!activeId && (
          <div className="flex-grow-1 d-flex justify-content-center align-items-center text-secondary">
            Оберіть розмову або створіть нову.
          </div>
        )}

        {activeId && details && (
          <>
            <header className="px-4 py-3 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">{details.title}</div>
                <div className="text-secondary small">
                  {hasTeam ? `Команда: ${teamLabel}` : 'Команду не призначено'}
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary text-nowrap"
                onClick={() =>
                  setModalChat({
                    conversationId: details.conversationId,
                    title: details.title,
                    agentTeamId: teamId,
                  })
                }
                title="Налаштування розмови"
              >
                ⚙ Налаштування
              </button>
            </header>

            <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-3">
              {details.messages.length === 0 && (
                <p className="text-secondary text-center">Повідомлень ще немає.</p>
              )}
              {details.messages.map((m) => (
                <MessageBubble
                  key={m.chatMessageId || `${m.timestamp}-${m.content}`}
                  message={m}
                  onShowTrace={setTraceSession}
                />
              ))}
              {pendingReply && (
                <div className="align-self-start text-secondary small">
                  <span className="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true" />
                  {status || 'Агенти працюють…'}
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-secondary p-0 ms-2 align-baseline"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setOverridePending(true)}
                    title="Розблокувати введення, якщо відповідь не приходить"
                  >
                    розблокувати
                  </button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-3 border-top border-secondary d-flex gap-2">
              <input
                className="form-control bg-dark text-white border-secondary"
                placeholder={
                  !hasTeam
                    ? 'Призначте команду в «⚙ Налаштування»'
                    : pendingReply
                      ? 'Зачекайте на відповідь агентів…'
                      : 'Напишіть повідомлення…'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={inputLocked}
              />
              <button className="btn btn-primary fw-bold" disabled={inputLocked || !input.trim()}>
                {sending || pendingReply ? '…' : 'Надіслати'}
              </button>
            </form>
          </>
        )}
      </main>

      <TraceModal sessionId={traceSession} onClose={() => setTraceSession(null)} />

      {modalChat && (
        <ChatModal
          chat={modalChat === 'new' ? null : modalChat}
          teams={teams}
          onClose={() => setModalChat(null)}
          onSaved={onChatSaved}
          onTeamsChanged={() => api.teams().then(setTeams).catch(() => {})}
        />
      )}
    </div>
  );
}

function MessageBubble({ message, onShowTrace }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="align-self-center text-warning small text-center" style={{ maxWidth: '80%' }}>
        {message.content}
      </div>
    );
  }

  return (
    <div className={`align-self-${isUser ? 'end text-end' : 'start'}`} style={{ maxWidth: '80%' }}>
      <div className="text-secondary small mb-1">{message.senderName || (isUser ? 'Ви' : 'Агент')}</div>
      <div
        className={`p-2 rounded-3 ${
          isUser ? 'bg-primary text-white' : 'bg-dark text-light border border-secondary'
        }`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {message.content}
      </div>
      {message.agentSessionId && (
        <div className="mt-1">
          <button
            className="btn btn-sm btn-link text-secondary p-0 small"
            onClick={() => onShowTrace(message.agentSessionId)}
          >
            переглянути трасування
          </button>
        </div>
      )}
    </div>
  );
}
