const jsKernel = require('../adapters/js');
const pythonKernel = require('../adapters/python');
const cKernel = require('../adapters/c');
const javaKernel = require('../adapters/java');
const cppKernel = require('../adapters/cpp');
const csharpKernel = require('../adapters/csharp');
const goKernel = require('../adapters/go');
const { createPlaceholderKernel } = require('../adapters/placeholder');

const javaRuntimeAvailable = typeof javaKernel.updateRuntimeAvailability === 'function'
  ? javaKernel.updateRuntimeAvailability()
  : Boolean(javaKernel.available);
const cRuntimeAvailable = typeof cKernel.updateRuntimeAvailability === 'function'
  ? cKernel.updateRuntimeAvailability()
  : Boolean(cKernel.available);
const cppRuntimeAvailable = typeof cppKernel.updateRuntimeAvailability === 'function'
  ? cppKernel.updateRuntimeAvailability()
  : Boolean(cppKernel.available);
const csharpRuntimeAvailable = typeof csharpKernel.updateRuntimeAvailability === 'function'
  ? csharpKernel.updateRuntimeAvailability()
  : Boolean(csharpKernel.available);
const goRuntimeAvailable = typeof goKernel.updateRuntimeAvailability === 'function'
  ? goKernel.updateRuntimeAvailability()
  : Boolean(goKernel.available);

const KERNEL_DEFINITIONS = [
  {
    id: 'js',
    title: 'JavaScript',
    shortTitle: 'JS',
    family: 'web',
    editorLanguage: 'javascript',
    strategies: ['simple', 'closure', 'async', 'dom'],
    strategyLabels: {
      simple: 'Обычная',
      closure: 'Замыкания',
      async: 'Async',
      dom: 'DOM'
    },
    status: 'available',
    description: 'Полное ядро для JavaScript с бесконечной генерацией задач и проверкой в vm.',
    accent: '#7dd3fc'
  },
  {
    id: 'python',
    title: 'Python',
    shortTitle: 'Py',
    family: 'backend',
    editorLanguage: 'python',
    strategies: ['simple', 'collection', 'recursion', 'algorithm'],
    strategyLabels: {
      simple: 'Обычная',
      collection: 'Коллекции',
      recursion: 'Рекурсия',
      algorithm: 'Алгоритмы'
    },
    status: 'available',
    description: 'Пакет для Python с генерацией задач по спискам, словам, строкам и алгоритмам.',
    accent: '#facc15'
  },
  {
    id: 'c',
    title: cKernel.title || 'C',
    shortTitle: cKernel.shortTitle || 'C',
    family: cKernel.family || 'native',
    editorLanguage: cKernel.editorLanguage || 'cpp',
    strategies: Array.isArray(cKernel.strategies) ? cKernel.strategies.slice() : [],
    strategyLabels: cKernel.strategyLabels || {},
    status: cRuntimeAvailable ? 'available' : 'planned',
    description: cKernel.description || 'C kernel with local gcc/clang execution.',
    accent: cKernel.accent || '#fb7185'
  },
  {
    id: 'cpp',
    title: cppKernel.title || 'C++',
    shortTitle: cppKernel.shortTitle || 'C++',
    family: cppKernel.family || 'native',
    editorLanguage: cppKernel.editorLanguage || 'cpp',
    strategies: Array.isArray(cppKernel.strategies) ? cppKernel.strategies.slice() : [],
    strategyLabels: cppKernel.strategyLabels || {},
    status: cppRuntimeAvailable ? 'available' : 'planned',
    description: cppKernel.description || 'C++ kernel with local g++/clang++ execution.',
    accent: cppKernel.accent || '#38bdf8'
  },
  {
    id: 'csharp',
    title: csharpKernel.title || 'C#',
    shortTitle: csharpKernel.shortTitle || 'C#',
    family: csharpKernel.family || 'dotnet',
    editorLanguage: csharpKernel.editorLanguage || 'csharp',
    strategies: Array.isArray(csharpKernel.strategies) ? csharpKernel.strategies.slice() : [],
    strategyLabels: csharpKernel.strategyLabels || {},
    status: csharpRuntimeAvailable ? 'available' : 'planned',
    description: csharpKernel.description || 'C# kernel with local dotnet execution.',
    accent: csharpKernel.accent || '#a78bfa'
  },
  {
    id: 'go',
    title: goKernel.title || 'Go',
    shortTitle: goKernel.shortTitle || 'Go',
    family: goKernel.family || 'backend',
    editorLanguage: goKernel.editorLanguage || 'go',
    status: goRuntimeAvailable ? 'available' : 'planned',
    description: goKernel.description || 'Go kernel with local go run execution.',
    accent: goKernel.accent || '#22c55e'
  },
  {
    id: 'java',
    title: javaKernel.title || 'Java',
    shortTitle: javaKernel.shortTitle || 'Java',
    family: javaKernel.family || 'jvm',
    editorLanguage: javaKernel.editorLanguage || 'plaintext',
    strategies: Array.isArray(javaKernel.strategies) ? javaKernel.strategies.slice() : [],
    strategyLabels: javaKernel.strategyLabels || {},
    status: javaRuntimeAvailable ? 'available' : 'planned',
    description: javaKernel.description || 'Java kernel with local javac/java execution.',
    accent: javaKernel.accent || '#f97316'
  },
  {
    id: 'rust',
    title: 'Rust',
    shortTitle: 'Rust',
    family: 'systems',
    editorLanguage: 'plaintext',
    status: 'planned',
    description: 'Планируемое ядро для Rust: ownership и безопасная память.',
    accent: '#ef4444'
  },
  {
    id: 'web',
    title: 'Web Stack',
    shortTitle: 'Web',
    family: 'frontend',
    editorLanguage: 'javascript',
    status: 'planned',
    description: 'Планируемый профиль для React, Vue, Next и Node поверх JavaScript.',
    accent: '#14b8a6'
  }
];

