import { useEffect, useState } from 'react';
import { api } from '../api';
import InfoHint from './InfoHint.jsx';
import TeamModal from './TeamModal.jsx';

/**
 * Create / edit a conversation: title + team selection. The team can be
 * created or edited inline via a nested TeamModal, without leaving the flow.
 *
 * Props:
 *   chat           — existing conversation to edit ({ conversationId, title, agentTeamId }),
 *                    or null/undefined to create a new one.
 *   teams          — initial list of available teams.
 *   onClose        — called to dismiss the modal.
 *   onSaved        — called with the conversation id after a successful save.
 *   onTeamsChanged — optional; called after teams were created/edited so the
 *                    parent page can refresh its own copy of the list.
 */
export default function ChatModal({ chat, teams = [], onClose, onSaved, onTeamsChanged }) {
  const isEdit = Boolean(chat);

  const [title, setTitle] = useState(chat?.title || '');
  const [teamId, setTeamId] = useState(chat?.agentTeamId || '');
  const [teamList, setTeamList] = useState(teams);
  const [teamModal, setTeamModal] = useState(null); // 'new' | teamId | null
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pull a fresh team list when the modal opens (the prop may be stale or still
  // loading in the parent). setState happens in the async callback, not the
  // effect body, so it doesn't trigger cascading renders.
  useEffect(() => {
    api.teams().then(setTeamList).catch(() => {});
  }, []);

  async function reloadTeams() {
    try {
      const list = await api.teams();
      setTeamList(list);
      onTeamsChanged?.();
      return list;
    } catch {
      return teamList;
    }
  }

  async function save(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    // A conversation must always have a team when it is created.
    if (!isEdit && !teamId) {
      setError('Оберіть або створіть команду для розмови.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let id;
      if (isEdit) {
        id = chat.conversationId;
        if (trimmed !== chat.title) await api.renameChat(id, trimmed);
        if (teamId && teamId !== chat.agentTeamId) await api.setupTeam(id, teamId);
      } else {
        const created = await api.createChat(trimmed);
        // createChat may return a bare id or an object — normalize it.
        id = created?.conversationId ?? created?.id ?? created;
        await api.setupTeam(id, teamId);
      }
      onSaved?.(id);
    } catch (e2) {
      setError(e2.message);
      setSaving(false);
    }
  }

  // When the nested team modal saves, refresh the list and select that team.
  async function onTeamSaved(savedId) {
    await reloadTeams();
    if (savedId) setTeamId(savedId);
  }

  const selectedTeam = teamList.find((t) => t.agentTeamId === teamId);

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="card bg-black border-secondary shadow-lg"
        style={{ width: '100%', maxWidth: 480 }}
        onSubmit={save}
      >
        <div className="card-header border-secondary d-flex justify-content-between align-items-center">
          <span className="fw-bold">{isEdit ? 'Налаштування розмови' : 'Нова розмова'}</span>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}

          <div className="mb-3">
            <label className="form-label text-secondary small mb-1 d-inline-flex align-items-center">
              Назва
              <InfoHint
                below
                text="Коротко опишіть тему розмови — за нею ви знайдете її у списку зліва. Напр. «Рефакторинг сервісу оплат». Назву можна змінити будь-коли."
              />
            </label>
            <input
              autoFocus
              className="form-control bg-dark text-white border-secondary"
              placeholder="напр. «Рефакторинг сервісу оплат»"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="mb-1">
            <label className="form-label text-secondary small mb-1 d-inline-flex align-items-center">
              Команда
              <InfoHint
                below
                text="Команда агентів, які оброблятимуть цю розмову. Кожен агент має свою роль і модель. Без команди розмову створити можна, але надсилати повідомлення — лише після її призначення."
              />
            </label>

            {teamList.length === 0 ? (
              <div
                className="text-secondary small border border-secondary rounded-3 p-3 text-center"
                style={{ borderStyle: 'dashed' }}
              >
                <div className="mb-2">Команд ще немає.</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setTeamModal('new')}
                >
                  + Створити першу команду
                </button>
              </div>
            ) : (
              <>
                <select
                  className="form-select bg-dark text-white border-secondary"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">{isEdit ? 'Без команди' : 'Оберіть команду…'}</option>
                  {teamList.map((t) => (
                    <option key={t.agentTeamId} value={t.agentTeamId}>
                      {t.name} ({t.agents?.length || 0} агентів)
                    </option>
                  ))}
                </select>
                <div className="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setTeamModal('new')}
                  >
                    + Створити команду
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setTeamModal(teamId)}
                    disabled={!teamId}
                    title={teamId ? 'Редагувати обрану команду' : 'Спершу оберіть команду'}
                  >
                    ✎ Редагувати{selectedTeam ? `: ${selectedTeam.name}` : ''}
                  </button>
                </div>
              </>
            )}

            <div className="form-text text-secondary">
              {isEdit
                ? 'Команду можна змінити будь-коли.'
                : 'Розмову не можна створити без команди. Оберіть наявну або створіть нову — її можна змінити пізніше.'}
            </div>
          </div>
        </div>

        <div className="card-footer border-secondary d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Скасувати
          </button>
          <button
            className="btn btn-primary fw-bold"
            disabled={saving || !title.trim() || (!isEdit && !teamId)}
          >
            {saving ? '…' : isEdit ? 'Зберегти' : 'Створити'}
          </button>
        </div>
      </form>

      {teamModal && (
        <TeamModal
          teamId={teamModal === 'new' ? null : teamModal}
          onClose={() => setTeamModal(null)}
          onSaved={onTeamSaved}
          onChanged={reloadTeams}
        />
      )}
    </div>
  );
}
