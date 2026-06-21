// Reusable UI building blocks for configuring an agent. Used by both the
// full-page TeamsPage and the in-chat TeamModal so the two stay in sync.
// Constants and pure helpers live in the JSX-free agentForm.js sibling.
import InfoHint from './InfoHint.jsx';
import {
  MODEL_GROUPS,
  KNOWN_MODELS,
  HELP,
  TOOL_SUGGESTIONS,
  ROLE_SUGGESTIONS,
  tempDescriptor,
  addTool,
} from './agentForm.js';

export function Field({ label, hint, help, helpBelow = false, children, className = '' }) {
  return (
    <div className={className}>
      <label className="form-label text-secondary small mb-1 d-inline-flex align-items-center">
        {label}
        {hint && <span className="ms-1 text-secondary" style={{ opacity: 0.6 }}>· {hint}</span>}
        {help && <InfoHint text={help} below={helpBelow} />}
      </label>
      {children}
    </div>
  );
}

export function ModelSelect({ value, onChange, size = 'sm' }) {
  // If an agent was saved with a model not in our list, keep it selectable.
  const isCustom = value && !KNOWN_MODELS.includes(value);
  return (
    <select
      className={`form-select ${size ? `form-select-${size}` : ''} bg-dark text-white border-secondary`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {MODEL_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </optgroup>
      ))}
      {isCustom && (
        <optgroup label="Інше">
          <option value={value}>{value}</option>
        </optgroup>
      )}
    </select>
  );
}

// Slider + numeric input for the temperature, with a plain-language descriptor.
export function TemperatureField({ value, onChange, className = '', helpBelow = false }) {
  return (
    <Field label="Температура" hint="0–2" help={HELP.temperature} helpBelow={helpBelow} className={className}>
      <div className="d-flex align-items-center gap-2">
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          className="form-range flex-grow-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="number"
          step="0.1"
          min="0"
          max="2"
          className="form-control form-control-sm bg-dark text-white border-secondary"
          style={{ width: 72 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
        {tempDescriptor(value)}
      </div>
    </Field>
  );
}

/**
 * The full set of agent fields (name, role, model, temperature, prompt, tools)
 * with help icons and quick-fill chips.
 *
 * Props:
 *   draft     — agent draft ({ name, role, modelName, temperature, systemPrompt, tools }).
 *   onChange  — called with a partial patch to merge into the draft.
 *   helpBelow — render tooltips below their icons (use inside modals near the top).
 */
export function AgentFields({ draft, onChange, helpBelow = false }) {
  return (
    <div className="row g-3">
      <Field label="Ім'я" help={HELP.name} helpBelow={helpBelow} className="col-md-6">
        <input
          className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="напр. «Олексій-розробник»"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <Field label="Роль" help={HELP.role} helpBelow={helpBelow} className="col-md-6">
        <input
          className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="developer, critic, researcher…"
          value={draft.role}
          onChange={(e) => onChange({ role: e.target.value })}
        />
        <div className="d-flex flex-wrap gap-1 mt-2">
          {ROLE_SUGGESTIONS.map((role) => (
            <button
              key={role}
              type="button"
              className={`btn btn-sm py-0 px-2 ${
                draft.role === role ? 'btn-primary' : 'btn-outline-secondary'
              }`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => onChange({ role })}
            >
              {role}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Модель" help={HELP.model} helpBelow={helpBelow} className="col-md-8">
        <ModelSelect value={draft.modelName} onChange={(v) => onChange({ modelName: v })} />
      </Field>
      <TemperatureField
        value={draft.temperature}
        onChange={(v) => onChange({ temperature: v })}
        className="col-md-4"
        helpBelow={helpBelow}
      />
      <Field label="Системний промпт" help={HELP.systemPrompt} helpBelow={helpBelow} className="col-12">
        <textarea
          rows={2}
          className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="Опишіть, як має поводитися агент і за що відповідає…"
          value={draft.systemPrompt || ''}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
        />
      </Field>
      <Field label="Інструменти" hint="через кому" help={HELP.tools} helpBelow={helpBelow} className="col-12">
        <input
          className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="web_search, code_interpreter…"
          value={draft.tools}
          onChange={(e) => onChange({ tools: e.target.value })}
        />
        <div className="d-flex flex-wrap gap-1 mt-2">
          {TOOL_SUGGESTIONS.map((tool) => (
            <button
              key={tool}
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              style={{ fontSize: '0.75rem' }}
              onClick={() => onChange({ tools: addTool(draft.tools, tool) })}
            >
              + {tool}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
