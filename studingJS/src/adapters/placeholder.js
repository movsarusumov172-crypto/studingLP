const taskEngine = require('../core/taskEngine');

function createPlaceholderKernel(meta) {
  const kernelMeta = {
    id: meta.id,
    title: meta.title,
    shortTitle: meta.shortTitle || meta.title,
    family: meta.family || 'general',
    editorLanguage: meta.editorLanguage || 'plaintext',
    strategies: Array.isArray(meta.strategies) ? meta.strategies.slice() : ['simple'],
    strategyLabels: meta.strategyLabels || { simple: 'Обычная' },
    description: meta.description || 'Ядро пока не подключено.',
    status: meta.status || 'planned',
    available: false,
    accent: meta.accent || '#94a3b8'
  };

  return {
    ...kernelMeta,
    getCategories() {
      return meta.categories || {};
    },
    getDifficulties() {
      return meta.difficulties || ['easy', 'medium', 'hard', 'expert'];
    },
    generateTask() {
      throw new Error(`Ядро "${kernelMeta.title}" пока не подключено.`);
    },
    runTaskTests() {
      throw new Error(`Ядро "${kernelMeta.title}" пока не подключено.`);
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
        title: `${kernelMeta.title} задача`,
        kernelId: kernelMeta.id,
        kernelTitle: kernelMeta.title,
        editorLanguage: kernelMeta.editorLanguage
      };
    },
    normalizeCustomTask(task) {
      const normalized = taskEngine.normalizeCustomTask(task);
      return normalized
        ? {
            ...normalized,
            kernelId: normalized.kernelId || kernelMeta.id,
            kernelTitle: kernelMeta.title,
            editorLanguage: kernelMeta.editorLanguage
          }
        : null;
    }
  };
}

module.exports = {
  createPlaceholderKernel
};
