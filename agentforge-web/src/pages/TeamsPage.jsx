import { useEffect, useState } from 'react';
import { api } from '../api';
import { AgentFields } from '../components/agentForm.jsx';
import { EMPTY_AGENT, toolsToArray } from '../components/agentForm.js';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [agentForms, setAgentForms] = useState({}); // teamId -> agent draft
  const [editing, setEditing] = useState(null); // agent being edited (with tools as string)
  const [renaming, setRenaming] = useState(null); // { id, value } | null

  async function load() {
    try {
      setTeams(await api.teams());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await api.createTeam(newTeamName.trim());
      setNewTeamName('');
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function renameTeam(team, e) {
    e?.preventDefault();
    const name = (renaming?.value || '').trim();
    if (!name || name === team.name) {
      setRenaming(null);
      return;
    }
    try {
      await api.updateTeam({ ...team, name });
      setRenaming(null);
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function removeTeam(team) {
    if (!window.confirm(`Видалити команду «${team.name}» разом з її агентами?`)) return;
    try {
      await api.deleteTeam(team.agentTeamId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function draftFor(teamId) {
    return agentForms[teamId] || EMPTY_AGENT;
  }

  function setDraft(teamId, patch) {
    setAgentForms((prev) => ({ ...prev, [teamId]: { ...draftFor(teamId), ...patch } }));
  }

  async function addAgent(teamId, e) {
    e.preventDefault();
    const draft = draftFor(teamId);
    if (!draft.name.trim() || !draft.role.trim()) return;
    try {
      await api.createAgent({
        agentTeamId: teamId,
        name: draft.name,
        role: draft.role,
        systemPrompt: draft.systemPrompt,
        modelName: draft.modelName,
        temperature: Number(draft.temperature) || 0,
        tools: toolsToArray(draft.tools),
        capabilities: [],
      });
      setAgentForms((prev) => ({ ...prev, [teamId]: EMPTY_AGENT }));
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function removeAgent(agentId) {
    if (!window.confirm('Видалити агента?')) return;
    try {
      await api.deleteAgent(agentId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(agent) {
    setEditing({ ...agent, tools: (agent.tools || []).join(', ') });
  }

  async function saveEdit(e) {
    e.preventDefault();
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
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  return (
    <div className="flex-grow-1 overflow-auto p-4" style={{ backgroundColor: '#05070a' }}>
      <div className="container" style={{ maxWidth: 900 }}>
        <h4 className="fw-bold mb-1">Команди агентів</h4>
        <p className="text-secondary small mb-4">
          Створюйте команди та налаштовуйте агентів: роль, модель, температуру та доступні інструменти.
        </p>

        {error && (
          <div className="alert alert-danger py-2 d-flex justify-content-between">
            <span>{error}</span>
            <button className="btn-close btn-close-white" onClick={() => setError(null)} />
          </div>
        )}

        <form onSubmit={createTeam} className="d-flex gap-2 mb-4">
          <input
            className="form-control bg-dark text-white border-secondary"
            placeholder="Назва нової команди (напр. «Команда розробки»)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
          <button className="btn btn-primary fw-bold text-nowrap" disabled={!newTeamName.trim()}>
            Створити команду
          </button>
        </form>

        {teams.length === 0 && (
          <div className="text-center text-secondary py-5 border border-secondary rounded-3" style={{ borderStyle: 'dashed' }}>
            Команд ще немає. Створіть першу, щоб додати агентів.
          </div>
        )}

        {teams.map((team) => {
          const draft = draftFor(team.agentTeamId);
          return (
            <div key={team.agentTeamId} className="card bg-black border-secondary mb-4">
              <div className="card-header border-secondary d-flex justify-content-between align-items-center gap-2">
                {renaming?.id === team.agentTeamId ? (
                  <form className="d-flex gap-2 flex-grow-1" onSubmit={(e) => renameTeam(team, e)}>
                    <input
                      autoFocus
                      className="form-control form-control-sm"
                      value={renaming.value}
                      onChange={(e) => setRenaming({ id: team.agentTeamId, value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                    />
                    <button className="btn btn-sm btn-primary text-nowrap">Зберегти</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRenaming(null)}>
                      Скасувати
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="fw-bold text-truncate">{team.name}</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary">{team.agents?.length || 0} агентів</span>
                      <button
                        className="btn btn-sm btn-link af-muted p-0"
                        title="Перейменувати команду"
                        onClick={() => setRenaming({ id: team.agentTeamId, value: team.name })}
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-sm btn-link p-0"
                        style={{ color: 'var(--af-danger)' }}
                        title="Видалити команду"
                        onClick={() => removeTeam(team)}
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="card-body">
                {(team.agents || []).length === 0 && (
                  <p className="text-secondary small">У команді ще немає агентів.</p>
                )}
                {(team.agents || []).map((a) =>
                  editing?.agentId === a.agentId ? (
                    <form
                      key={a.agentId}
                      onSubmit={saveEdit}
                      className="border border-secondary rounded-3 p-3 my-2"
                    >
                      <AgentFields
                        draft={editing}
                        onChange={(patch) => setEditing({ ...editing, ...patch })}
                      />
                      <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-sm btn-primary">Зберегти</button>
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
                          onClick={() => startEdit(a)}
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

                {editing?.agentTeamId !== team.agentTeamId && (
                  <form
                    onSubmit={(e) => addAgent(team.agentTeamId, e)}
                    className="mt-3 pt-3 border-top border-secondary"
                  >
                    <div className="text-secondary small fw-medium mb-2">Додати агента</div>
                    <AgentFields
                      draft={draft}
                      onChange={(patch) => setDraft(team.agentTeamId, patch)}
                    />
                    <button
                      className="btn btn-sm btn-outline-primary mt-3"
                      disabled={!draft.name.trim() || !draft.role.trim()}
                    >
                      + Додати агента
                    </button>
                    {(!draft.name.trim() || !draft.role.trim()) && (
                      <span className="text-secondary small ms-2">
                        Заповніть ім’я та роль, щоб додати агента.
                      </span>
                    )}
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
