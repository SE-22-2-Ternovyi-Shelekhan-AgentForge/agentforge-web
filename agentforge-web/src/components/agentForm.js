// Constants and pure helpers for the agent form. Kept JSX-free (separate from
// agentForm.jsx) so React Fast Refresh stays happy.

export const EMPTY_AGENT = {
  name: '',
  role: '',
  systemPrompt: '',
  modelName: 'qwen2.5:1.5b',
  temperature: 0.2,
  tools: '',
};

// Models offered in the dropdown, grouped by provider. Ollama models run
// locally; the OpenAI ones require the worker to be configured with a key.
export const MODEL_GROUPS = [
  {
    label: 'Ollama (локальні)',
    models: [
      { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 · 1.5B (швидка)' },
      { value: 'qwen2.5:7b', label: 'Qwen 2.5 · 7B' },
      { value: 'qwen2.5:14b', label: 'Qwen 2.5 · 14B' },
      { value: 'llama3.1:8b', label: 'Llama 3.1 · 8B' },
      { value: 'llama3.2:3b', label: 'Llama 3.2 · 3B' },
      { value: 'mistral:7b', label: 'Mistral · 7B' },
      { value: 'gemma2:9b', label: 'Gemma 2 · 9B' },
      { value: 'phi3:mini', label: 'Phi-3 · Mini' },
      { value: 'deepseek-r1:7b', label: 'DeepSeek-R1 · 7B' },
    ],
  },
  {
    label: 'OpenAI (потрібен ключ)',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    ],
  },
];

export const KNOWN_MODELS = MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.value));

// Quick-fill chips.
export const TOOL_SUGGESTIONS = ['web_search', 'code_interpreter', 'file_read', 'calculator'];
export const ROLE_SUGGESTIONS = ['developer', 'critic', 'researcher', 'planner', 'reviewer'];

// Per-field help texts shown in the (?) tooltips. Single source of truth.
export const HELP = {
  name: 'Унікальне ім’я агента в межах команди — як до нього звертатися. Напр. «Олексій-розробник». Воно показується поряд із його повідомленнями у чаті.',
  role: 'Функція агента в команді (developer, critic, researcher…). Оркестратор використовує роль, щоб розподіляти задачі та визначати черговість виступів агентів.',
  model: 'LLM, якою «думає» агент. Локальні моделі (Ollama) працюють без ключа; моделі OpenAI потребують налаштованого API-ключа на воркері. Більші моделі — розумніші, але повільніші.',
  temperature:
    'Креативність відповідей: 0 — точно й передбачувано (код, факти), ближче до 2 — різноманітніше й творчіше (ідеї, тексти). Для розробників і критиків зазвичай 0–0.3.',
  systemPrompt:
    'Постійна інструкція, яку агент отримує перед кожним повідомленням. Опишіть його завдання, стиль і обмеження. Напр. «Ти досвідчений backend-розробник. Пиши лаконічний код мовою C# і пояснюй рішення».',
  tools:
    'Зовнішні інструменти, якими агент може скористатися під час роботи (пошук в інтернеті, виконання коду тощо). Перелічіть назви через кому або додайте кнопками нижче.',
};

const TEMP_DESCRIPTORS = [
  { max: 0.3, label: 'точно й передбачувано' },
  { max: 0.7, label: 'збалансовано' },
  { max: 1.2, label: 'творчо' },
  { max: Infinity, label: 'дуже креативно' },
];

export function tempDescriptor(t) {
  const v = Number(t);
  if (Number.isNaN(v)) return '';
  return TEMP_DESCRIPTORS.find((d) => v <= d.max).label;
}

// Add a tool to a comma-separated string without duplicates.
export function addTool(current, tool) {
  const list = current ? current.split(',').map((t) => t.trim()).filter(Boolean) : [];
  if (list.includes(tool)) return current;
  return [...list, tool].join(', ');
}

// Convert a comma-separated tools string into an array for the API.
export function toolsToArray(tools) {
  return tools ? tools.split(',').map((t) => t.trim()).filter(Boolean) : [];
}
