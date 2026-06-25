import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { api, API_BASE, getToken } from '../api';
import { useAuth } from '../auth-context.js';
import TraceModal from '../components/TraceModal.jsx';
import ChatModal from '../components/ChatModal.jsx';
import Markdown from '../components/Markdown.jsx';
import {
  agentGradient,
  agentGlyph,
  prettyName,
  stripRolePrefix,
  roleFromTagged,
  isSummaryRole,
} from '../components/agentDisplay.js';

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [details, setDetails] = useState(null);
  const [teams, setTeams] = useState([]);
  const [input, setInput] = useState('');
  // Currently-working agent shown in the typing indicator: { name } | null.
  const [activeAgent, setActiveAgent] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  // Whether the user manually dismissed the "waiting for agents" lock (escape
  // hatch for the rare case a session never produces a result/error).
  const [overridePending, setOverridePending] = useState(false);
  // Token-by-token streaming bubble for the currently-active agent.
  const [streamingMessage, setStreamingMessage] = useState(null); // { agentRole, content }

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
    setActiveAgent(null);
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
      setActiveAgent(null);
      setStreamingMessage(null);
      setDetails((prev) =>
        prev && msg.conversationId === prev.conversationId
          ? { ...prev, messages: [...prev.messages, msg] }
          : prev,
      );
    });

    conn.on('SessionEvent', (evt) => {
      const role = evt?.agentRole ?? evt?.agent_role ?? null;
      const eventType = evt?.eventType ?? evt?.event_type ?? null;

      if (eventType === 'agent_token') {
        const token = evt?.payload?.token ?? '';
        if (token) {
          setStreamingMessage((prev) =>
            prev?.agentRole === role
              ? { agentRole: role, content: prev.content + token }
              : { agentRole: role, content: token },
          );
        }
        return;
      }

      if (eventType === 'agent_started') {
        setStreamingMessage({ agentRole: role, content: '' });
      }

      setActiveAgent(role ? { key: role, name: prettyName(role) } : { key: null, name: null });
    });

    conn.on('SessionFailed', (err) => {
      setActiveAgent(null);
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

  // Auto-scroll to the latest message or streaming token.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [details?.messages, activeAgent, streamingMessage?.content]);

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
      setActiveAgent({ key: null, name: null }); // generic "team is working" until first event
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
        className="af-glass d-flex flex-column"
        style={{ width: 290, flex: '0 0 290px' }}
      >
        <div className="p-3">
          <button className="btn btn-primary w-100 fw-bold" onClick={() => setModalChat('new')}>
            <span className="me-1">＋</span> Нова розмова
          </button>
        </div>
        <div className="px-3 pb-1 text-uppercase af-muted" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
          Розмови
        </div>
        <div className="flex-grow-1 overflow-auto pb-2">
          {chats.length === 0 && (
            <p className="af-muted small px-3 pt-2 mb-0">Розмов ще немає.</p>
          )}
          {chats.map((c) => (
            <div
              key={c.conversationId}
              onClick={() => setActiveId(c.conversationId)}
              className={`af-chat-item d-flex justify-content-between align-items-center ${
                activeId === c.conversationId ? 'active' : ''
              }`}
            >
              <div className="text-truncate">
                <div className="text-truncate fw-medium" style={{ fontSize: '0.9rem' }}>{c.title}</div>
                <div className="af-muted text-truncate" style={{ fontSize: '0.76rem' }}>
                  {c.teamName || 'без команди'}
                </div>
              </div>
              <button
                className="af-del btn btn-sm btn-link af-muted p-0 ms-2"
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
      <main className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        {error && (
          <div className="alert alert-danger m-3 mb-0 py-2 d-flex justify-content-between">
            <span>{error}</span>
            <button className="btn-close btn-close-white" onClick={() => setError(null)} />
          </div>
        )}

        {!activeId && <ChatHero onNew={() => setModalChat('new')} />}

        {activeId && details && (
          <>
            <header className="px-4 py-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid var(--af-border)' }}>
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                {hasTeam && (
                  <span
                    className="af-avatar"
                    style={{ background: agentGradient(teamLabel), width: 34, height: 34, borderRadius: 11 }}
                  >
                    {agentGlyph(teamLabel)}
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="fw-bold text-truncate">{details.title}</div>
                  <div className="af-muted small text-truncate">
                    {hasTeam ? `Команда: ${teamLabel}` : 'Команду не призначено'}
                  </div>
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

            <div className="flex-grow-1 overflow-auto px-4 py-4 d-flex flex-column gap-3">
              {details.messages.length === 0 && (
                <p className="af-muted text-center my-auto">
                  Повідомлень ще немає. Напишіть перше — команда візьметься за роботу.
                </p>
              )}
              {details.messages.map((m) => (
                <MessageBubble
                  key={m.chatMessageId || `${m.timestamp}-${m.content}`}
                  message={m}
                  onShowTrace={setTraceSession}
                />
              ))}
              {pendingReply && streamingMessage?.content ? (
                <StreamingBubble
                  agentRole={streamingMessage.agentRole}
                  content={streamingMessage.content}
                  onUnlock={() => setOverridePending(true)}
                />
              ) : pendingReply ? (
                <TypingIndicator
                  agent={activeAgent}
                  onUnlock={() => setOverridePending(true)}
                />
              ) : null}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-3" style={{ borderTop: '1px solid var(--af-border)' }}>
              <div className="d-flex gap-2">
                <input
                  className="form-control"
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
                <button className="btn btn-primary fw-bold px-4" disabled={inputLocked || !input.trim()}>
                  {sending || pendingReply ? '…' : 'Надіслати'}
                </button>
              </div>
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

/* ─────────────────────────  Empty-state hero  ───────────────────────── */
function ChatHero({ onNew }) {
  return (
    <div className="af-hero af-fade-in">
      <div className="position-relative" style={{ zIndex: 1, maxWidth: 640 }}>
        <div className="af-hero-badge mx-auto">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="url(#g)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0" stopColor="#b9a8ff" />
                <stop offset="1" stopColor="#7cc4ff" />
              </linearGradient>
            </defs>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
          </svg>
        </div>
        <h2 className="fw-bold mb-2">
          Ласкаво просимо до <span className="af-gradient-text">AgentForge</span>
        </h2>
        <p className="af-muted mb-4" style={{ fontSize: '1.02rem' }}>
          Командуйте командами AI-агентів, які разом розв’язують ваші задачі — від
          написання коду до аналізу та рецензування.
        </p>

        <div className="row g-3 mb-4 text-start">
          <div className="col-12 col-md-4">
            <div className="af-feature-card h-100">
              <div className="af-feature-ico">👥</div>
              <div className="fw-semibold mb-1">Команди агентів</div>
              <div className="af-muted small">Кожен агент має роль, модель та інструменти.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="af-feature-card h-100">
              <div className="af-feature-ico">⚡</div>
              <div className="fw-semibold mb-1">Реальний час</div>
              <div className="af-muted small">Стежте за роботою агентів наживо.</div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="af-feature-card h-100">
              <div className="af-feature-ico">🔍</div>
              <div className="fw-semibold mb-1">Прозорість</div>
              <div className="af-muted small">Дивіться внесок кожного агента й трасування.</div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-primary fw-bold px-4" onClick={onNew}>
            ＋ Почати розмову
          </button>
          <Link to="/teams" className="btn btn-outline-secondary px-4">
            Налаштувати команди
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Typing indicator  ───────────────────────── */
function TypingIndicator({ agent, onUnlock }) {
  const key = agent?.key;
  const name = agent?.name;
  const summary = isSummaryRole(key);
  const label = summary
    ? 'Команда формує підсумок…'
    : name
      ? `${name} працює…`
      : 'Агенти працюють…';
  return (
    <div className="d-flex align-items-center gap-2 af-fade-in">
      {key && (
        <span className="af-avatar" style={{ background: agentGradient(key) }}>
          {agentGlyph(key)}
        </span>
      )}
      <div className="af-typing">
        <span className="af-typing-dots"><span /><span /><span /></span>
        <span>{label}</span>
      </div>
      <button
        type="button"
        className="btn btn-link btn-sm af-muted p-0 ms-1"
        style={{ fontSize: '0.75rem' }}
        onClick={onUnlock}
        title="Розблокувати введення, якщо відповідь не приходить"
      >
        розблокувати
      </button>
    </div>
  );
}

/* ─────────────────────────  Streaming bubble  ─────────────────────── */
function StreamingBubble({ agentRole, content, onUnlock }) {
  return (
    <div className="af-msg-row af-fade-in">
      <span className="af-avatar" style={{ background: agentGradient(agentRole || 'agent') }}>
        {agentGlyph(agentRole || 'agent')}
      </span>
      <div style={{ minWidth: 0, maxWidth: '100%' }}>
        <div className="small af-muted mb-1">{prettyName(agentRole || 'agent')}</div>
        <div className="af-bubble af-bubble-agent">
          <Markdown>{content}</Markdown>
          <span style={{ display: 'inline-block', width: '0.55em', height: '1em', background: 'currentColor', verticalAlign: 'text-bottom', marginLeft: 2, animation: 'af-blink 1s step-end infinite', opacity: 0.7 }} />
        </div>
        <button
          type="button"
          className="btn btn-link btn-sm af-muted p-0 mt-1"
          style={{ fontSize: '0.75rem' }}
          onClick={onUnlock}
          title="Розблокувати введення"
        >
          розблокувати
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  Message bubble  ───────────────────────── */
function MessageBubble({ message, onShowTrace }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="align-self-center text-center af-fade-in" style={{ maxWidth: '80%' }}>
        <span className="badge" style={{ background: 'rgba(255,92,122,0.14)', color: '#ffb3c1', border: '1px solid rgba(255,92,122,0.3)' }}>
          {message.content}
        </span>
      </div>
    );
  }

  const displayName = isUser ? 'Ви' : prettyName(message.senderName || 'Агент');
  const avatarKey = isUser ? 'you' : message.senderName || 'agent';
  const content = isUser ? message.content : stripRolePrefix(message.content, message.senderName);

  return (
    <div className={`af-msg-row af-fade-in ${isUser ? 'user' : ''}`}>
      <span
        className="af-avatar"
        style={{ background: isUser ? 'linear-gradient(135deg, #4a5578, #2b3350)' : agentGradient(avatarKey) }}
      >
        {agentGlyph(avatarKey)}
      </span>
      <div style={{ minWidth: 0, maxWidth: '100%' }}>
        <div className={`small af-muted mb-1 ${isUser ? 'text-end' : ''}`}>{displayName}</div>
        <div className={`af-bubble ${isUser ? 'af-bubble-user' : 'af-bubble-agent'}`}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
          ) : (
            <Markdown>{content}</Markdown>
          )}
        </div>
        {!isUser && message.agentSessionId && (
          <Contributions sessionId={message.agentSessionId} onShowTrace={onShowTrace} />
        )}
      </div>
    </div>
  );
}

/* ───────────────  Multi-agent contributions (lazy-loaded trace)  ─────────────── */
function Contributions({ sessionId, onShowTrace }) {
  const [open, setOpen] = useState(false);
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !trace) {
      setLoading(true);
      try {
        setTrace(await api.trace(sessionId));
      } catch {
        setTrace({ trace: [] });
      } finally {
        setLoading(false);
      }
    }
  }

  const steps = trace?.trace || [];
  const agentCount = new Set(steps.map((s) => s.agentRole)).size;

  return (
    <div className="af-contrib">
      <button type="button" className="af-contrib-head" onClick={toggle}>
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
        <span className="fw-medium">Внесок команди</span>
        {trace && (
          <span className="af-muted">
            · {steps.length} {steps.length === 1 ? 'крок' : 'кроків'}
            {agentCount > 1 ? ` · ${agentCount} агентів` : ''}
          </span>
        )}
        <span className="ms-auto af-muted" style={{ fontSize: '0.72rem' }}>
          {open ? 'згорнути' : 'показати'}
        </span>
      </button>

      {open && (
        <div className="af-contrib-body af-fade-in">
          {loading && <div className="af-muted small py-2">Завантаження…</div>}
          {!loading && steps.length === 0 && (
            <div className="af-muted small py-2">Окремих кроків не зафіксовано.</div>
          )}
          {steps.map((s, i) => {
            const role = roleFromTagged(s.output, s.agentRole);
            return (
              <div key={i} className="af-contrib-step">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="af-avatar" style={{ background: agentGradient(role), width: 24, height: 24, fontSize: '0.62rem', borderRadius: 7 }}>
                    {agentGlyph(role)}
                  </span>
                  <span className="fw-medium small">{prettyName(role)}</span>
                  {s.toolsUsed?.length > 0 && (
                    <span className="af-muted" style={{ fontSize: '0.72rem' }}>
                      🔧 {s.toolsUsed.join(', ')}
                    </span>
                  )}
                </div>
                <div className="af-md" style={{ fontSize: '0.88rem' }}>
                  <Markdown>{stripRolePrefix(s.output, s.agentRole)}</Markdown>
                </div>
              </div>
            );
          })}
          {trace && (
            <button
              type="button"
              className="btn btn-sm btn-link af-muted p-0 mt-1"
              style={{ fontSize: '0.78rem' }}
              onClick={() => onShowTrace(sessionId)}
            >
              переглянути повне трасування →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
