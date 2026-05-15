const { contextBridge, ipcRenderer, shell } = require('electron');
const kernelManager = require('./src/execution');
const reviewPlanner = require('./src/core/reviewPlanner');

const TRUSTED_EXTERNAL_HOSTS = new Set([
  'checkout.stripe.com',
  'billing.stripe.com',
  'perfect-curiosity-production-b689.up.railway.app',
]);

function openTrustedExternal(url) {
  try {
    const parsed = new URL(String(url));
    const hostAllowed = TRUSTED_EXTERNAL_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.stripe.com');
    if (parsed.protocol !== 'https:' || !hostAllowed) {
      return Promise.resolve(false);
    }
    return shell.openExternal(parsed.toString()).then(() => true);
  } catch {
    return Promise.resolve(false);
  }
}

function cloneForIpc(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const allowedKeys = [
    'id',
    'seed',
    'source',
    'createdAt',
    'kernelId',
    'category',
    'difficulty',
    'title',
    'prompt',
    'signature',
    'starterCode',
    'solution',
    'hints',
    'explanation',
    'strategy',
    'tests',
    'xp',
    'tags',
    'meta',
    'challengeType',
    'kernelTitle',
    'kernelFamily',
    'editorLanguage',
    'answerFormat',
    'thinkingStyle',
    'variationNotes',
    'fixture'
  ];

  const payload = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      payload[key] = value[key];
    }
  }

  return typeof structuredClone === 'function' ? structuredClone(payload) : JSON.parse(JSON.stringify(payload));
}

contextBridge.exposeInMainWorld('appApi', {
  listKernels: () => kernelManager.listKernels(),
  getKernelInfo: (kernelId) => kernelManager.getKernelInfo(kernelId),
  getActiveKernelId: () => kernelManager.getActiveKernelId(),
  setKernel: (kernelId) => kernelManager.setKernel(kernelId),
  generateTask: (options) => kernelManager.generateTask(options),
  runTaskTests: (task, code) => ipcRenderer.invoke('app:runTaskTests', cloneForIpc(task), String(code ?? '')),
  getCategories: () => kernelManager.getCategories(),
  getDifficulties: () => kernelManager.getDifficulties(),
  getProgressSummary: (progress) => kernelManager.getProgressSummary(progress),
  buildAchievements: (progress) => kernelManager.buildAchievements(progress),
  createCustomTaskTemplate: () => kernelManager.createCustomTaskTemplate(),
  normalizeCustomTask: (task) => kernelManager.normalizeCustomTask(task),
  createReviewDeck: (categories) => reviewPlanner.createReviewDeck(categories),
  normalizeReviewDeck: (categories, deck) => reviewPlanner.normalizeReviewDeck(categories, deck),
  getReviewSnapshot: (categories, progress, masteryByCategory, now) => reviewPlanner.getReviewSnapshot(categories, progress, masteryByCategory, now),
  updateReviewDeck: (categories, reviewDeck, category, passed, mastery, now) => reviewPlanner.updateReviewDeck(categories, reviewDeck, category, passed, mastery, now),
  formatReviewDue: (dueAt, now) => reviewPlanner.formatReviewDue(dueAt, now),
  authRegister: (payload) => ipcRenderer.invoke('app:authRegister', structuredClone(payload ?? {})),
  authLogin: (payload) => ipcRenderer.invoke('app:authLogin', structuredClone(payload ?? {})),
  authRefresh: (payload) => ipcRenderer.invoke('app:authRefresh', structuredClone(payload ?? {})),
  authLogout: (payload) => ipcRenderer.invoke('app:authLogout', structuredClone(payload ?? {})),
  authClear: () => ipcRenderer.invoke('app:authClear'),
  openExternal: (url) => openTrustedExternal(url)
});