const RUNTIME_CACHE = new Map();
let activeKernelId = 'js';

function getDefinition(kernelId) {
  return KERNEL_DEFINITIONS.find((item) => item.id === kernelId) || null;
}

function createRuntime(definition) {
  if (definition.id === 'js') {
    return jsKernel;
  }
  if (definition.id === 'python') {
    return pythonKernel;
  }
  if (definition.id === 'c') {
    return cKernel;
  }
  if (definition.id === 'java') {
    return javaKernel;
  }
  if (definition.id === 'cpp') {
    return cppKernel;
  }
  if (definition.id === 'csharp') {
    return csharpKernel;
  }
  if (definition.id === 'go') {
    return goKernel;
  }
  return createPlaceholderKernel(definition);
}

function getRuntime(kernelId) {
  const definition = getDefinition(kernelId);
  if (!definition) {
    return jsKernel;
  }

  if (!RUNTIME_CACHE.has(definition.id)) {
    RUNTIME_CACHE.set(definition.id, createRuntime(definition));
  }

  return RUNTIME_CACHE.get(definition.id);
}

function resolveKernelId(kernelId) {
  const definition = getDefinition(kernelId);
  if (!definition || definition.status !== 'available') {
    return 'js';
  }
  return definition.id;
}

function listKernels() {
  return KERNEL_DEFINITIONS.map((definition) => ({
    ...definition,
    available: definition.status === 'available',
    active: definition.id === activeKernelId
  }));
}

function getActiveKernelId() {
  return activeKernelId;
}

function setKernel(kernelId) {
  activeKernelId = resolveKernelId(kernelId);
  return activeKernelId;
}

function getActiveKernel() {
  return getRuntime(activeKernelId);
}

function getCategories(kernelId = activeKernelId) {
  return getRuntime(resolveKernelId(kernelId)).getCategories();
}

function getDifficulties(kernelId = activeKernelId) {
  return getRuntime(resolveKernelId(kernelId)).getDifficulties();
}

async function generateTask(options = {}) {
  const kernelId = resolveKernelId(options.kernelId || activeKernelId);
  const runtime = getRuntime(kernelId);
  const definition = getDefinition(kernelId) || getDefinition('js');
  const task = await runtime.generateTask({ ...options, kernelId });
  return {
    ...task,
    kernelId,
    kernelTitle: definition?.title || kernelId,
    editorLanguage: definition?.editorLanguage || 'plaintext'
  };
}

function runTaskTests(task, userCode) {
  const kernelId = resolveKernelId(task && task.kernelId ? task.kernelId : activeKernelId);
  return getRuntime(kernelId).runTaskTests(task, userCode);
}

function getProgressSummary(progress = {}) {
  return getActiveKernel().getProgressSummary(progress);
}

function buildAchievements(progress = {}) {
  return getActiveKernel().buildAchievements(progress);
}

function createCustomTaskTemplate() {
  const kernelId = activeKernelId;
  const definition = getDefinition(kernelId) || getDefinition('js');
  const template = getActiveKernel().createCustomTaskTemplate();
  return {
    ...template,
    kernelId,
    kernelTitle: definition?.title || kernelId,
    editorLanguage: definition?.editorLanguage || 'plaintext'
  };
}

function normalizeCustomTask(task) {
  const kernelId = resolveKernelId(task && task.kernelId ? task.kernelId : activeKernelId);
  const runtime = getRuntime(kernelId);
  const definition = getDefinition(kernelId) || getDefinition('js');
  const normalized = runtime.normalizeCustomTask(task);
  return normalized
    ? {
        ...normalized,
        kernelId,
        kernelTitle: definition?.title || kernelId,
        editorLanguage: definition?.editorLanguage || 'plaintext'
      }
    : null;
}

function getKernelInfo(kernelId = activeKernelId) {
  const definition = getDefinition(kernelId) || getDefinition('js');
  return {
    ...definition,
    available: definition.status === 'available',
    active: definition.id === activeKernelId
  };
}

module.exports = {
  listKernels,
  getKernelInfo,
  getActiveKernelId,
  setKernel,
  getActiveKernel,
  getCategories,
  getDifficulties,
  generateTask,
  runTaskTests,
  getProgressSummary,
  buildAchievements,
  createCustomTaskTemplate,
  normalizeCustomTask
};

