import { useEffect, useState } from 'react';
import { api } from '../api';
import { AgentFields } from './agentForm.jsx';
import { EMPTY_AGENT, toolsToArray } from './agentForm.js';

/**
 * Manage a single team inline (without leaving the chat-creation flow):
 * set its name and add / edit / remove its agents. Scoped to ONE team.
 *
 * Props:
 *   teamId      — existing team to edit, or null to create a new one.
 *   initialName — pre-fill the name when creating a new team.
 *   onClose     — dismiss the modal.
 *   onSaved     — called with the team id once it exists / is saved, so the
 *                 caller can select it. Also fired on plain "Готово".
 *   onChanged   — optional; called whenever teams were mutated (create/agent
 *                 CRUD) so the caller can refresh its list.
 */
export default function TeamModal({ teamId, initialName = '', onClose, onSaved, onChanged }) {
  const [team, setTeam] = useState(null); // server team object once it exists
  const [name, setName] = useState(initialName);
  // Team-level orchestration settings (empty string → use server/worker default).
  const [maxRounds, setMaxRounds] = useState('');
  const [maxIterations, setMaxIterations] = useState('');
  const [supervisorPrompt, setSupervisorPrompt] = useState('');
  const [agentDraft, setAgentDraft] = useState(EMPTY_AGENT);
  const [editing, setEditing] = useState(null); // agent draft with tools as string
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(teamId));

  const agents = team?.agents || [];

  // Load the existing team (no single-team endpoint, so filter the list).
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    api
      .teams()
      .then((list) => {
        if (cancelled) return;
        const t = list.find((x) => x.agentTeamId === teamId) || null;
        setTeam(t);
        setName(t?.name || '');
        setMaxRounds(t?.maxRounds != null ? String(t.maxRounds) : '');
        setMaxIterations(t?.maxIterations != null ? String(t.maxIterations) : '');
        setSupervisorPrompt(t?.supervisorPrompt || '');
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  async function reloadTeam(id) {
    const list = await api.teams();
    const t = list.find((x) => x.agentTeamId === id) || null;
    setTeam(t);
    onChanged?.();
    return t;
  }

  // Parse a bounded integer from an input string; '' → null (use default).
  function intOrNull(value, min, max) {
    const s = String(value).trim();
    if (s === '') return null;
    const n = Math.round(Number(s));
    if (Number.isNaN(n)) return null;
    return Math.min(max, Math.max(min, n));
  }

  // Make sure a team row exists on the server (create on first need), then persist
  // the team name and team-level settings. Spreads `...current` so the existing
  // agents are preserved (the PUT maps the whole AgentTeamDto onto the entity).
  async function ensureTeam() {
    let id = team?.agentTeamId;
    let current = team;
    if (!id) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Спершу вкажіть назву команди.');
      const before = (await api.teams()).map((t) => t.agentTeamId);
      const res = await api.createTeam(trimmed);
      id = res?.agentTeamId;
      if (!id) {
        const after = await api.teams();
        id = after.find((t) => !before.includes(t.agentTeamId))?.agentTeamId;
      }
      if (!id) throw new Error('Не вдалося створити команду.');
      current = await reloadTeam(id);
    }
    await api.updateTeam({
      ...current,
      name: name.trim() || current.name,
      maxRounds: intOrNull(maxRounds, 1, 5),
      maxIterations: intOrNull(maxIterations, 2, 30),
      supervisorPrompt: supervisorPrompt.trim() || null,
    });
    await reloadTeam(id);
    return id;
  }

  async function addAgent(e) {
    e.preventDefault();
    if (!agentDraft.name.trim() || !agentDraft.role.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await ensureTeam();
      await api.createAgent({
        agentTeamId: id,
        name: agentDraft.name,
        role: agentDraft.role,
        systemPrompt: agentDraft.systemPrompt,
        modelName: agentDraft.modelName,
        temperature: Number(agentDraft.temperature) || 0,
        tools: toolsToArray(agentDraft.tools),
        capabilities: [],
      });
      setAgentDraft(EMPTY_AGENT);
      await reloadTeam(id);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateAgent({
        agentId: editing.agentId,
        agentTeamId: editing.agentTeamId,
        name: editing.name,
        role: editing.role,
        systemPrompt: editing.systemPrompt,
        modelName: editing.modelName,
        temperature: Number(editing.temperature) || 0,
        tools: toolsToArray(editing.tools),
        capabilities: [],
      });
      setEditing(null);
      await reloadTeam(editing.agentTeamId);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAgent(agentId) {
    if (!window.confirm('Видалити агента?')) return;
    setError(null);
    try {
      await api.deleteAgent(agentId);
      await reloadTeam(team.agentTeamId);
    } catch (e) {
      setError(e.message);
    }
  }

  // "Готово": ensure the team exists (if a name was entered) and hand its id back.
  async function finish() {
    setBusy(true);
    setError(null);
    try {
      if (team?.agentTeamId || name.trim()) {
        const id = await ensureTeam();
        onSaved?.(id);
      }
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card bg-black border-secondary shadow-lg d-flex flex-column"
        style={{ width: '100%', maxWidth: 620, maxHeight: '90vh' }}
      >
        <div className="card-header border-secondary d-flex justify-content-between align-items-center">
          <span className="fw-bold">{teamId ? 'Редагування команди' : 'Нова команда'}</span>
          <button type="button" className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="card-body overflow-auto">
          {error && (
            <div className="alert alert-danger py-2 d-flex justify-content-between">
              <span>{error}</span>
              <button className="btn-close btn-close-white" onClick={() => setError(null)} />
            </div>
          )}

          {loading ? (
            <div className="text-secondary small">Завантаження…</div>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label text-secondary small mb-1">Назва команди</label>
                <input
                  autoFocus={!teamId}
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="напр. «Команда розробки»"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="border border-secondary rounded-3 p-3 mb-3">
                <div className="text-secondary small fw-medium mb-2">Налаштування команди</div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label text-secondary small mb-1">
                      Макс. раундів ревʼю <span className="text-secondary" style={{ opacity: 0.6 }}>· 1–5</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      placeholder="2"
                      value={maxRounds}
                      onChange={(e) => setMaxRounds(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary small mb-1">
                      Макс. ітерацій <span className="text-secondary" style={{ opacity: 0.6 }}>· safety, 2–30</span>
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="30"
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      placeholder="10"
                      value={maxIterations}
                      onChange={(e) => setMaxIterations(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label text-secondary small mb-1">Промпт супервізора</label>
                    <textarea
                      rows={2}
                      className="form-control form-control-sm bg-dark text-white border-secondary"
                      placeholder="Залиште порожнім для стандартної логіки…"
                      value={supervisorPrompt}
                      onChange={(e) => setSupervisorPrompt(e.target.value)}
                    />
                    <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                      Якщо задано — рішеннями про раунди керує LLM-супервізор із цим промптом.
                      Порожнє — детермінована логіка (цикл триває, поки рецензент не схвалить).
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-secondary small fw-medium mb-2">
                Агенти {agents.length > 0 && <span className="badge bg-primary ms-1">{agents.length}</span>}
              </div>

              {!team && (
                <p className="text-secondary small">
                  Вкажіть назву та додайте першого агента — команду буде створено автоматично.
                </p>
              )}
              {team && agents.length === 0 && (
                <p className="text-secondary small">У команді ще немає агентів.</p>
              )}

              {agents.map((a) =>
                editing?.agentId === a.agentId ? (
                  <form
                    key={a.agentId}
                    onSubmit={saveEdit}
                    className="border border-secondary rounded-3 p-3 my-2"
                  >
                    <AgentFields
                      draft={editing}
                      onChange={(patch) => setEditing({ ...editing, ...patch })}
                      helpBelow
                    />
                    <div className="d-flex gap-2 mt-3">
                      <button className="btn btn-sm btn-primary" disabled={busy}>
                        Зберегти
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setEditing(null)}
                      >
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    key={a.agentId}
                    className="d-flex justify-content-between align-items-start border-bottom border-secondary py-2"
                  >
                    <div>
                      <div className="fw-medium">
                        {a.name} <span className="text-secondary small">· {a.role}</span>
                      </div>
                      <div className="text-secondary small">
                        {a.modelName} · t={a.temperature}
                        {a.tools?.length ? ` · інструменти: ${a.tools.join(', ')}` : ''}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-link text-secondary p-0"
                        onClick={() => setEditing({ ...a, tools: (a.tools || []).join(', ') })}
                        title="Редагувати"
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-sm btn-link text-secondary p-0"
                        onClick={() => removeAgent(a.agentId)}
                        title="Видалити"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ),
              )}

              {!editing && (
                <form onSubmit={addAgent} className="mt-3 pt-3 border-top border-secondary">
                  <div className="text-secondary small fw-medium mb-2">Додати агента</div>
                  <AgentFields
                    draft={agentDraft}
                    onChange={(patch) => setAgentDraft((prev) => ({ ...prev, ...patch }))}
                    helpBelow
                  />
                  <button
                    className="btn btn-sm btn-outline-primary mt-3"
                    disabled={busy || !agentDraft.name.trim() || !agentDraft.role.trim()}
                  >
                    + Додати агента
                  </button>
                  {(!agentDraft.name.trim() || !agentDraft.role.trim()) && (
                    <span className="text-secondary small ms-2">
                      Заповніть ім’я та роль, щоб додати агента.
                    </span>
                  )}
                </form>
              )}
            </>
          )}
        </div>

        <div className="card-footer border-secondary d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Скасувати
          </button>
          <button type="button" className="btn btn-primary fw-bold" onClick={finish} disabled={busy}>
            {busy ? '…' : 'Готово'}
          </button>
        </div>
      </div>
    </div>
  );
}
