const taskEngine = require('../../generation');

const JS_KERNEL_META = {
  id: 'js',
  title: 'JavaScript',
  shortTitle: 'JS',
  family: 'web',
  editorLanguage: 'javascript',
  strategies: ['simple', 'closure', 'async', 'dom'],
  strategyLabels: {
    simple: 'Обычная',
    closure: 'Замыкание',
    async: 'Async',
    dom: 'DOM'
  },
  description: 'Полноценное ядро с бесконечной генерацией задач, тестами и sandbox-проверкой в vm.',
  status: 'available',
  available: true,
  accent: '#7dd3fc'
};

function wrapTask(task) {
  return {
    ...task,
    kernelId: JS_KERNEL_META.id,
    kernelTitle: JS_KERNEL_META.title,
    kernelFamily: JS_KERNEL_META.family,
    editorLanguage: JS_KERNEL_META.editorLanguage
  };
}

module.exports = {
  ...JS_KERNEL_META,
  getCategories() {
    return taskEngine.CATEGORY_META;
  },
  getDifficulties() {
    return taskEngine.DIFFICULTIES;
  },
  async generateTask(options = {}) {
    return wrapTask(
      await taskEngine.generateTask({
        ...options,
        kernelId: JS_KERNEL_META.id
      })
    );
  },
  runTaskTests(task, userCode) {
    return taskEngine.runTaskTests(task, userCode);
  },
  getProgressSummary(progress = {}) {
    return taskEngine.getProgressSummary(progress);
  },
  buildAchievements(progress = {}) {
    return taskEngine.buildAchievements(progress);
  },
  createCustomTaskTemplate() {
    return {
      ...taskEngine.createCustomTaskTemplate(),
      kernelId: JS_KERNEL_META.id,
      kernelTitle: JS_KERNEL_META.title,
      editorLanguage: JS_KERNEL_META.editorLanguage
    };
  },
  normalizeCustomTask(task) {
    const normalized = taskEngine.normalizeCustomTask(task);
    return normalized
      ? {
          ...normalized,
          kernelId: normalized.kernelId || JS_KERNEL_META.id,
          kernelTitle: JS_KERNEL_META.title,
          editorLanguage: JS_KERNEL_META.editorLanguage
        }
      : null;
  }
};
