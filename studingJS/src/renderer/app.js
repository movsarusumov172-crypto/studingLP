const api = window.appApi;

if (!api) {
  throw new Error('appApi is not available. Check preload configuration.');
}

import {
  forgetDraftForTask,
  readDraftForTask,
  rememberDraftForTask
} from './taskDrafts.mjs';

import { restoreSession, login, register, logout, getStoredEmail, isLoggedIn } from './api/auth.mjs';
import { syncProgress, fetchAndMergeProgress } from './api/progress.mjs';
import { startCheckout, openBillingPortal, getBillingStatus } from './api/billing.mjs';
import { apiFetch } from './api/client.mjs';
import { syncCustomTask, deleteCustomTaskFromServer, fetchAndMergeCustomTasks } from './api/customTasks.mjs';
import { fetchLeaderboard } from './api/leaderboard.mjs';

const KERNEL_STORAGE_KEY = 'jsTrainer.kernel.v1';

function readStoredKernelId() {
  const stored = loadJson(KERNEL_STORAGE_KEY, 'js');
  return typeof stored === 'string' && stored.trim() ? stored.trim() : 'js';
}

const ACTIVE_KERNEL_ID = api.setKernel(readStoredKernelId());
const KERNELS = api.listKernels();
const ACTIVE_KERNEL_INFO = api.getKernelInfo(ACTIVE_KERNEL_ID);
const CATEGORY_META = api.getCategories();
const CATEGORY_KEYS = Object.keys(CATEGORY_META);
const DIFFICULTIES = api.getDifficulties();
const STRATEGIES = Array.isArray(ACTIVE_KERNEL_INFO.strategies) && ACTIVE_KERNEL_INFO.strategies.length > 0
  ? ACTIVE_KERNEL_INFO.strategies.slice()
  : ['simple'];
const STRATEGY_LABELS = ACTIVE_KERNEL_INFO.strategyLabels || {
  simple: 'Обычная'
};
const EDITOR_THEME = 'js-infinite-trainer-dark';

let codeEditorInstance = null;
let codeEditorFallbackValue = '';
let monacoModule = null;
let monacoLoadPromise = null;
let pythonLanguageRegistered = false;
let feedbackAudioContext = null;
let theoryModule = null;
let theoryLoadPromise = null;

const THEORY_MODULE_MAP = {
  js:     './theoryContent.js.mjs',
  python: './theoryContent.mjs',
  go:     './theoryContent.go.mjs',
  c:      './theoryContent.c.mjs',
  cpp:    './theoryContent.cpp.mjs',
  csharp: './theoryContent.csharp.mjs',
  java:   './theoryContent.java.mjs'
};

const THEORY_DEFAULT_TOPIC_ID = 'variables';

const monacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url), { type: 'module' });
    }
    return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' });
  }
};

window.MonacoEnvironment = monacoEnvironment;
self.MonacoEnvironment = monacoEnvironment;

const STORAGE_BASE_KEYS = {
  progress: 'jsTrainer.progress.v1',
  settings: 'jsTrainer.settings.v1',
  customTasks: 'jsTrainer.customTasks.v1',
  drafts: 'jsTrainer.drafts.v1'
};

const ONBOARDING_STORAGE_KEY = 'jsTrainer.onboarding.v1';

function scopedStorageKey(baseKey) {
  return `${baseKey}.${ACTIVE_KERNEL_ID}`;
}

function getEditorLanguageId(task = state.currentTask) {
  return (task && task.editorLanguage) || ACTIVE_KERNEL_INFO.editorLanguage || 'plaintext';
}

function registerPythonLanguage(monaco) {
  if (pythonLanguageRegistered) {
    return;
  }

  pythonLanguageRegistered = true;
  monaco.languages.register({ id: 'python' });
  monaco.languages.setLanguageConfiguration('python', {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  });
  monaco.languages.setMonarchTokensProvider('python', {
    defaultToken: '',
    tokenPostfix: '.python',
    keywords: [
      'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
      'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
      'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
      'try', 'while', 'with', 'yield', 'match', 'case'
    ],
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[A-Z][\w$]*/, 'type.identifier'],
        { include: '@whitespace' },
        [/\d+(_\d+)*/, 'number'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string_double' }],
        [/'/, { token: 'string.quote', bracket: '@open', next: '@string_single' }],
        [/[{}()[\]]/, '@brackets'],
        [/[;,.]/, 'delimiter'],
        [/[+\-*/%=&|<>!^~:?]+/, 'operator']
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/#.*$/, 'comment']
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ]
    }
  });
}

function syncEditorLanguage(languageId = getEditorLanguageId()) {
  if (!codeEditorInstance || !monacoModule) {
    return;
  }

  const nextLanguage = languageId || 'plaintext';
  const model = codeEditorInstance.getModel();
  if (model && model.getLanguageId() !== nextLanguage) {
    monacoModule.editor.setModelLanguage(model, nextLanguage);
  }
}

function createEmptyReviewDeck(categories = CATEGORY_KEYS) {
  return categories.reduce((acc, category) => {
    acc[category] = {
      dueAt: null,
      pressure: 0,
      lastAttemptAt: null,
      lastReviewedAt: null,
      lastResult: null
    };
    return acc;
  }, {});
}

const DEFAULT_SETTINGS = {
  selectedCategories: CATEGORY_KEYS.slice(),
  selectedDifficulties: DIFFICULTIES.slice(),
  randomMode: true,
  infiniteMode: false,
  autoHint: false,
  focusCategory: CATEGORY_KEYS[0],
  focusDifficulty: 'medium'
};

const DEFAULT_PROGRESS = {
  xp: 0,
  solved: 0,
  attempted: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  solvedByCategory: CATEGORY_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {}),
  solvedByDifficulty: DIFFICULTIES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {}),
  customTasksCreated: 0,
  dailySolved: 0,
  bossCleared: 0,
  fastestSolveMs: 0,
  totalSolveTimeMs: 0,
  reviewDeck: createEmptyReviewDeck()
};

const state = {
  settings: loadSettings(),
  progress: loadProgress(),
  customTasks: loadCustomTasks(),
  drafts: loadDrafts(),
  onboarding: loadOnboarding(),
  currentTask: null,
  currentReport: null,
  currentHintIndex: 0,
  currentMode: 'practice',
  solutionVisible: false,
  currentTaskSolved: false,
  failuresOnCurrentTask: 0,
  currentTaskAwarded: false,
  customEditingId: null,
  runCounter: 0,
  infiniteTimer: null,
  feedbackToastTimer: null,
  feedbackFxTimer: null,
  streakToastTimer: null,
  streakFxTimer: null,
  generating: false,
  taskStartedAt: null,
  diagnosticGoal: null,
  diagnosticActive: false,
  session: {
    active:    false,
    plan:      [],    // [{label, icon, tip, categories, difficulties, mode}]
    index:     0,     // current step
    results:   [],    // [{label, icon, solved, skipped, timeMs, category}]
    startedAt: null,
  },
  onboardingActive: false,
  profileExpanded: false,
  skillsExpanded: false,
  theoryOpen: false,
  theoryTopicId: THEORY_DEFAULT_TOPIC_ID,
  practiceFocusTopicId: null,
  practiceFocusTitle: null,
  practiceFocusCategory: null
};

const els = {
  profilePanel: document.getElementById('profilePanel'),
  profileFront: document.querySelector('#profilePanel .profile-front'),
  profileProgress: document.querySelector('#profilePanel .profile-progress'),
  profileToggle: document.getElementById('profileToggle'),
  profileToggleHint: document.getElementById('profileToggleHint'),
  profileBody: document.getElementById('profileBody'),
  profileName: document.getElementById('profileName'),
  profileSubtitle: document.getElementById('profileSubtitle'),
  kernelSelect: document.getElementById('kernelSelect'),
  kernelStatus: document.getElementById('kernelStatus'),
  skillsPanel: document.getElementById('skillsPanel'),
  skillsToggle: document.getElementById('skillsToggle'),
  skillsPanelTitle: document.getElementById('skillsPanelTitle'),
  skillsPanelSummary: document.getElementById('skillsPanelSummary'),
  skillsBody: document.getElementById('skillsBody'),
  categoryFilters: document.getElementById('categoryFilters'),
  difficultyFilters: document.getElementById('difficultyFilters'),
  focusCategorySelect: document.getElementById('focusCategorySelect'),
  focusDifficultySelect: document.getElementById('focusDifficultySelect'),
  randomModeCheckbox: document.getElementById('randomModeCheckbox'),
  infiniteModeCheckbox: document.getElementById('infiniteModeCheckbox'),
  autoHintCheckbox: document.getElementById('autoHintCheckbox'),
  generateTaskBtn: document.getElementById('generateTaskBtn'),
  reviewChallengeBtn: document.getElementById('reviewChallengeBtn'),
  dailyChallengeBtn: document.getElementById('dailyChallengeBtn'),
  bossChallengeBtn: document.getElementById('bossChallengeBtn'),
  nextTaskBtn: document.getElementById('nextTaskBtn'),
  runTestsBtn: document.getElementById('runTestsBtn'),
  resetCodeBtn: document.getElementById('resetCodeBtn'),
  showHintBtn: document.getElementById('showHintBtn'),
  showAnswerBtn: document.getElementById('showAnswerBtn'),
  openTheoryBtn: document.getElementById('openTheoryBtn'),
  copyStarterBtn: document.getElementById('copyStarterBtn'),
  taskCategoryBadge: document.getElementById('taskCategoryBadge'),
  taskDifficultyBadge: document.getElementById('taskDifficultyBadge'),
  taskXpBadge: document.getElementById('taskXpBadge'),
  taskTrustBadge: document.getElementById('taskTrustBadge'),
  taskModeBadge: document.getElementById('taskModeBadge'),
  taskTitle: document.getElementById('taskTitle'),
  taskPrompt: document.getElementById('taskPrompt'),
  taskSignature: document.getElementById('taskSignature'),
  runStatus: document.getElementById('runStatus'),
  learningFeedback: document.getElementById('learningFeedback'),
  hintCounter: document.getElementById('hintCounter'),
  levelLabel: document.getElementById('levelLabel'),
  levelBadge: document.getElementById('levelBadge'),
  xpSummary: document.getElementById('xpSummary'),
  xpBar: document.getElementById('xpBar'),
  statSolved: document.getElementById('statSolved'),
  statAccuracy: document.getElementById('statAccuracy'),
  statStreak: document.getElementById('statStreak'),
  statAttempts: document.getElementById('statAttempts'),
  statFastest: document.getElementById('statFastest'),
  statAvg: document.getElementById('statAvg'),
  exportProgressBtn: document.getElementById('exportProgressBtn'),
  importProgressBtn: document.getElementById('importProgressBtn'),
  importProgressInput: document.getElementById('importProgressInput'),
  shareSeedBtn:            document.getElementById('shareSeedBtn'),
  taskSkillBadge:          document.getElementById('taskSkillBadge'),
  sessionBar:              document.getElementById('sessionBar'),
  sessionLabel:            document.getElementById('sessionLabel'),
  sessionCounter:          document.getElementById('sessionCounter'),
  sessionDots:             document.getElementById('sessionDots'),
  sessionTip:              document.getElementById('sessionTip'),
  sessionSummaryOverlay:   document.getElementById('sessionSummaryOverlay'),
  sessionSummaryTitle:     document.getElementById('sessionSummaryTitle'),
  sessionSummaryStats:     document.getElementById('sessionSummaryStats'),
  sessionSummaryList:      document.getElementById('sessionSummaryList'),
  sessionSummaryNext:      document.getElementById('sessionSummaryNext'),
  sessionSummaryCloseBtn:  document.getElementById('sessionSummaryCloseBtn'),
  sessionSummaryDoneBtn:   document.getElementById('sessionSummaryDoneBtn'),
  authOverlay:    document.getElementById('authOverlay'),
  authOpenBtn:    document.getElementById('authOpenBtn'),
  authUserBar:    document.getElementById('authUserBar'),
  authSyncDot:    document.getElementById('authSyncDot'),
  authTabLogin:   document.getElementById('authTabLogin'),
  authTabRegister:document.getElementById('authTabRegister'),
  authForm:       document.getElementById('authForm'),
  authEmail:      document.getElementById('authEmail'),
  authPassword:   document.getElementById('authPassword'),
  authSubmitBtn:  document.getElementById('authSubmitBtn'),
  authError:      document.getElementById('authError'),
  authSkipBtn:         document.getElementById('authSkipBtn'),
  accountOverlay:      document.getElementById('accountOverlay'),
  accountOpenBtn:      document.getElementById('accountOpenBtn'),
  accountCloseBtn:     document.getElementById('accountCloseBtn'),
  accountEmail:        document.getElementById('accountEmail'),
  accountAvatar:       document.getElementById('accountAvatar'),
  accountPlanBadge:    document.getElementById('accountPlanBadge'),
  accountSyncStatus:   document.getElementById('accountSyncStatus'),
  accountSubRow:       document.getElementById('accountSubRow'),
  accountSubEnd:       document.getElementById('accountSubEnd'),
  accountRefreshPlanBtn: document.getElementById('accountRefreshPlanBtn'),
  accountUpgradeBtn:   document.getElementById('accountUpgradeBtn'),
  accountPortalBtn:    document.getElementById('accountPortalBtn'),
  accountLeaderboardBtn: document.getElementById('accountLeaderboardBtn'),
  accountLogoutBtn:    document.getElementById('accountLogoutBtn'),
  upgradeOverlay:      document.getElementById('upgradeOverlay'),
  upgradeOpenBtn:      document.getElementById('upgradeOpenBtn'),
  upgradeCloseBtn:     document.getElementById('upgradeCloseBtn'),
  upgradeCheckoutBtn:  document.getElementById('upgradeCheckoutBtn'),
  upgradePortalBtn:    document.getElementById('upgradePortalBtn'),
  upgradeError:        document.getElementById('upgradeError'),
  leaderboardOverlay:  document.getElementById('leaderboardOverlay'),
  leaderboardOpenBtn:  document.getElementById('leaderboardOpenBtn'),
  leaderboardCloseBtn: document.getElementById('leaderboardCloseBtn'),
  leaderboardTitle:    document.getElementById('leaderboardTitle'),
  leaderboardSubtitle: document.getElementById('leaderboardSubtitle'),
  leaderboardList:     document.getElementById('leaderboardList'),
  achievementsList: document.getElementById('achievementsList'),
  skillGraphSummary: document.getElementById('skillGraphSummary'),
  skillStrongest: document.getElementById('skillStrongest'),
  skillStrongestMeta: document.getElementById('skillStrongestMeta'),
  skillWeakest: document.getElementById('skillWeakest'),
  skillWeakestMeta: document.getElementById('skillWeakestMeta'),
  skillNext: document.getElementById('skillNext'),
  skillNextMeta: document.getElementById('skillNextMeta'),
  skillGraphList: document.getElementById('skillGraphList'),
  customTaskForm: document.getElementById('customTaskForm'),
  customTitle: document.getElementById('customTitle'),
  customCategory: document.getElementById('customCategory'),
  customDifficulty: document.getElementById('customDifficulty'),
  customStrategy: document.getElementById('customStrategy'),
  customSignature: document.getElementById('customSignature'),
  customPrompt: document.getElementById('customPrompt'),
  customStarter: document.getElementById('customStarter'),
  customSolution: document.getElementById('customSolution'),
  customTests: document.getElementById('customTests'),
  customHints: document.getElementById('customHints'),
  customExplanation: document.getElementById('customExplanation'),
  fillTemplateBtn: document.getElementById('fillTemplateBtn'),
  saveCustomTaskBtn: document.getElementById('saveCustomTaskBtn'),
  exportCustomTasksBtn: document.getElementById('exportCustomTasksBtn'),
  importCustomTasksBtn: document.getElementById('importCustomTasksBtn'),
  customTasksImportInput: document.getElementById('customTasksImportInput'),
  customTaskList: document.getElementById('customTaskList'),
  codeEditor: document.getElementById('codeEditor'),
  testResults: document.getElementById('testResults'),
  hintPanel: document.getElementById('hintPanel'),
  solutionPanel: document.getElementById('solutionPanel'),
  consoleOutput: document.getElementById('consoleOutput'),
  feedbackLayer: document.getElementById('feedbackLayer'),
  streakLayer: document.getElementById('streakLayer'),
  theoryDrawer: document.getElementById('theoryDrawer'),
  theoryBackdrop: document.getElementById('theoryBackdrop'),
  theoryPracticeBtn: document.getElementById('theoryPracticeBtn'),
  theoryCloseBtn: document.getElementById('theoryCloseBtn'),
  theoryNav: document.getElementById('theoryNav'),
  theoryContent: document.getElementById('theoryContent'),
  onboardingOverlay:      document.getElementById('onboardingOverlay'),
  onboardingTrack:        document.getElementById('onboardingTrack'),
  onboardingScreenGoal:   document.getElementById('onboardingScreenGoal'),
  onboardingScreenDiag:   document.getElementById('onboardingScreenDiag'),
  startOnboardingBtn:     document.getElementById('startOnboardingBtn'),
  skipOnboardingBtn:      document.getElementById('skipOnboardingBtn'),
  startDiagnosticBtn:     document.getElementById('startDiagnosticBtn'),
  skipDiagnosticBtn:      document.getElementById('skipDiagnosticBtn'),
  returnOverlay:          document.getElementById('returnOverlay'),
  returnTitle:            document.getElementById('returnTitle'),
  returnSubtitle:         document.getElementById('returnSubtitle'),
  returnStats:            document.getElementById('returnStats'),
  returnStartBtn:         document.getElementById('returnStartBtn'),
  returnSkipBtn:          document.getElementById('returnSkipBtn'),
  progressReportOverlay:  document.getElementById('progressReportOverlay'),
  progressReportOpenBtn:  document.getElementById('progressReportOpenBtn'),
  progressReportCloseBtn: document.getElementById('progressReportCloseBtn'),
  progressReportBody:     document.getElementById('progressReportBody'),
  progressReportTitle:    document.getElementById('progressReportTitle'),
  progressReportExportBtn:document.getElementById('progressReportExportBtn'),
  aiHintPanel:            document.getElementById('aiHintPanel'),
  aiHintBtn:              document.getElementById('aiHintBtn'),
  aiHintResult:           document.getElementById('aiHintResult'),
  aiBreakdownPanel:       document.getElementById('aiBreakdownPanel'),
  aiBreakdownBody:        document.getElementById('aiBreakdownBody'),
  aiBreakdownCloseBtn:    document.getElementById('aiBreakdownCloseBtn'),
  challengesOverlay:      document.getElementById('challengesOverlay'),
  challengesOpenBtn:      document.getElementById('challengesOpenBtn'),
  challengesCloseBtn:     document.getElementById('challengesCloseBtn'),
  activeChallengeBar:     document.getElementById('activeChallengeBar'),
  challengesList:         document.getElementById('challengesList'),
  goalsOverlay:           document.getElementById('goalsOverlay'),
  goalsOpenBtn:           document.getElementById('goalsOpenBtn'),
  goalsCloseBtn:          document.getElementById('goalsCloseBtn'),
  goalsTitle:             document.getElementById('goalsTitle'),
  goalsList:              document.getElementById('goalsList'),
  activeGoalStatus:       document.getElementById('activeGoalStatus'),
  goalsClearBtn:          document.getElementById('goalsClearBtn')
};

function applyText(node, text) {
  if (node) {
    node.textContent = text;
  }
}

function applyProductPositioning() {
  document.title = 'JS Infinite Trainer | Adaptive Coding Gym';
  applyText(els.profileName, 'Infinite Trainer');
  applyText(els.profileSubtitle, 'Адаптивная практика программирования для Windows');
  applyText(els.profileToggleHint, 'Нажми, чтобы открыть информацию');
  applyText(els.skillsPanelTitle, 'Навыки');
  applyText(els.skillsPanelSummary, 'Выбери одну или несколько');

  applyText(els.kernelStatus, 'JavaScript активно');
  applyText(els.generateTaskBtn, 'Начать тренировку');
  applyText(els.reviewChallengeBtn, 'Слабое место');
  applyText(els.dailyChallengeBtn, 'Ежедневная');
  applyText(els.bossChallengeBtn, 'Испытание');
  applyText(els.taskCategoryBadge, 'Категория');
  applyText(els.taskDifficultyBadge, 'Сложность');
  applyText(els.taskModeBadge, 'Режим');
  applyText(els.openTheoryBtn, `Теория ${ACTIVE_KERNEL_INFO.title || ACTIVE_KERNEL_ID}`);
  applyText(els.taskTitle, 'Генерация задачи...');
  applyText(els.taskPrompt, 'Здесь появится условие задачи.');
  applyText(document.querySelector('.signature-row span'), 'Сигнатура:');

  const customLabels = document.querySelectorAll('.custom-form label > span');
  applyText(customLabels[0], 'Название');
  applyText(customLabels[1], 'Категория');
  applyText(customLabels[2], 'Сложность');
  applyText(customLabels[3], 'Стратегия');
  applyText(customLabels[4], 'Сигнатура');
  applyText(customLabels[5], 'Условие');
  applyText(customLabels[6], 'Код-заготовка');
  applyText(customLabels[7], 'Правильный ответ');
  applyText(customLabels[8], 'Тесты JSON');
  applyText(customLabels[9], 'Подсказки');
  applyText(customLabels[10], 'Разбор');

  const customButtons = document.querySelectorAll('.custom-form .button-row .button');
  applyText(customButtons[0], 'Шаблон');
  applyText(customButtons[1], 'Сохранить');
  applyText(customButtons[2], 'Экспорт JSON');
  applyText(customButtons[3], 'Импорт JSON');

  const sidebarPanels = document.querySelectorAll('.sidebar > .panel, .sidebar > details.panel');
  const kernelPanel = sidebarPanels[1];
  const skillsPanel = sidebarPanels[2];
  const modesPanel = sidebarPanels[3];
  const achievementsPanel = sidebarPanels[4];
  const customPanel = sidebarPanels[5];
  applyText(kernelPanel?.querySelector('.panel-heading h2'), 'Ядра');
  applyText(kernelPanel?.querySelector('.panel-heading .muted'), 'Активное ядро');
  applyText(skillsPanel?.querySelector('.panel-heading-button h2'), 'Навыки');
  applyText(skillsPanel?.querySelector('.panel-heading-button .muted'), 'Выбери одну или несколько');
  applyText(modesPanel?.querySelector('.panel-heading h2'), 'Режимы');
  applyText(modesPanel?.querySelector('.panel-heading .muted'), 'Мощные сценарии обучения');
  applyText(achievementsPanel?.querySelector('summary h2'), 'Достижения');
  applyText(achievementsPanel?.querySelector('summary .muted'), 'Открой все');
  applyText(customPanel?.querySelector('summary h2'), 'Своя задача');
  applyText(customPanel?.querySelector('summary .muted'), 'Добавь собственный тренажёрный кейс');

  const outputPanels = document.querySelectorAll('.output-panel');
  applyText(outputPanels[0]?.querySelector('.panel-heading h2'), 'Результаты');
  applyText(outputPanels[0]?.querySelector('.panel-heading .muted'), 'Проверка решения');
  applyText(outputPanels[1]?.querySelector('.panel-heading h2'), 'Подсказки');
  applyText(outputPanels[1]?.querySelector('.panel-heading .muted'), 'Учись постепенно');
  applyText(outputPanels[2]?.querySelector('.panel-heading h2'), 'Логи');
  applyText(outputPanels[2]?.querySelector('.panel-heading .muted'), 'console.* из песочницы');

  applyText(document.querySelector('.editor-card .panel-heading h2'), 'Мини-IDE');
  applyText(document.querySelector('.editor-card .panel-heading .muted'), 'Ctrl+Enter — запуск');
  applyText(document.querySelector('.hero h2'), 'Практика JavaScript без конца');
}

function compactProfileHeader() {
  if (els.profilePanel && els.profileProgress && els.profileToggle && els.profilePanel.contains(els.profileProgress)) {
    els.profilePanel.insertBefore(els.profileProgress, els.profileToggle);
  }

  if (els.profileBody && els.profileFront && els.profileBody.firstElementChild !== els.profileFront) {
    els.profileBody.insertBefore(els.profileFront, els.profileBody.firstElementChild || null);
  }
}

function ensureTheoryShell() {
  if (!document.getElementById('openTheoryBtn')) {
    const heroActions = document.querySelector('.hero-actions');
    const nextTaskBtn = document.getElementById('nextTaskBtn');
    if (heroActions) {
      const theoryButton = document.createElement('button');
      theoryButton.id = 'openTheoryBtn';
      theoryButton.type = 'button';
      theoryButton.className = 'button button-secondary button-quiet';
      theoryButton.textContent = `Теория ${ACTIVE_KERNEL_INFO.title || ACTIVE_KERNEL_ID}`;
      heroActions.insertBefore(theoryButton, nextTaskBtn || null);
    }
  }

  if (!document.getElementById('theoryDrawer')) {
    const theoryShell = document.createElement('div');
    theoryShell.id = 'theoryDrawer';
    theoryShell.className = 'theory-drawer hidden';
    theoryShell.setAttribute('aria-hidden', 'true');
    theoryShell.innerHTML = `
      <div id="theoryBackdrop" class="theory-drawer-backdrop" aria-hidden="true"></div>
      <aside
        class="theory-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theoryTitle"
        aria-describedby="theorySubtitle"
      >
        <header class="theory-drawer-header">
          <div>
            <div class="eyebrow">${ACTIVE_KERNEL_INFO.title || ACTIVE_KERNEL_ID} theory</div>
            <h2 id="theoryTitle">Теория ${ACTIVE_KERNEL_INFO.title || ACTIVE_KERNEL_ID}</h2>
            <p id="theorySubtitle">Каждый блок готов к немедленной практике.</p>
          </div>
          <div class="theory-drawer-actions">
            <button id="theoryPracticeBtn" class="button button-primary" type="button">Начать практику</button>
            <button id="theoryCloseBtn" class="button button-secondary" type="button">Закрыть</button>
          </div>
        </header>
        <div class="theory-drawer-body">
          <nav id="theoryNav" class="theory-nav" aria-label="Темы теории"></nav>
          <div id="theoryContent" class="theory-content"></div>
        </div>
      </aside>
    `;
    document.body.appendChild(theoryShell);
  }

  els.openTheoryBtn = document.getElementById('openTheoryBtn');
  els.theoryDrawer = document.getElementById('theoryDrawer');
  els.theoryBackdrop = document.getElementById('theoryBackdrop');
  els.theoryPracticeBtn = document.getElementById('theoryPracticeBtn');
  els.theoryCloseBtn = document.getElementById('theoryCloseBtn');
  els.theoryNav = document.getElementById('theoryNav');
  els.theoryContent = document.getElementById('theoryContent');
}

function closeOverflowMenus(except = null) {
  document.querySelectorAll('.overflow-menu[open]').forEach((menu) => {
    if (menu !== except) {
      menu.removeAttribute('open');
    }
  });
}

function bindOverflowMenus() {
  const menus = document.querySelectorAll('.overflow-menu');
  if (!menus.length) return;

  menus.forEach((menu) => {
    menu.addEventListener('toggle', () => {
      if (menu.open) closeOverflowMenus(menu);
    });

    menu.querySelectorAll('.overflow-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        window.setTimeout(() => menu.removeAttribute('open'), 0);
      });
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.overflow-menu')) {
      closeOverflowMenus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverflowMenus();
    }
  });
}

async function loadTheoryModule() {
  if (theoryModule) {
    return theoryModule;
  }

  const modulePath = THEORY_MODULE_MAP[ACTIVE_KERNEL_ID];
  if (!modulePath) {
    return null;
  }

  if (!theoryLoadPromise) {
    theoryLoadPromise = import(modulePath).then((module) => {
      theoryModule = module;
      return module;
    }).catch((error) => {
      theoryLoadPromise = null;
      theoryModule = null;
      throw error;
    });
  }

  return theoryLoadPromise;
}

async function renderTheoryDrawer(topicId = state.theoryTopicId) {
  if (!state.theoryOpen || !els.theoryNav || !els.theoryContent) {
    return;
  }

  els.theoryContent.innerHTML = '<div class="theory-loading">Загружаю теорию...</div>';

  try {
    const theory = await loadTheoryModule();

    if (!theory) {
      els.theoryContent.innerHTML = '<div class="theory-empty">Теория для этого языка ещё не добавлена.</div>';
      return;
    }

    const topics = theory.THEORY_TOPICS || theory.PYTHON_THEORY_TOPICS || [];
    const nextTopic = theory.getTheoryTopicById(topicId) || topics[0];
    const practiceRoute = theory.getTheoryPracticeRoute(nextTopic?.id || topicId);
    state.theoryTopicId = nextTopic ? nextTopic.id : THEORY_DEFAULT_TOPIC_ID;

    if (els.theoryNav) {
      els.theoryNav.innerHTML = theory.buildTheoryTopicList(state.theoryTopicId);
    }
    if (els.theoryContent) {
      els.theoryContent.innerHTML = theory.buildTheoryTopicHtml(nextTopic);
    }
    if (els.theoryPracticeBtn) {
      const practiceTitle = practiceRoute?.topicTitle || nextTopic?.title || 'теория';
      els.theoryPracticeBtn.textContent = `Начать практику: ${practiceTitle}`;
    }
  } catch (error) {
    els.theoryContent.innerHTML = `
      <div class="theory-empty">
        Не удалось загрузить теорию.
        <div class="muted" style="margin-top: 8px;">${escapeHtml(error.message || String(error))}</div>
      </div>
    `;
  }
}

function setPracticeFocus(topicId, practiceCategory, topicTitle) {
  state.practiceFocusTopicId = topicId || null;
  state.practiceFocusCategory = practiceCategory || null;
  state.practiceFocusTitle = topicTitle || null;
}

function clearPracticeFocus() {
  state.practiceFocusTopicId = null;
  state.practiceFocusCategory = null;
  state.practiceFocusTitle = null;
}

function syncPracticeFocusWithSelection() {
  if (!state.practiceFocusCategory) {
    return;
  }

  const selectedCategories = Array.isArray(state.settings.selectedCategories) ? state.settings.selectedCategories : [];
  const selectionMatches = selectedCategories.length === 1 && selectedCategories[0] === state.practiceFocusCategory;
  if (!selectionMatches) {
    clearPracticeFocus();
  }
}

function getPracticeFocusLabel() {
  if (!state.practiceFocusCategory || !state.practiceFocusTitle) {
    return '';
  }

  const selectedCategories = Array.isArray(state.settings.selectedCategories) ? state.settings.selectedCategories : [];
  if (selectedCategories.length !== 1 || selectedCategories[0] !== state.practiceFocusCategory) {
    return '';
  }

  return state.practiceFocusTitle;
}

async function showTheoryDrawer(topicId = THEORY_DEFAULT_TOPIC_ID) {
  storeCurrentDraft();
  if (state.infiniteTimer) {
    clearTimeout(state.infiniteTimer);
    state.infiniteTimer = null;
  }

  state.theoryOpen = true;
  state.theoryTopicId = topicId || THEORY_DEFAULT_TOPIC_ID;
  document.body.classList.add('theory-open');

  if (els.theoryDrawer) {
    els.theoryDrawer.classList.remove('hidden');
    els.theoryDrawer.setAttribute('aria-hidden', 'false');
  }

  await renderTheoryDrawer(state.theoryTopicId);
  els.theoryPracticeBtn?.focus();
}

function hideTheoryDrawer(options = {}) {
  const { focusPractice = true, skipAutoNext = false } = options;
  state.theoryOpen = false;
  document.body.classList.remove('theory-open');

  if (els.theoryDrawer) {
    els.theoryDrawer.classList.add('hidden');
    els.theoryDrawer.setAttribute('aria-hidden', 'true');
  }

  if (focusPractice) {
    focusEditor();
  }

  if (!skipAutoNext && state.currentTaskSolved && state.settings.infiniteMode) {
    scheduleNextTask(state.currentMode || 'practice');
  }
}

async function returnToPracticeFromTheory() {
  const theory = await loadTheoryModule();
  if (!theory) {
    hideTheoryDrawer({ focusPractice: true, skipAutoNext: true });
    return;
  }
  const topic = theory.getTheoryTopicById(state.theoryTopicId || THEORY_DEFAULT_TOPIC_ID);
  const route = theory.getTheoryPracticeRoute(topic?.id || THEORY_DEFAULT_TOPIC_ID);

  storeCurrentDraft();
  if (route && CATEGORY_KEYS.includes(route.practiceCategory)) {
    setPracticeFocus(route.topicId, route.practiceCategory, route.topicTitle);
    state.settings.selectedCategories = [route.practiceCategory];
    state.settings.focusCategory = route.practiceCategory;
    saveSettings();
    applySettingsToControls();
    renderSkillGraphView();
    updateSkillsPanelSummary();
  } else {
    clearPracticeFocus();
  }

  hideTheoryDrawer({ focusPractice: true, skipAutoNext: true });
  generateTask('practice');
}

function getEditorValue() {
  return codeEditorInstance ? codeEditorInstance.getValue() : codeEditorFallbackValue;
}

function setEditorValue(value) {
  const nextValue = String(value ?? '');
  codeEditorFallbackValue = nextValue;
  if (codeEditorInstance && codeEditorInstance.getValue() !== nextValue) {
    codeEditorInstance.setValue(nextValue);
  }
}

function focusEditor() {
  if (codeEditorInstance) {
    codeEditorInstance.focus();
  }
}

function bindEditorBridge() {
  if (!els.codeEditor || Object.getOwnPropertyDescriptor(els.codeEditor, 'value')) {
    return;
  }

  Object.defineProperty(els.codeEditor, 'value', {
    configurable: true,
    enumerable: true,
    get() {
      return getEditorValue();
    },
    set(value) {
      setEditorValue(value);
    }
  });
}

async function loadMonaco() {
  if (monacoModule) {
    return monacoModule;
  }
  if (!monacoLoadPromise) {
    monacoLoadPromise = import('./monaco.bundle.js').then((module) => {
      monacoModule = module;
      if (!monacoModule || !monacoModule.editor || !monacoModule.languages) {
        throw new Error('Monaco editor did not initialize.');
      }
      return monacoModule;
    });
  }
  return monacoLoadPromise;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadScopedJson(baseKey, fallback) {
  const scopedKey = scopedStorageKey(baseKey);

  try {
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw !== null) {
      return JSON.parse(scopedRaw);
    }

    const legacyRaw = localStorage.getItem(baseKey);
    if (legacyRaw !== null) {
      const legacyValue = JSON.parse(legacyRaw);
      saveJson(scopedKey, legacyValue);
      return legacyValue;
    }
  } catch (error) {
    return fallback;
  }

  return fallback;
}

function loadSettings() {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...loadScopedJson(STORAGE_BASE_KEYS.settings, {})
  };
  settings.selectedCategories = Array.isArray(settings.selectedCategories)
    ? settings.selectedCategories.filter((item) => CATEGORY_KEYS.includes(item))
    : CATEGORY_KEYS.slice();
  if (settings.selectedCategories.length === 0) {
    settings.selectedCategories = CATEGORY_KEYS.slice();
  }
  settings.selectedDifficulties = Array.isArray(settings.selectedDifficulties)
    ? settings.selectedDifficulties.filter((item) => DIFFICULTIES.includes(item))
    : DIFFICULTIES.slice();
  if (settings.selectedDifficulties.length === 0) {
    settings.selectedDifficulties = DIFFICULTIES.slice();
  }
  settings.focusCategory = CATEGORY_KEYS.includes(settings.focusCategory) ? settings.focusCategory : CATEGORY_KEYS[0];
  settings.focusDifficulty = DIFFICULTIES.includes(settings.focusDifficulty) ? settings.focusDifficulty : 'medium';
  settings.randomMode = settings.randomMode !== false;
  settings.infiniteMode = Boolean(settings.infiniteMode);
  settings.autoHint = Boolean(settings.autoHint);
  return settings;
}

function loadProgress() {
  const raw = loadScopedJson(STORAGE_BASE_KEYS.progress, {});
  const reviewDeck = typeof api.normalizeReviewDeck === 'function'
    ? api.normalizeReviewDeck(CATEGORY_KEYS, raw.reviewDeck || {})
    : createEmptyReviewDeck();
  return {
    ...DEFAULT_PROGRESS,
    ...raw,
    solvedByCategory: { ...DEFAULT_PROGRESS.solvedByCategory, ...(raw.solvedByCategory || {}) },
    solvedByDifficulty: { ...DEFAULT_PROGRESS.solvedByDifficulty, ...(raw.solvedByDifficulty || {}) },
    reviewDeck
  };
}

function loadCustomTasks() {
  const items = loadScopedJson(STORAGE_BASE_KEYS.customTasks, []);
  return Array.isArray(items) ? items : [];
}

function loadDrafts() {
  const drafts = loadScopedJson(STORAGE_BASE_KEYS.drafts, {});
  return drafts && typeof drafts === 'object' ? drafts : {};
}

function loadOnboarding() {
  const stored = loadJson(ONBOARDING_STORAGE_KEY, {});
  return {
    completed: Boolean(stored && stored.completed),
    completedAt: stored && stored.completedAt ? stored.completedAt : null
  };
}

function saveSettings() {
  saveJson(scopedStorageKey(STORAGE_BASE_KEYS.settings), state.settings);
}

function saveProgress() {
  saveJson(scopedStorageKey(STORAGE_BASE_KEYS.progress), state.progress);
}

function saveCustomTasks() {
  saveJson(scopedStorageKey(STORAGE_BASE_KEYS.customTasks), state.customTasks);
}

function saveDrafts() {
  saveJson(scopedStorageKey(STORAGE_BASE_KEYS.drafts), state.drafts);
}

function saveOnboarding() {
  saveJson(ONBOARDING_STORAGE_KEY, state.onboarding);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatValue(value) {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectFeedbackAdvice(task, report) {
  const failedTest = Array.isArray(report?.tests)
    ? report.tests.find((test) => !test.passed)
    : null;
  const errorText = String(failedTest?.error || report?.error || '').trim();
  const advice = [];
  const reasons = [];

  const pushUnique = (list, item) => {
    if (item && !list.includes(item)) {
      list.push(item);
    }
  };

  if (/timed out|timeout/i.test(errorText)) {
    pushUnique(reasons, 'Код не завершился вовремя');
    pushUnique(advice, 'Проверь бесконечные циклы, рекурсию без выхода и async-цепочки, которые не доходят до return.');
  }
  if (/not a function|is not available|callable/i.test(errorText)) {
    pushUnique(reasons, 'Неверная форма ответа');
    pushUnique(advice, 'Сверь сигнатуру: тесты могли ожидать функцию, объект с методом или конкретный return-тип.');
  }
  if (/expected .* got/i.test(errorText)) {
    pushUnique(reasons, 'Результат не совпал с ожидаемым');
    pushUnique(advice, 'Проверь точную структуру ответа: порядок элементов, вложенные поля и формат возвращаемого значения.');
  }
  if (/call count/i.test(errorText)) {
    pushUnique(reasons, 'Колбэк вызван не то число раз');
    pushUnique(advice, 'Если задача про callbacks или closures, убедись, что вызовы идут в нужном порядке и ровно нужное количество раз.');
  }
  if (/DOM|text|value|attribute|children|class/i.test(errorText)) {
    pushUnique(reasons, 'DOM-состояние не совпало');
    pushUnique(advice, 'Проверь селектор, нужный узел и то, что ты меняешь именно переданный document, а не глобальный.');
  }
  if (/undefined|null|cannot read|not defined/i.test(errorText)) {
    pushUnique(reasons, 'Есть обращение к отсутствующему значению');
    pushUnique(advice, 'Добавь проверку на пустые входные данные и осторожнее обращайся к вложенным полям.');
  }

  // ── Улучшенный разбор (2.2) ─────────────────────────────────────────────

  // Edge case: пустой массив, null, 0, отрицательные числа во входных данных
  if (failedTest?.input !== undefined) {
    const inputStr = JSON.stringify(failedTest.input);
    const hasEdge =
      /\[\]/.test(inputStr) ||
      /\bnull\b/.test(inputStr) ||
      /""|''/.test(inputStr) ||
      (Array.isArray(failedTest.input) && failedTest.input.some(
        (a) => a === null || a === undefined ||
               (Array.isArray(a) && a.length === 0) ||
               a === 0 || a === '' || (typeof a === 'number' && a < 0)
      ));
    if (hasEdge) {
      pushUnique(reasons, 'Краевой случай не обработан');
      pushUnique(advice, 'Этот тест подаёт крайние данные: пустой массив [], null, 0 или отрицательное число. Добавь проверку в начало функции — часто это одна строчка.');
    }
  }

  // Off-by-one: числа или длины массивов отличаются на 1
  if (failedTest?.expected !== undefined && failedTest?.actual !== undefined) {
    const exp = failedTest.expected;
    const act = failedTest.actual;
    if (typeof exp === 'number' && typeof act === 'number' && Math.abs(exp - act) === 1) {
      pushUnique(reasons, 'Off-by-one: результат на 1 больше или меньше');
      pushUnique(advice, 'Проверь граничные условия: < vs <=, индекс массива (начинается с 0), включается ли последний элемент.');
    }
    if (Array.isArray(exp) && Array.isArray(act) && Math.abs(exp.length - act.length) === 1) {
      pushUnique(reasons, `Лишний или пропущенный элемент (ожидалось ${exp.length}, получено ${act.length})`);
      pushUnique(advice, 'Проверь условие включения первого или последнего элемента. Часто дело в < vs <= в цикле.');
    }
  }

  // Функция ничего не вернула
  if ((failedTest?.actual === undefined || failedTest?.actual === null) &&
       failedTest?.expected !== undefined && failedTest?.expected !== null) {
    pushUnique(reasons, 'Функция не вернула значение');
    pushUnique(advice, 'Убедись что return стоит в нужном месте — не внутри if без else, не потерян в async, не забыт в конце.');
  }

  // Тип ответа не тот
  if (failedTest?.expected !== undefined && failedTest?.actual !== undefined) {
    const expType = Array.isArray(failedTest.expected) ? 'array' : typeof failedTest.expected;
    const actType = Array.isArray(failedTest.actual)   ? 'array' : typeof failedTest.actual;
    if (expType !== actType && expType !== 'undefined' && actType !== 'undefined') {
      pushUnique(reasons, `Неверный тип ответа: ожидается ${expType}, получен ${actType}`);
      pushUnique(advice, `Задача ожидает ${expType}. Проверь что функция возвращает правильный тип — не строку вместо числа, не объект вместо массива.`);
    }
  }

  switch (task?.strategy) {
    case 'closure':
      pushUnique(reasons, 'Нужно удерживать состояние между вызовами');
      pushUnique(advice, 'В closure-задачах важно, чтобы возвращаемая функция помнила значения после первого вызова.');
      break;
    case 'async':
      pushUnique(reasons, 'Асинхронность не дождалась результата');
      pushUnique(advice, 'Проверь, что async-функция возвращает Promise и что ты дожидаешься всех шагов перед итоговым return.');
      break;
    case 'dom':
      pushUnique(reasons, 'Состояние DOM не совпало');
      pushUnique(advice, 'В DOM-задачах важно обновлять правильный элемент и проверять, что событие/класс/текст реально изменились.');
      break;
    default:
      break;
  }

  switch (task?.category) {
    case 'arrays':
      pushUnique(advice, 'Проверь, не мутируешь ли исходный массив, если задача просит чистое преобразование.');
      break;
    case 'objects':
      pushUnique(advice, 'Посмотри на вложенные поля и не теряй данные при копировании или слиянии объектов.');
      break;
    case 'functions':
      pushUnique(advice, 'Сверь входные параметры и то, что функция реально возвращает.');
      break;
    case 'algorithms':
      pushUnique(advice, 'Проверь крайние случаи: пустой ввод, один элемент, повторяющиеся значения и нестандартный порядок.');
      break;
    case 'closures':
      pushUnique(advice, 'Проверь, что внутреннее состояние живёт между вызовами, а не пересоздаётся каждый раз.');
      break;
    case 'async':
      pushUnique(advice, 'Если есть Promise.all, retry или цепочка await, проверь порядок и обработку ошибок.');
      break;
    case 'dom':
      pushUnique(advice, 'Смотри на текст, классы, атрибуты и количество детей после каждого действия.');
      break;
    default:
      break;
  }

  if (Array.isArray(task?.hints) && task.hints.length > 0) {
    pushUnique(advice, `Подсказка из задачи: ${String(task.hints[0])}`);
  }

  if (typeof task?.explanation === 'string' && task.explanation.trim()) {
    pushUnique(advice, task.explanation.trim());
  }

  if (failedTest && Object.prototype.hasOwnProperty.call(failedTest, 'expected')) {
    const expected = formatValue(failedTest.expected);
    const actual = formatValue(failedTest.actual);
    if (expected !== actual) {
      pushUnique(reasons, 'Ожидание и результат разошлись');
      pushUnique(advice, `Ожидалось: ${expected}`);
      pushUnique(advice, `Получилось: ${actual}`);
    }
  }

  const nextStep = task?.strategy === 'closure'
    ? 'Сделай маленькую функцию-состояние и проверь, что она помнит предыдущий ввод.'
    : task?.strategy === 'async'
      ? 'Добавь await на все ветки, которые должны завершиться до ответа.'
      : task?.strategy === 'dom'
        ? 'Проверь обновление конкретного DOM-узла и повтори тест руками.'
        : 'Сравни ожидаемую форму ответа с тем, что ты реально возвращаешь.';

  return {
    title: reasons.length > 0 ? reasons[0] : 'Разбор ошибки',
    reasons,
    advice,
    nextStep,
    errorText,
    failedTest
  };
}

function renderLearningFeedback(report) {
  if (!els.learningFeedback) {
    return;
  }

  if (!report) {
    els.learningFeedback.innerHTML = '';
    return;
  }

  const summary = collectFeedbackAdvice(state.currentTask, report);
  const isPass = Boolean(report.passed);
  const headline = isPass ? 'Что закрепил' : summary.title;
  const reasonHtml = summary.reasons.length > 0
    ? `<div class="learning-feedback-tags">${summary.reasons.map((item) => `<span class="learning-feedback-tag">${escapeHtml(item)}</span>`).join('')}</div>`
    : '';
  const adviceHtml = summary.advice.length > 0
    ? `<ul class="learning-feedback-list">${summary.advice.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  const errorHtml = !isPass && summary.errorText
    ? `<div class="learning-feedback-error"><span class="meta">Сообщение теста</span><code>${escapeHtml(summary.errorText)}</code></div>`
    : '';
  const nextStepHtml = `<div class="learning-feedback-next"><span class="meta">Следующий шаг</span><div>${escapeHtml(summary.nextStep)}</div></div>`;
  const taskReviewHtml = state.currentTask?.explanation
    ? `<div class="learning-feedback-note"><span class="meta">Разбор решения</span><div>${escapeHtml(state.currentTask.explanation)}</div></div>`
    : '';
  const hintHtml = Array.isArray(state.currentTask?.hints) && state.currentTask.hints.length > 0
    ? `<div class="learning-feedback-note"><span class="meta">Подсказка</span><div>${escapeHtml(state.currentTask.hints[0])}</div></div>`
    : '';

  els.learningFeedback.innerHTML = `
    <div class="learning-feedback-card ${isPass ? 'pass' : 'fail'}">
      <div class="learning-feedback-header">
        <strong>${escapeHtml(headline)}</strong>
        <span class="meta">${isPass ? 'Ответ прошёл проверку' : 'Разбор ошибки'}</span>
      </div>
      ${reasonHtml}
      ${errorHtml}
      ${adviceHtml}
      ${taskReviewHtml}
      ${hintHtml}
      ${nextStepHtml}
    </div>
  `;
}

function getDifficultyTitle(difficulty) {
  return {
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
    expert: 'Эксперт'
  }[difficulty] || difficulty;
}

function getSkillMastery(count) {
  const solved = Math.max(0, Number(count) || 0);
  if (solved === 0) {
    return 0;
  }
  return Math.min(100, Math.round((solved / 12) * 100));
}

function getSkillStage(mastery, count) {
  if (count === 0) {
    return 'Нужно начать';
  }
  if (mastery < 25) {
    return 'Формируется';
  }
  if (mastery < 50) {
    return 'В работе';
  }
  if (mastery < 80) {
    return 'Уверенно';
  }
  return 'Освоено';
}

function getNextMilestone(count) {
  const next = count < 3 ? 3 : count < 6 ? 6 : count < 9 ? 9 : count < 12 ? 12 : count + 4;
  return next;
}

function getRecommendedDifficultyForSkill(mastery) {
  if (mastery < 25) {
    return 'easy';
  }
  if (mastery < 50) {
    return 'medium';
  }
  if (mastery < 80) {
    return 'hard';
  }
  return 'expert';
}

function createDefaultCustomForm() {
  return api.createCustomTaskTemplate();
}

function setRunStatus(text, tone = 'neutral') {
  els.runStatus.textContent = text;
  els.runStatus.className = `run-status ${tone}`;
}

function setGenerating(active) {
  state.generating = active;
  const btns = [
    els.generateTaskBtn,
    els.reviewChallengeBtn,
    els.dailyChallengeBtn,
    els.bossChallengeBtn,
    els.nextTaskBtn
  ];
  for (const btn of btns) {
    if (btn) {
      btn.disabled = active;
    }
  }
}

function playGenerateSound() {
  const context = primeFeedbackAudio();
  if (!context) return;
  playTone(context, { frequency: 660, duration: 0.05, type: 'sine', gain: 0.035, delay: 0 });
  playTone(context, { frequency: 880, duration: 0.08, type: 'triangle', gain: 0.025, delay: 0.04 });
}

function formatSolveTime(ms) {
  if (!ms || ms <= 0) return '—';
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
  return `${Math.floor(ms / 60000)}м ${Math.round((ms % 60000) / 1000)}с`;
}

async function shareSeed() {
  if (!state.currentTask?.seed) return;
  const seed = String(state.currentTask.seed);
  try {
    await navigator.clipboard.writeText(seed);
    showFeedbackToast({ kind: 'success', title: 'Seed скопирован', detail: seed.slice(0, 60) });
  } catch {
    setRunStatus(`Seed: ${seed}`, 'neutral');
  }
}

function exportProgress() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    kernelId: ACTIVE_KERNEL_ID,
    progress: state.progress,
    settings: state.settings,
    customTasks: state.customTasks
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `js-trainer-${ACTIVE_KERNEL_ID}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setRunStatus('Прогресс экспортирован.', 'success');
}

async function importProgressFromFile(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Файл повреждён или не является JSON.');
  }
  if (!data || typeof data !== 'object' || !data.progress) {
    throw new Error('Неверный формат — не найден блок progress.');
  }
  saveJson(scopedStorageKey(STORAGE_BASE_KEYS.progress), data.progress);
  if (data.settings) saveJson(scopedStorageKey(STORAGE_BASE_KEYS.settings), data.settings);
  if (Array.isArray(data.customTasks)) saveJson(scopedStorageKey(STORAGE_BASE_KEYS.customTasks), data.customTasks);
  window.location.reload();
}

function ensureFeedbackLayer() {
  if (els.feedbackLayer && els.feedbackLayer.isConnected) {
    return els.feedbackLayer;
  }

  let layer = document.getElementById('feedbackLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'feedbackLayer';
    layer.className = 'feedback-layer';
    layer.setAttribute('aria-live', 'polite');
    layer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(layer);
  }
  els.feedbackLayer = layer;
  return layer;
}

function primeFeedbackAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!feedbackAudioContext) {
    feedbackAudioContext = new AudioContextClass();
  }

  if (feedbackAudioContext.state === 'suspended') {
    void feedbackAudioContext.resume();
  }

  return feedbackAudioContext;
}

function playTone(context, { frequency, duration, type = 'triangle', gain = 0.06, delay = 0 }) {
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const amp = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.05, duration));

  osc.connect(amp);
  amp.connect(context.destination);
  osc.start(start);
  osc.stop(start + Math.max(0.08, duration) + 0.04);
}

function playFeedbackSound(kind) {
  const context = primeFeedbackAudio();
  if (!context) {
    return;
  }

  if (kind === 'success') {
    playTone(context, { frequency: 523.25, duration: 0.14, type: 'triangle', gain: 0.07, delay: 0 });
    playTone(context, { frequency: 659.25, duration: 0.16, type: 'triangle', gain: 0.075, delay: 0.11 });
    playTone(context, { frequency: 783.99, duration: 0.18, type: 'sine', gain: 0.055, delay: 0.24 });
  } else {
    playTone(context, { frequency: 220, duration: 0.18, type: 'sawtooth', gain: 0.06, delay: 0 });
    playTone(context, { frequency: 174.61, duration: 0.2, type: 'square', gain: 0.045, delay: 0.12 });
  }
}

function playStreakSound(streak) {
  const context = primeFeedbackAudio();
  if (!context) {
    return;
  }

  const base = 440 + Math.min(280, streak * 7);
  playTone(context, { frequency: base, duration: 0.12, type: 'triangle', gain: 0.055, delay: 0 });
  playTone(context, { frequency: base * 1.25, duration: 0.12, type: 'triangle', gain: 0.06, delay: 0.08 });
  playTone(context, { frequency: base * 1.5, duration: 0.18, type: 'sine', gain: 0.05, delay: 0.16 });
  playTone(context, { frequency: base * 2, duration: 0.2, type: 'sine', gain: 0.04, delay: 0.28 });
}

function ensureStreakLayer() {
  if (els.streakLayer && els.streakLayer.isConnected) {
    return els.streakLayer;
  }

  let layer = document.getElementById('streakLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'streakLayer';
    layer.className = 'streak-layer';
    layer.setAttribute('aria-live', 'assertive');
    layer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(layer);
  }

  els.streakLayer = layer;
  return layer;
}

function showStreakCelebration(streak) {
  const layer = ensureStreakLayer();
  if (!layer) {
    return;
  }

  primeFeedbackAudio();
  playStreakSound(streak);

  const bonusLabel = streak >= 15 ? 'Легендарно' : streak >= 10 ? 'Супер-темп' : 'Отличный темп';
  const particleCount = 14;
  const particles = Array.from({ length: particleCount }, (_, index) => {
    const angle = Math.round((360 / particleCount) * index);
    const delay = (index * 0.03).toFixed(2);
    const hue = (index * 22 + streak * 12) % 360;
    return `<span class="streak-particle" style="--angle:${angle}deg; --delay:${delay}s; --hue:${hue}deg;"></span>`;
  }).join('');

  layer.innerHTML = `
    <div class="streak-card">
      <div class="streak-glow"></div>
      <div class="streak-badge">×${streak}</div>
      <div class="streak-title">Серия ${streak}!</div>
      <div class="streak-subtitle">${bonusLabel}</div>
      <div class="streak-copy">Ты держишь ритм. Каждые 5 решений мы устраиваем маленький праздник.</div>
      <div class="streak-particles">${particles}</div>
    </div>
  `;

  document.body.classList.add('streak-celebrate');
  requestAnimationFrame(() => {
    layer.classList.add('visible');
  });

  clearTimeout(state.streakToastTimer);
  state.streakToastTimer = setTimeout(() => {
    layer.classList.remove('visible');
    clearTimeout(state.streakFxTimer);
    state.streakFxTimer = setTimeout(() => {
      layer.innerHTML = '';
      document.body.classList.remove('streak-celebrate');
    }, 260);
  }, 1700);
}

function triggerFeedbackAnimation(kind) {
  const className = kind === 'success' ? 'feedback-success' : 'feedback-error';
  document.body.classList.remove('feedback-success', 'feedback-error');
  void document.body.offsetWidth;
  document.body.classList.add(className);

  clearTimeout(state.feedbackFxTimer);
  state.feedbackFxTimer = setTimeout(() => {
    document.body.classList.remove(className);
  }, kind === 'success' ? 1100 : 850);
}

function showFeedbackToast({ kind, title, detail, xp }) {
  const layer = ensureFeedbackLayer();
  if (!layer) {
    return;
  }

  layer.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = `feedback-toast ${kind}`;
  toast.innerHTML = `
    <div class="feedback-toast-head">
      <strong class="feedback-title">${escapeHtml(title)}</strong>
      ${xp ? `<span class="feedback-xp">${escapeHtml(xp)}</span>` : ''}
    </div>
    ${detail ? `<div class="feedback-detail">${escapeHtml(detail)}</div>` : ''}
  `;
  layer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  clearTimeout(state.feedbackToastTimer);
  state.feedbackToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => {
      if (toast.parentElement === layer) {
        toast.remove();
      }
    }, 220);
  }, kind === 'success' ? 1700 : 1800);
}

function showRunFeedback({ passed, xp = 0, error = '' }) {
  if (passed) {
    const xpLabel = `+${xp} XP`;
    setRunStatus(`Правильно! ${xpLabel}`, 'success');
    showFeedbackToast({
      kind: 'success',
      title: 'Правильно!',
      detail: 'Задача решена. Продолжаем набор темпа.',
      xp: xpLabel
    });
    triggerFeedbackAnimation('success');
    playFeedbackSound('success');
    return;
  }

  const detail = error ? `Ошибка: ${error}` : 'Проверь код, сигнатуру и тесты.';
  setRunStatus('Ошибка', 'danger');
  showFeedbackToast({
    kind: 'danger',
    title: 'Ошибка',
    detail
  });
  triggerFeedbackAnimation('error');
  playFeedbackSound('error');
}

function setProfileExpanded(expanded) {
  state.profileExpanded = Boolean(expanded);
  if (els.profileBody) {
    els.profileBody.classList.toggle('hidden', !state.profileExpanded);
  }
  if (els.profileToggle) {
    els.profileToggle.setAttribute('aria-expanded', String(state.profileExpanded));
  }
  if (els.profileToggleHint) {
    els.profileToggleHint.textContent = state.profileExpanded
      ? 'Свернуть информацию'
      : 'Нажми, чтобы открыть информацию';
  }
}

function toggleProfilePanel() {
  setProfileExpanded(!state.profileExpanded);
}

function setSkillsExpanded(expanded) {
  state.skillsExpanded = Boolean(expanded);
  if (els.skillsBody) {
    els.skillsBody.classList.toggle('hidden', !state.skillsExpanded);
  }
  if (els.skillsToggle) {
    els.skillsToggle.setAttribute('aria-expanded', String(state.skillsExpanded));
  }
  if (els.skillsPanelSummary) {
    els.skillsPanelSummary.textContent = buildSkillsPanelSummaryText();
  }
}

function toggleSkillsPanel() {
  setSkillsExpanded(!state.skillsExpanded);
}

function updateSkillsPanelSummary() {
  if (!els.skillsPanelSummary) {
    return;
  }
  els.skillsPanelSummary.textContent = buildSkillsPanelSummaryText();
}

function buildMasteryByCategory() {
  return CATEGORY_KEYS.reduce((acc, category) => {
    acc[category] = getSkillMastery(Number(state.progress.solvedByCategory[category] || 0));
    return acc;
  }, {});
}

function formatReviewDueLabel(dueAt, now = Date.now()) {
  if (typeof api.formatReviewDue === 'function') {
    return api.formatReviewDue(dueAt, now);
  }

  const timestamp = Number(dueAt);
  if (!Number.isFinite(timestamp)) {
    return 'ещё не назначен';
  }

  const deltaMs = timestamp - now;
  if (deltaMs <= 0) {
    return 'сейчас';
  }

  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) {
    return `через ${Math.max(1, minutes)} мин`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `через ${Math.max(1, hours)} ч`;
  }

  return `через ${Math.max(1, Math.round(hours / 24))} д`;
}

function toTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getReviewSnapshotForProgress(masteryByCategory = buildMasteryByCategory()) {
  if (typeof api.getReviewSnapshot === 'function') {
    return api.getReviewSnapshot(CATEGORY_KEYS, state.progress, masteryByCategory);
  }

  const reviewDeck = state.progress.reviewDeck || createEmptyReviewDeck();
  const now = Date.now();
  const items = CATEGORY_KEYS.map((category) => {
    const mastery = masteryByCategory[category] || 0;
    const record = reviewDeck[category] || {};
    const dueAt = toTimestamp(record.dueAt);
    const due = dueAt !== null && dueAt <= now;
    const pressure = Math.max(0, Math.min(5, Math.floor(Number(record.pressure) || 0)));
    return {
      category,
      mastery,
      pressure,
      dueAt,
      due,
      overdueMs: dueAt !== null ? Math.max(0, now - dueAt) : Number.POSITIVE_INFINITY,
      lastAttemptAt: toTimestamp(record.lastAttemptAt),
      lastReviewedAt: toTimestamp(record.lastReviewedAt),
      lastResult: record.lastResult || null,
      stage: pressure >= 4 ? 'Срочно повторить' : pressure >= 2 ? 'На повторении' : mastery < 35 ? 'Нужно укрепить' : mastery < 70 ? 'На поддержке' : 'В порядке',
      dueLabel: formatReviewDueLabel(dueAt, now)
    };
  });
  const dueItems = items.filter((item) => item.due).sort((a, b) => {
    if (a.overdueMs !== b.overdueMs) {
      return b.overdueMs - a.overdueMs;
    }
    if (a.pressure !== b.pressure) {
      return b.pressure - a.pressure;
    }
    if (a.mastery !== b.mastery) {
      return a.mastery - b.mastery;
    }
    return a.category.localeCompare(b.category);
  });
  const weakItems = items.slice().sort((a, b) => {
    if (a.mastery !== b.mastery) {
      return a.mastery - b.mastery;
    }
    if (a.pressure !== b.pressure) {
      return b.pressure - a.pressure;
    }
    if (a.dueAt === null && b.dueAt !== null) {
      return 1;
    }
    if (a.dueAt !== null && b.dueAt === null) {
      return -1;
    }
    if (a.dueAt !== b.dueAt) {
      return (a.dueAt || 0) - (b.dueAt || 0);
    }
    return a.category.localeCompare(b.category);
  });
  return {
    deck: reviewDeck,
    items,
    dueItems,
    dueCount: dueItems.length,
    next: dueItems[0] || weakItems[0] || null
  };
}

function buildSkillsPanelSummaryText() {
  const selectedCount = state.settings.selectedCategories.length;
  const snapshot = getReviewSnapshotForProgress();
  const practiceFocusLabel = getPracticeFocusLabel();
  const reviewPart = snapshot.dueCount > 0
    ? ` · ${snapshot.dueCount} тем ждут повторения`
    : snapshot.next
      ? ` · следующий повтор: ${CATEGORY_META[snapshot.next.category]?.title || snapshot.next.category}`
      : '';
  const focusPart = practiceFocusLabel ? ` · фокус: ${practiceFocusLabel}` : '';
  return state.skillsExpanded
    ? `Выбрано ${selectedCount} тем${focusPart}${reviewPart}`
    : `${selectedCount} тем выбрано${focusPart}${reviewPart}`;
}

function getStarterPreset() {
  const starterCategory = CATEGORY_KEYS[0] || 'arrays';
  const starterDifficulty = DIFFICULTIES.includes('easy') ? 'easy' : (DIFFICULTIES[0] || 'easy');
  return {
    selectedCategories: [starterCategory],
    selectedDifficulties: [starterDifficulty],
    focusCategory: starterCategory,
    focusDifficulty: starterDifficulty,
    randomMode: false,
    infiniteMode: false,
    autoHint: true
  };
}

function applyStarterPreset() {
  const starter = getStarterPreset();
  state.settings = {
    ...state.settings,
    ...starter
  };
  saveSettings();
  applySettingsToControls();
}

function shouldShowOnboarding() {
  return !state.onboarding.completed && state.progress.solved === 0 && state.progress.attempted === 0;
}

function renderOnboardingTrack() {
  if (!els.onboardingTrack) {
    return;
  }

  const starter = getStarterPreset();
  const categoryLabel = CATEGORY_META[starter.selectedCategories[0]]?.title || starter.selectedCategories[0];
  const difficultyLabel = {
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
    expert: 'Эксперт'
  }[starter.selectedDifficulties[0]] || starter.selectedDifficulties[0];

  els.onboardingTrack.textContent = `${ACTIVE_KERNEL_INFO.title} · ${categoryLabel} · ${difficultyLabel} старт`;
}

function showOnboardingOverlay() {
  if (!els.onboardingOverlay) {
    return;
  }

  state.onboardingActive = true;
  document.body.classList.add('onboarding-active');
  els.onboardingOverlay.classList.remove('hidden');
  els.onboardingOverlay.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    els.startOnboardingBtn?.focus();
  }, 0);
}

function hideOnboardingOverlay() {
  if (!els.onboardingOverlay) {
    return;
  }

  state.onboardingActive = false;
  document.body.classList.remove('onboarding-active');
  els.onboardingOverlay.classList.add('hidden');
  els.onboardingOverlay.setAttribute('aria-hidden', 'true');
}

function completeOnboarding() {
  if (!state.onboarding.completed) {
    state.onboarding.completed = true;
    state.onboarding.completedAt = new Date().toISOString();
    saveOnboarding();
  }
  hideOnboardingOverlay();
}

function startGuidedSession() {
  applyStarterPreset();
  completeOnboarding();
  setRunStatus('Начинаем с простой тренировки.', 'neutral');
  generateTask('practice');
}

function applySettingsToControls() {
  els.randomModeCheckbox.checked = Boolean(state.settings.randomMode);
  els.infiniteModeCheckbox.checked = Boolean(state.settings.infiniteMode);
  els.autoHintCheckbox.checked = Boolean(state.settings.autoHint);
  els.focusCategorySelect.value = state.settings.focusCategory;
  els.focusDifficultySelect.value = state.settings.focusDifficulty;
  syncDifficultyChips();
  syncCategoryChecks();
  syncFocusControls();
  renderSkillGraphView();
  updateSkillsPanelSummary();
}

function syncCategoryChecks() {
  const inputs = els.categoryFilters.querySelectorAll('input[type="checkbox"]');
  inputs.forEach((input) => {
    input.checked = state.settings.selectedCategories.includes(input.dataset.category);
  });
  updateSkillsPanelSummary();
}

function syncDifficultyChips() {
  const buttons = els.difficultyFilters.querySelectorAll('[data-difficulty]');
  buttons.forEach((button) => {
    const difficulty = button.dataset.difficulty;
    if (difficulty === 'all') {
      button.classList.toggle('active', state.settings.selectedDifficulties.length === DIFFICULTIES.length);
      return;
    }
    button.classList.toggle('active', state.settings.selectedDifficulties.includes(difficulty));
  });
}

function syncFocusControls() {
  const disabled = state.settings.randomMode;
  els.focusCategorySelect.disabled = disabled;
  els.focusDifficultySelect.disabled = disabled;
}

function renderCategoryFilters() {
  els.categoryFilters.innerHTML = '';
  CATEGORY_KEYS.forEach((key) => {
    const meta = CATEGORY_META[key];
    const wrapper = document.createElement('label');
    wrapper.className = 'filter-item';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.category = key;
    input.checked = state.settings.selectedCategories.includes(key);
    input.addEventListener('change', () => {
      const next = Array.from(els.categoryFilters.querySelectorAll('input[type="checkbox"]'))
        .filter((item) => item.checked)
        .map((item) => item.dataset.category);
      state.settings.selectedCategories = next.length > 0 ? next : CATEGORY_KEYS.slice();
      saveSettings();
      updateSkillsPanelSummary();
    });

    const color = document.createElement('span');
    color.className = 'filter-color';
    color.style.background = meta.accent;

    const text = document.createElement('div');
    text.className = 'filter-label';
    text.innerHTML = `<strong>${escapeHtml(meta.title)}</strong><span>${escapeHtml(meta.description)}</span>`;

    wrapper.appendChild(input);
    wrapper.appendChild(color);
    wrapper.appendChild(text);
    els.categoryFilters.appendChild(wrapper);
  });
}

function renderDifficultyFilters() {
  els.difficultyFilters.innerHTML = '';
  const buttons = [{ difficulty: 'all' }, ...DIFFICULTIES.map((difficulty) => ({ difficulty }))];
  buttons.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.difficulty = item.difficulty;
    button.textContent = item.difficulty === 'all'
      ? 'Все'
      : ({
          easy: 'Лёгкий',
          medium: 'Средний',
          hard: 'Сложный',
          expert: 'Эксперт'
        }[item.difficulty] || item.difficulty);
    button.addEventListener('click', () => {
      if (item.difficulty === 'all') {
        state.settings.selectedDifficulties = DIFFICULTIES.slice();
      } else if (state.settings.selectedDifficulties.includes(item.difficulty)) {
        const next = state.settings.selectedDifficulties.filter((difficulty) => difficulty !== item.difficulty);
        state.settings.selectedDifficulties = next.length > 0 ? next : DIFFICULTIES.slice();
      } else {
        state.settings.selectedDifficulties = [...state.settings.selectedDifficulties, item.difficulty];
      }
      saveSettings();
      syncDifficultyChips();
    });
    els.difficultyFilters.appendChild(button);
  });
}

function renderSelectOptions() {
  const categoryOptions = CATEGORY_KEYS.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(CATEGORY_META[key].title)}</option>`).join('');
  const difficultyOptions = DIFFICULTIES.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml({
    easy: 'Лёгкая',
    medium: 'Средняя',
    hard: 'Сложная',
    expert: 'Эксперт'
  }[key])}</option>`).join('');

  els.focusCategorySelect.innerHTML = categoryOptions;
  els.focusDifficultySelect.innerHTML = difficultyOptions;

  els.focusCategorySelect.value = state.settings.focusCategory;
  els.focusDifficultySelect.value = state.settings.focusDifficulty;

  els.customCategory.innerHTML = categoryOptions;
  els.customDifficulty.innerHTML = difficultyOptions;
  els.customStrategy.innerHTML = STRATEGIES.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(STRATEGY_LABELS[key] || key)}</option>`).join('');
}

function renderKernelOptions() {
  if (!els.kernelSelect) {
    return;
  }

  els.kernelSelect.innerHTML = KERNELS.map((kernel) => {
    const label = kernel.available ? kernel.title : `${kernel.title} (скоро)`;
    return `<option value="${escapeHtml(kernel.id)}" ${kernel.id === ACTIVE_KERNEL_ID ? 'selected' : ''} ${kernel.available ? '' : 'disabled'}>${escapeHtml(label)}</option>`;
  }).join('');
  els.kernelSelect.value = ACTIVE_KERNEL_ID;

  if (els.kernelStatus) {
    const stateLabel = ACTIVE_KERNEL_INFO.available ? 'активно' : 'недоступно';
    els.kernelStatus.textContent = `${ACTIVE_KERNEL_INFO.title} • ${stateLabel}`;
  }
}

function updateSettingsFromControls() {
  state.settings.randomMode = els.randomModeCheckbox.checked;
  state.settings.infiniteMode = els.infiniteModeCheckbox.checked;
  state.settings.autoHint = els.autoHintCheckbox.checked;
  state.settings.focusCategory = els.focusCategorySelect.value;
  state.settings.focusDifficulty = els.focusDifficultySelect.value;
  syncPracticeFocusWithSelection();
  syncFocusControls();
  saveSettings();
  renderSkillGraphView();
  updateSkillsPanelSummary();
}

function getGeneratorOptions(mode = 'practice', overrides = {}) {
  const dailyStamp = new Date().toLocaleDateString('sv-SE');
  return {
    kernelId: ACTIVE_KERNEL_ID,
    categories: Array.isArray(overrides.categories) && overrides.categories.length > 0
      ? overrides.categories.slice()
      : state.settings.selectedCategories.slice(),
    difficulties: Array.isArray(overrides.difficulties) && overrides.difficulties.length > 0
      ? overrides.difficulties.slice()
      : state.settings.selectedDifficulties.slice(),
    randomMode: typeof overrides.randomMode === 'boolean' ? overrides.randomMode : state.settings.randomMode,
    focusCategory: overrides.focusCategory || state.settings.focusCategory,
    focusDifficulty: overrides.focusDifficulty || state.settings.focusDifficulty,
    practiceTopicId: overrides.practiceTopicId || state.practiceFocusTopicId,
    practiceTopicTitle: overrides.practiceTopicTitle || state.practiceFocusTitle,
    customTasks: state.customTasks.slice(),
    mode,
    seriesIndex: mode === 'daily'
      ? `daily:${dailyStamp}`
      : mode === 'review'
        ? `review:${++state.runCounter}`
        : `${mode}:${++state.runCounter}`
  };
}

function storeCurrentDraft() {
  if (!state.currentTask || state.currentTaskSolved) {
    return;
  }
  rememberDraftForTask(state.drafts, state.currentTask.id, getEditorValue());
  saveDrafts();
}

function loadDraftForTask(task) {
  return readDraftForTask(state.drafts, task);
}

function forgetCurrentTaskDraft() {
  if (!state.currentTask) {
    return;
  }

  forgetDraftForTask(state.drafts, state.currentTask.id);
  saveDrafts();
}

function renderTask(task) {
  const categoryMeta = CATEGORY_META[task.category] || { title: task.category, accent: '#7dd3fc' };
  const difficultyLabel = {
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
    expert: 'Эксперт'
  }[task.difficulty] || task.difficulty;

  els.taskCategoryBadge.textContent = categoryMeta.title;
  els.taskCategoryBadge.style.background = `${categoryMeta.accent}22`;
  els.taskCategoryBadge.style.borderColor = `${categoryMeta.accent}44`;
  els.taskDifficultyBadge.textContent = difficultyLabel;
  els.taskXpBadge.textContent = `${task.xp} XP`;
  if (els.taskTrustBadge) {
    const verified = task.meta && task.meta.qaStatus === 'verified';
    const failed = task.meta && task.meta.qaStatus === 'failed';
    els.taskTrustBadge.textContent = verified ? 'Проверено QA' : failed ? 'QA: внимание' : 'QA';
    els.taskTrustBadge.style.background = verified ? 'rgba(52, 211, 153, 0.14)' : failed ? 'rgba(245, 158, 11, 0.14)' : '';
    els.taskTrustBadge.style.borderColor = verified ? 'rgba(52, 211, 153, 0.28)' : failed ? 'rgba(245, 158, 11, 0.28)' : '';
  }
  els.taskModeBadge.textContent = task.challengeType === 'daily'
    ? 'Ежедневный'
    : task.challengeType === 'boss'
      ? 'Испытание'
      : task.challengeType === 'review'
        ? 'Повторение'
        : 'Практика';
  els.taskTitle.textContent = task.title;
  els.taskPrompt.textContent = task.prompt;
  els.taskSignature.textContent = task.signature;
  els.hintCounter.textContent = `Подсказки: 0/${Array.isArray(task.hints) ? task.hints.length : 0}`;
}

function renderHintPanel() {
  if (!state.currentTask) {
    els.hintPanel.innerHTML = '<div class="hint-empty">Подсказки появятся после генерации задачи.</div>';
    return;
  }

  const hints = Array.isArray(state.currentTask.hints) ? state.currentTask.hints.slice(0, state.currentHintIndex) : [];
  if (hints.length === 0) {
    els.hintPanel.innerHTML = '<div class="hint-empty">Нажми «Подсказка», чтобы раскрывать советы по одному.</div>';
  } else {
    els.hintPanel.innerHTML = hints
      .map((hint, index) => `<div class="hint-card"><strong>Подсказка ${index + 1}</strong><div>${escapeHtml(hint)}</div></div>`)
      .join('');
  }
  els.hintCounter.textContent = `Подсказки: ${state.currentHintIndex}/${Array.isArray(state.currentTask.hints) ? state.currentTask.hints.length : 0}`;
}

function renderSolutionPanel() {
  if (!state.currentTask) {
    els.solutionPanel.hidden = true;
    els.solutionPanel.innerHTML = '';
    return;
  }

  const visible = state.solutionVisible === true;
  els.solutionPanel.hidden = !visible;
  if (!visible) {
    els.solutionPanel.innerHTML = '';
    return;
  }

  els.solutionPanel.innerHTML = `
    <div class="solution-card">
      <strong>Правильный ответ</strong>
      <pre><code>${escapeHtml(state.currentTask.solution)}</code></pre>
    </div>
    <div class="solution-card" style="margin-top: 10px;">
      <strong>Разбор</strong>
      <div style="margin-top: 6px; line-height: 1.55;">${escapeHtml(state.currentTask.explanation || 'Разбор не заполнен.')}</div>
    </div>
  `;
}

function renderEditorLines() {
  // Monaco renders line numbers itself.
}

function renderResults(report) {
  if (!report) {
    els.testResults.innerHTML = '<div class="results-empty">Запусти код, чтобы увидеть тесты.</div>';
    els.consoleOutput.textContent = '';
    renderLearningFeedback(null);
    return;
  }

  const taskXp = Number(state.currentTask?.xp) || 0;
  const summary = report.passed
    ? `<div class="test-result pass"><strong class="result-pass">Правильно!</strong><div class="meta">+${taskXp} XP · Время: ${report.durationMs} ms</div></div>`
    : `<div class="test-result fail"><strong class="result-fail">Ошибка</strong><div class="meta">${escapeHtml(report.error || 'Неизвестная ошибка')}</div></div>`;

  const list = Array.isArray(report.tests) && report.tests.length > 0
    ? report.tests.map((test, index) => {
      const status = test.passed ? 'pass' : 'fail';
      const label = `Тест ${index + 1}`;
      const expected = escapeHtml(formatValue(test.expected));
      const actual = escapeHtml(formatValue(test.actual));
      return `
        <div class="test-result ${status}">
          <div class="test-result-header">
            <strong>${label}</strong>
            <span class="meta">${test.passed ? 'OK' : 'Ошибка'}</span>
          </div>
          <div class="meta">Ожидалось:</div>
          <pre>${expected}</pre>
          <div class="meta" style="margin-top: 8px;">Получено:</div>
          <pre>${actual}</pre>
        </div>
      `;
    }).join('')
    : '<div class="results-empty">Тесты не были запущены.</div>';

  els.testResults.innerHTML = summary + list;
  renderLearningFeedback(report);
  els.consoleOutput.textContent = Array.isArray(report.logs) && report.logs.length > 0
    ? report.logs.map((entry) => `[${entry.type}] ${entry.text}`).join('\n')
    : 'Логи появятся здесь, если задача использует console.log.';
}

function updateProgressView() {
  const summary = api.getProgressSummary(state.progress);
  els.levelLabel.textContent = `Уровень ${summary.level}`;
  els.levelBadge.textContent = String(summary.level);
  els.xpSummary.textContent = `${summary.xp} XP, осталось ${summary.xpRemaining} до следующего уровня`;
  els.xpBar.style.width = `${Math.max(3, Math.round(summary.progressToNext * 100))}%`;
  els.statSolved.textContent = String(summary.solved);
  els.statAccuracy.textContent = `${summary.accuracy.toFixed(1)}%`;
  els.statStreak.textContent = String(summary.streak);
  els.statAttempts.textContent = String(summary.attempted);
  if (els.statFastest) {
    els.statFastest.textContent = formatSolveTime(state.progress.fastestSolveMs);
  }
  if (els.statAvg) {
    const avg = summary.solved > 0 ? (state.progress.totalSolveTimeMs || 0) / summary.solved : 0;
    els.statAvg.textContent = formatSolveTime(avg);
  }
  renderSkillGraphView();
  updateSkillsPanelSummary();
}

function updateAchievementsView() {
  const items = api.buildAchievements(state.progress);
  els.achievementsList.innerHTML = items.map((item) => `
    <div class="achievement-item ${item.unlocked ? 'unlocked' : ''}">
      <div class="achievement-title">
        <span>${escapeHtml(item.title)}</span>
        <span>${item.unlocked ? 'Открыто' : 'Закрыто'}</span>
      </div>
      <p>${escapeHtml(item.description)}</p>
    </div>
  `).join('');
}

function buildSkillGraphData() {
  const routeCategories = state.settings.selectedCategories
    .filter((category) => CATEGORY_KEYS.includes(category));
  const routePool = routeCategories.length > 0 ? routeCategories : CATEGORY_KEYS.slice();
  const masteryByCategory = buildMasteryByCategory();
  const reviewSnapshot = getReviewSnapshotForProgress(masteryByCategory);
  const items = reviewSnapshot.items.map((snapshotItem) => {
    const category = snapshotItem.category;
    const meta = CATEGORY_META[category] || { title: category, description: '', accent: '#7dd3fc' };
    const count = Number(state.progress.solvedByCategory[category] || 0);
    const mastery = snapshotItem.mastery;
    return {
      category,
      title: meta.title || category,
      description: meta.description || '',
      accent: meta.accent || '#7dd3fc',
      count,
      mastery,
      stage: getSkillStage(mastery, count),
      milestone: getNextMilestone(count),
      route: routePool.includes(category),
      selected: category === state.settings.focusCategory,
      recommendedDifficulty: getRecommendedDifficultyForSkill(mastery),
      review: {
        due: Boolean(snapshotItem.due),
        dueAt: snapshotItem.dueAt,
        dueLabel: snapshotItem.dueLabel,
        pressure: snapshotItem.pressure,
        stage: snapshotItem.stage,
        lastResult: snapshotItem.lastResult
      }
    };
  });

  const defaultItem = items[0] || null;
  const strongest = items.reduce((best, item) => {
    if (!best) {
      return item;
    }
    return item.mastery > best.mastery ? item : best;
  }, defaultItem);
  const weakest = items.reduce((worst, item) => {
    if (!worst) {
      return item;
    }
    return item.mastery < worst.mastery ? item : worst;
  }, defaultItem);
  const nextReview = reviewSnapshot.next
    ? items.find((item) => item.category === reviewSnapshot.next.category) || null
    : null;
  const nextRoute = items
    .filter((item) => routePool.includes(item.category))
    .reduce((worst, item) => {
      if (!worst) {
        return item;
      }
      return item.mastery < worst.mastery ? item : worst;
    }, null);
  const next = nextReview || nextRoute || weakest || defaultItem;

  return {
    items,
    strongest,
    weakest,
    next,
    reviewDueCount: reviewSnapshot.dueCount,
    reviewNext: reviewSnapshot.next ? (items.find((item) => item.category === reviewSnapshot.next.category) || null) : null
  };
}

function renderSkillGraphView() {
  if (!els.skillGraphList) {
    return;
  }

  const data = buildSkillGraphData();
  if (!data.items.length) {
    els.skillGraphList.innerHTML = '<div class="results-empty">Карта навыков появится после загрузки категорий.</div>';
    return;
  }

  if (els.skillGraphSummary) {
    const unlocked = data.items.filter((item) => item.count > 0).length;
    const mastered = data.items.filter((item) => item.mastery >= 80).length;
    const reviewPart = data.reviewDueCount > 0
      ? ` · ${data.reviewDueCount} тем ждут повторения`
      : '';
    const focusLabel = getPracticeFocusLabel();
    const focusPart = focusLabel ? ` · фокус: ${focusLabel}` : '';
    els.skillGraphSummary.textContent = `${unlocked}/${data.items.length} тем в работе · ${mastered} сильных зон${focusPart}${reviewPart}`;
  }

  if (els.skillStrongest) {
    els.skillStrongest.textContent = data.strongest ? data.strongest.title : '—';
    els.skillStrongestMeta.textContent = data.strongest
      ? `${data.strongest.count} реш. · ${data.strongest.stage}`
      : 'Пока нет данных';
  }

  if (els.skillWeakest) {
    els.skillWeakest.textContent = data.weakest ? data.weakest.title : '—';
    els.skillWeakestMeta.textContent = data.weakest
      ? `${data.weakest.count} реш. · ${data.weakest.stage}`
      : 'Пока нет данных';
  }

  if (els.skillNext) {
    els.skillNext.textContent = data.next ? data.next.title : '—';
    els.skillNextMeta.textContent = data.next
      ? data.next.review && data.next.review.due
        ? `Пора повторить: ${data.next.review.dueLabel}`
        : `Рекомендуем ${getDifficultyTitle(data.next.recommendedDifficulty).toLowerCase()} уровень · добить до ${data.next.milestone} решений`
      : 'Пока нет рекомендаций';
  }

  els.skillGraphList.innerHTML = data.items.map((item) => {
    const isBest = data.strongest && data.strongest.category === item.category;
    const isWeakest = data.weakest && data.weakest.category === item.category;
    const isNext = data.next && data.next.category === item.category;
    const isDueReview = Boolean(item.review && item.review.due);
    const selectedLabel = isDueReview
      ? `Повторение · ${item.review.dueLabel}`
      : item.selected
        ? 'Текущий фокус'
        : (item.route ? 'В маршруте' : 'Можно включить');
    const actionLabel = isDueReview
      ? 'Повторить сейчас'
      : item.selected
        ? 'Тренируешь сейчас'
        : 'Тренировать';
    const actionTone = isDueReview ? 'button-primary' : item.selected ? 'button-secondary' : 'button-primary';
    const helper = isDueReview
      ? `Тема уже ждёт ревью. ${item.review.stage}.`
      : item.count === 0
      ? 'Начни с лёгкого сценария и зафиксируй первую победу.'
      : item.mastery < 50
        ? 'Сейчас лучше добивать базовые паттерны и ритм.'
        : item.mastery < 80
          ? 'Пора усложнять формат и менять ограничения.'
          : 'Навык уже сильный, можно усиливать сложность.';

    return `
      <article class="skill-node ${isBest ? 'strongest' : ''} ${isWeakest ? 'weakest' : ''} ${isNext ? 'next' : ''} ${isDueReview ? 'review-due' : ''} ${item.selected ? 'active' : ''}" style="--skill-accent:${item.accent}">
        <div class="skill-node-head">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.description)}</span>
          </div>
          <span class="skill-node-pill">${escapeHtml(selectedLabel)}</span>
          ${isDueReview ? '<span class="skill-node-pill skill-node-pill-review">Повторить</span>' : ''}
        </div>
        <div class="skill-node-meta">
          <span>${escapeHtml(String(item.count))} реш.</span>
          <span>${escapeHtml(item.stage)}</span>
          <span>${escapeHtml(String(item.mastery))}%</span>
        </div>
        <div class="skill-node-bar"><div style="width:${item.mastery}%;"></div></div>
        <p class="skill-node-helper">${escapeHtml(helper)}</p>
        <div class="skill-node-footer">
          <div class="skill-node-path">
            ${isBest ? '<span>Сильнейшая зона</span>' : ''}
            ${isWeakest ? '<span>Нужно добить</span>' : ''}
            ${isNext ? '<span>Рекомендовано дальше</span>' : ''}
          </div>
          <button class="button ${actionTone} skill-train-btn" type="button" data-skill-train="${escapeHtml(item.category)}">${escapeHtml(actionLabel)}</button>
        </div>
      </article>
    `;
  }).join('');
}

function startSkillSession(category) {
  if (!CATEGORY_KEYS.includes(category)) {
    return;
  }

  storeCurrentDraft();
  const data = buildSkillGraphData();
  const target = data.items.find((item) => item.category === category);
  const difficulty = target ? target.recommendedDifficulty : 'easy';

  startPracticeFocus(category, CATEGORY_META[category]?.title || category);
  state.settings.focusDifficulty = difficulty;
  state.settings.selectedDifficulties = [difficulty];
  state.settings.randomMode = false;
  saveSettings();
  applySettingsToControls();
  setRunStatus(`Фокус на ${CATEGORY_META[category]?.title || category}.`, 'neutral');
  generateTask('practice');
}

function startPracticeFocus(category, title) {
  if (!CATEGORY_KEYS.includes(category)) {
    return false;
  }

  state.practiceFocusTopicId = category;
  state.practiceFocusCategory = category;
  state.practiceFocusTitle = title || CATEGORY_META[category]?.title || category;
  state.settings.selectedCategories = [category];
  state.settings.focusCategory = category;
  saveSettings();
  applySettingsToControls();
  renderSkillGraphView();
  updateSkillsPanelSummary();
  return true;
}

function updateCurrentTaskStats() {
  if (!state.currentTask) {
    return;
  }
  renderTask(state.currentTask);
  renderHintPanel();
  renderSolutionPanel();
}

function updateTaskEditor(value) {
  setEditorValue(value);
}

function getReviewRoute() {
  const data = buildSkillGraphData();
  if (!data.items.length) {
    return null;
  }

  const dueItem = data.items
    .filter((item) => item.review && item.review.due)
    .sort((a, b) => {
      if (a.review.dueAt !== b.review.dueAt) {
        return (a.review.dueAt || 0) - (b.review.dueAt || 0);
      }
      if (a.review.pressure !== b.review.pressure) {
        return b.review.pressure - a.review.pressure;
      }
      return a.mastery - b.mastery;
    })[0];

  const target = dueItem || data.weakest || data.next || data.items[0] || null;
  if (!target) {
    return null;
  }

  return {
    category: target.category,
    difficulty: target.mastery < 35
      ? 'easy'
      : target.mastery < 65
        ? 'medium'
        : target.recommendedDifficulty,
    title: target.title,
    due: Boolean(target.review && target.review.due)
  };
}

function updateReviewDeckAfterRun(passed) {
  if (!state.currentTask || !CATEGORY_KEYS.includes(state.currentTask.category)) {
    return;
  }

  const masteryByCategory = buildMasteryByCategory();
  const currentDeck = state.progress.reviewDeck || createEmptyReviewDeck();
  if (typeof api.updateReviewDeck === 'function') {
    state.progress.reviewDeck = api.updateReviewDeck(
      CATEGORY_KEYS,
      currentDeck,
      state.currentTask.category,
      passed,
      masteryByCategory[state.currentTask.category] || 0,
      Date.now()
    );
    return;
  }

  state.progress.reviewDeck = currentDeck;
}

async function generateTask(mode = 'practice', sessionOverrides = {}) {
  if (state.generating) {
    return;
  }
  setGenerating(true);
  playGenerateSound();
  updateSettingsFromControls();
  storeCurrentDraft();
  if (state.currentTaskSolved) {
    forgetCurrentTaskDraft();
  }
  state.currentMode = mode;
  const reviewRoute = mode === 'review' ? getReviewRoute() : null;
  setRunStatus('Генерируем задачу...', 'neutral');
  let task;
  try {
    const overrides = reviewRoute ? {
      categories:     [reviewRoute.category],
      difficulties:   [reviewRoute.difficulty],
      focusCategory:  reviewRoute.category,
      focusDifficulty: reviewRoute.difficulty,
      randomMode:     false,
    } : sessionOverrides;
    task = await api.generateTask(getGeneratorOptions(mode, overrides));
  } catch (error) {
    setRunStatus('Не удалось сгенерировать задачу.', 'danger');
    return;
  } finally {
    setGenerating(false);
  }
  state.currentTask = task;
  state.currentReport = null;
  state.currentHintIndex = 0;
  state.solutionVisible = false;
  state.currentTaskSolved = false;
  state.failuresOnCurrentTask = 0;
  state.currentTaskAwarded = false;
  updateTaskEditor(loadDraftForTask(task));
  syncEditorLanguage(getEditorLanguageId(task));
  renderTask(task);
  renderThinkingSkill(task);
  if (state.session.active) renderSessionBar();
  renderHintPanel();
  renderSolutionPanel();
  renderResults(null);
  hideAiHintPanel();
  els.aiBreakdownPanel?.classList.add('hidden');
  state.taskStartedAt = Date.now();
  if (els.shareSeedBtn) els.shareSeedBtn.disabled = false;
  const practiceFocusLabel = mode === 'practice' ? getPracticeFocusLabel() : '';
  setRunStatus(
    mode === 'review'
      ? `Повторяем ${CATEGORY_META[task.category]?.title || task.category}`
      : practiceFocusLabel
        ? `Фокус на ${practiceFocusLabel}`
        : `${task.kernelTitle || ACTIVE_KERNEL_INFO.title}: ${CATEGORY_META[task.category]?.title || task.category}`,
    'neutral'
  );
  focusEditor();
}

async function runCurrentTask() {
  if (!state.currentTask) {
    return;
  }

  primeFeedbackAudio();
  updateSettingsFromControls();
  storeCurrentDraft();
  els.runTestsBtn.disabled = true;
  setRunStatus('Проверяем решение...', 'neutral');

  try {
    const report = await api.runTaskTests(state.currentTask, getEditorValue());
    state.currentReport = report;
    renderResults(report);

    if (report.passed) {
      if (!state.currentTaskSolved) {
        const streakMilestone = updateProgressAfterRun(report);
        state.currentTaskSolved = true;
        forgetCurrentTaskDraft();
        updateProgressView();
        updateAchievementsView();
        setRunStatus('Задача решена', 'success');
        showRunFeedback({ passed: true, xp: state.currentTask.xp || 0 });
        if (streakMilestone > 0) {
          showStreakCelebration(streakMilestone);
        }
        // Track goal progress and challenge day
        trackGoalProgress(state.currentTask);
        checkChallengeDay(state.currentTask);
        // AI breakdown — fire-and-forget
        void requestAiBreakdown(state.currentTask);

        if (state.session.active) {
          // Auto-advance session after 1.5s
          setTimeout(() => advanceSession(true), 1500);
        } else if (state.settings.infiniteMode) {
          scheduleNextTask('practice');
        }
      } else {
        setRunStatus('Задача уже засчитана', 'neutral');
      }
    } else {
      if (!state.currentTaskSolved) {
        updateProgressAfterRun(report);
        updateProgressView();
        updateAchievementsView();
      }
      setRunStatus(report.error ? `Ошибка: ${report.error}` : 'Есть ошибки в тестах', 'danger');
      state.failuresOnCurrentTask += 1;
      showRunFeedback({ passed: false, error: report.error || '' });
      showAiHintPanel();
      if (state.settings.autoHint && state.failuresOnCurrentTask >= 2) {
        showNextHint(true);
      }
    }
  } catch (error) {
    const message = error.message || String(error);
    state.currentReport = {
      passed: false,
      error: message,
      tests: [],
      logs: [],
      durationMs: 0
    };
    renderResults(state.currentReport);
    setRunStatus(`Сбой раннера: ${message}`, 'danger');
    showRunFeedback({ passed: false, error: message });
  } finally {
    els.runTestsBtn.disabled = false;
  }
}

function updateProgressAfterRun(report) {
  if (state.currentTaskSolved) {
    return 0;
  }

  state.progress.attempted += 1;
  let streakMilestone = 0;
  if (report.passed) {
    state.progress.correct += 1;
    state.progress.solved += 1;
    state.progress.xp += state.currentTask.xp || 0;
    state.progress.streak += 1;
    state.progress.bestStreak = Math.max(state.progress.bestStreak, state.progress.streak);
    state.progress.solvedByCategory[state.currentTask.category] = (state.progress.solvedByCategory[state.currentTask.category] || 0) + 1;
    state.progress.solvedByDifficulty[state.currentTask.difficulty] = (state.progress.solvedByDifficulty[state.currentTask.difficulty] || 0) + 1;

    if (!state.currentTaskAwarded) {
      if (state.currentTask.challengeType === 'daily') {
        state.progress.dailySolved += 1;
      }
      if (state.currentTask.challengeType === 'boss') {
        state.progress.bossCleared += 1;
      }
      state.currentTaskAwarded = true;
    }

    if (state.progress.streak > 0 && state.progress.streak % 5 === 0) {
      streakMilestone = state.progress.streak;
    }

    if (state.taskStartedAt) {
      const elapsed = Date.now() - state.taskStartedAt;
      state.progress.totalSolveTimeMs = (state.progress.totalSolveTimeMs || 0) + elapsed;
      if (!state.progress.fastestSolveMs || elapsed < state.progress.fastestSolveMs) {
        state.progress.fastestSolveMs = elapsed;
      }
    }
  } else {
    state.progress.streak = 0;
  }

  updateReviewDeckAfterRun(Boolean(report.passed));
  saveProgress();
  void syncToCloud();
  return streakMilestone;
}

function scheduleNextTask(mode = 'practice') {
  if (state.infiniteTimer) {
    clearTimeout(state.infiniteTimer);
  }
  state.infiniteTimer = setTimeout(() => {
    generateTask(mode);
  }, 650);
}

function showNextHint(silent = false) {
  if (!state.currentTask || !Array.isArray(state.currentTask.hints) || state.currentTask.hints.length === 0) {
    if (!silent) {
      setRunStatus('У этой задачи нет подсказок.', 'neutral');
    }
    return;
  }

  if (state.currentHintIndex < state.currentTask.hints.length) {
    state.currentHintIndex += 1;
    renderHintPanel();
    setRunStatus(`Открыта подсказка ${state.currentHintIndex}`, 'neutral');
  } else if (!silent) {
    setRunStatus('Подсказки закончились.', 'neutral');
  }
}

function toggleAnswer() {
  state.solutionVisible = !state.solutionVisible;
  renderSolutionPanel();
  setRunStatus(state.solutionVisible ? 'Показан ответ' : 'Ответ скрыт', 'neutral');
}

function resetEditor() {
  if (!state.currentTask) {
    return;
  }
  updateTaskEditor(state.currentTask.starterCode);
  storeCurrentDraft();
  setRunStatus('Код сброшен к шаблону.', 'neutral');
}

async function copyStarterCode() {
  if (!state.currentTask) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.currentTask.starterCode);
    setRunStatus('Шаблон скопирован в буфер обмена.', 'success');
  } catch (error) {
    setRunStatus('Не удалось скопировать шаблон.', 'danger');
  }
}

function renderCustomTaskList() {
  if (state.customTasks.length === 0) {
    els.customTaskList.innerHTML = '<div class="results-empty">Пока нет пользовательских задач.</div>';
    return;
  }

  els.customTaskList.innerHTML = state.customTasks
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((task) => `
      <div class="custom-task-item" data-id="${escapeHtml(task.id)}">
        <div class="achievement-title">
          <span>${escapeHtml(task.title)}</span>
          <span>${escapeHtml(CATEGORY_META[task.category]?.title || task.category)} · ${escapeHtml({ easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный', expert: 'Эксперт' }[task.difficulty] || task.difficulty)} · ${escapeHtml(task.kernelTitle || ACTIVE_KERNEL_INFO.title || task.kernelId)}</span>
        </div>
        <p>${escapeHtml(task.prompt || '')}</p>
        <div class="task-action-row" style="margin-top: 10px;">
          <button class="button button-secondary" type="button" data-edit-task="${escapeHtml(task.id)}">Редактировать</button>
          <button class="button button-secondary" type="button" data-delete-task="${escapeHtml(task.id)}">Удалить</button>
        </div>
      </div>
    `).join('');

  els.customTaskList.querySelectorAll('[data-edit-task]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.editTask;
      const task = state.customTasks.find((item) => item.id === id);
      if (task) {
        fillCustomForm(task);
        state.customEditingId = id;
        updateCustomFormButtonLabel();
      }
    });
  });

  els.customTaskList.querySelectorAll('[data-delete-task]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.deleteTask;
      state.customTasks = state.customTasks.filter((item) => item.id !== id);
      if (state.customEditingId === id) {
        state.customEditingId = null;
      }
      saveCustomTasks();
      renderCustomTaskList();
      updateCustomFormButtonLabel();
      setRunStatus('Пользовательская задача удалена.', 'neutral');
      void deleteCustomTaskFromServer(id);
    });
  });
}

function updateCustomFormButtonLabel() {
  els.saveCustomTaskBtn.textContent = state.customEditingId ? 'Обновить' : 'Сохранить';
}

function fillCustomForm(task) {
  els.customTitle.value = task.title || '';
  els.customCategory.value = task.category || CATEGORY_KEYS[0];
  els.customDifficulty.value = task.difficulty || 'medium';
  els.customStrategy.value = task.strategy || 'simple';
  els.customSignature.value = task.signature || 'solve(input)';
  els.customPrompt.value = task.prompt || '';
  els.customStarter.value = task.starterCode || '';
  els.customSolution.value = task.solution || '';
  els.customTests.value = JSON.stringify(task.tests || [], null, 2);
  els.customHints.value = Array.isArray(task.hints) ? task.hints.join('\n') : '';
  els.customExplanation.value = task.explanation || '';
}

function fillCustomTemplate() {
  state.customEditingId = null;
  updateCustomFormButtonLabel();
  fillCustomForm(createDefaultCustomForm());
}

function serializeCustomForm() {
  let tests;
  try {
    tests = JSON.parse(els.customTests.value || '[]');
    if (!Array.isArray(tests)) {
      throw new Error('tests must be an array');
    }
  } catch (error) {
    throw new Error('Тесты JSON должны быть массивом объектов.');
  }

  const hints = els.customHints.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    id: state.customEditingId || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `custom-${Date.now()}`),
    createdAt: state.customEditingId ? (state.customTasks.find((item) => item.id === state.customEditingId)?.createdAt || Date.now()) : Date.now(),
    source: 'custom',
    kernelId: ACTIVE_KERNEL_ID,
    kernelTitle: ACTIVE_KERNEL_INFO.title,
    editorLanguage: getEditorLanguageId(),
    title: els.customTitle.value.trim() || 'Пользовательская задача',
    category: els.customCategory.value,
    difficulty: els.customDifficulty.value,
    strategy: els.customStrategy.value,
    signature: els.customSignature.value.trim() || 'solve(input)',
    prompt: els.customPrompt.value.trim(),
    starterCode: els.customStarter.value,
    solution: els.customSolution.value,
    tests,
    hints,
    explanation: els.customExplanation.value.trim()
  };
}

function saveCustomTaskFromForm(event) {
  event.preventDefault();
  try {
    const task = serializeCustomForm();
    const existingIndex = state.customTasks.findIndex((item) => item.id === task.id);
    if (existingIndex >= 0) {
      state.customTasks[existingIndex] = task;
    } else {
      state.customTasks.push(task);
      state.progress.customTasksCreated += 1;
    }
    state.customEditingId = null;
    updateCustomFormButtonLabel();
    saveCustomTasks();
    saveProgress();
    renderCustomTaskList();
    updateProgressView();
    updateAchievementsView();
    setRunStatus('Пользовательская задача сохранена.', 'success');
    void syncCustomTask(task);
  } catch (error) {
    setRunStatus(error.message || 'Не удалось сохранить задачу.', 'danger');
  }
}

function serializeCustomTaskForExport(task) {
  return {
    id: task.id,
    createdAt: task.createdAt || null,
    source: task.source || 'custom',
    kernelId: task.kernelId || ACTIVE_KERNEL_ID,
    kernelTitle: task.kernelTitle || ACTIVE_KERNEL_INFO.title,
    editorLanguage: task.editorLanguage || ACTIVE_KERNEL_INFO.editorLanguage || 'plaintext',
    title: task.title,
    category: task.category,
    difficulty: task.difficulty,
    strategy: task.strategy,
    signature: task.signature,
    prompt: task.prompt,
    starterCode: task.starterCode || '',
    solution: task.solution || '',
    solutionCode: task.solution || '',
    tests: Array.isArray(task.tests) ? task.tests : [],
    hints: Array.isArray(task.hints) ? task.hints : [],
    explanation: task.explanation || '',
    xp: Number(task.xp) || 0,
    tags: Array.isArray(task.tags) ? task.tags : [],
    meta: task.meta || {}
  };
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function extractCustomTaskCandidates(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.customTasks)) {
      return payload.customTasks;
    }
    if (Array.isArray(payload.tasks)) {
      return payload.tasks;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
  }

  return [];
}

function exportCustomTasksToJson() {
  const payload = {
    app: 'js-infinite-trainer',
    version: 1,
    exportedAt: new Date().toISOString(),
    customTasks: state.customTasks.map((task) => serializeCustomTaskForExport(task))
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJsonFile(`js-infinite-trainer-custom-tasks-${stamp}.json`, payload);
  setRunStatus(`Экспортировано ${state.customTasks.length} задач в JSON.`, 'success');
}

async function importCustomTasksFromFile(file) {
  const rawText = await file.text();
  let payload;

  try {
    payload = JSON.parse(rawText);
  } catch (error) {
    throw new Error('JSON-файл не удалось разобрать.');
  }

  const candidates = extractCustomTaskCandidates(payload);
  if (candidates.length === 0) {
    throw new Error('В JSON не найден массив customTasks, tasks или items.');
  }

  let imported = 0;
  let updated = 0;
  let skippedKernelMismatch = 0;
  const nextTasks = state.customTasks.slice();
  const indexById = new Map(nextTasks.map((task, index) => [task.id, index]));

  for (const candidate of candidates) {
    const candidateKernelId = typeof candidate.kernelId === 'string' && candidate.kernelId.trim()
      ? candidate.kernelId.trim()
      : ACTIVE_KERNEL_ID;
    if (candidateKernelId !== ACTIVE_KERNEL_ID) {
      skippedKernelMismatch += 1;
      continue;
    }

    const normalized = api.normalizeCustomTask({
      ...candidate,
      kernelId: ACTIVE_KERNEL_ID
    });
    if (!normalized) {
      continue;
    }
    normalized.kernelTitle = ACTIVE_KERNEL_INFO.title;
    normalized.editorLanguage = getEditorLanguageId();
    const existingIndex = indexById.get(normalized.id);
    if (typeof existingIndex === 'number') {
      nextTasks[existingIndex] = normalized;
      updated += 1;
    } else {
      indexById.set(normalized.id, nextTasks.length);
      nextTasks.push(normalized);
      imported += 1;
    }
  }

  if (imported === 0 && updated === 0) {
    throw new Error('Импорт не добавил ни одной задачи.');
  }

  state.customTasks = nextTasks;
  saveCustomTasks();
  renderCustomTaskList();
  const skippedSuffix = skippedKernelMismatch > 0 ? `, пропущено ${skippedKernelMismatch} из других ядер` : '';
  setRunStatus(`Импортировано ${imported} задач, обновлено ${updated}${skippedSuffix}.`, 'success');
}

// ── Cloud auth & sync ─────────────────────────────────────────────────────────

let _authMode = 'login'; // 'login' | 'register'

function showAuthOverlay() {
  if (!els.authOverlay) return;
  els.authOverlay.classList.remove('hidden');
  els.authOverlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => els.authEmail?.focus(), 60);
}

function hideAuthOverlay() {
  if (!els.authOverlay) return;
  els.authOverlay.classList.add('hidden');
  els.authOverlay.setAttribute('aria-hidden', 'true');
  if (els.authError) els.authError.classList.add('hidden');
  if (els.authForm) els.authForm.reset();
}

function setAuthMode(mode) {
  _authMode = mode;
  const isLogin = mode === 'login';
  els.authTabLogin?.classList.toggle('active', isLogin);
  els.authTabRegister?.classList.toggle('active', !isLogin);
  if (els.authSubmitBtn) els.authSubmitBtn.textContent = isLogin ? 'Войти' : 'Создать аккаунт';
  if (els.authError) els.authError.classList.add('hidden');
}

function renderAuthStatus() {
  const loggedIn = isLoggedIn();
  if (els.authOpenBtn)  els.authOpenBtn.classList.toggle('hidden', loggedIn);
  if (els.authUserBar)  els.authUserBar.classList.toggle('hidden', !loggedIn);
  renderUpgradeBtn();
  applyKernelLocks();
}

function setSyncDot(state) { // 'ok' | 'syncing' | 'error'
  if (!els.authSyncDot) return;
  els.authSyncDot.className = 'auth-sync-dot' + (state !== 'ok' ? ` ${state}` : '');
  els.authSyncDot.title = state === 'syncing' ? 'Синхронизация…' : state === 'error' ? 'Ошибка синхронизации' : 'Синхронизировано';
}

async function syncToCloud() {
  if (!isLoggedIn()) return;
  setSyncDot('syncing');
  const ok = await syncProgress(ACTIVE_KERNEL_ID, state.progress);
  setSyncDot(ok ? 'ok' : 'error');
}

async function pullFromCloud() {
  if (!isLoggedIn()) return;
  setSyncDot('syncing');
  try {
    const merged = await fetchAndMergeProgress(ACTIVE_KERNEL_ID, state.progress);
    if (merged !== state.progress) {
      state.progress = merged;
      saveProgress();
      updateProgressView();
      updateAchievementsView();
    }
    setSyncDot('ok');
  } catch {
    setSyncDot('error');
  }
}

// ── Plan helpers ──────────────────────────────────────────────────────────────

const FREE_KERNELS = new Set(['js', 'python']);

function getStoredPlan() {
  return localStorage.getItem('jt.auth.plan') || 'free';
}

function isPro() {
  return getStoredPlan() !== 'free';
}

function isKernelFree(kernelId) {
  return FREE_KERNELS.has(kernelId);
}

// ── Upgrade modal ─────────────────────────────────────────────────────────────

function showUpgradeOverlay() {
  if (!els.upgradeOverlay) return;
  const pro = isPro();
  els.upgradeCheckoutBtn?.classList.toggle('hidden', pro);
  els.upgradePortalBtn?.style.setProperty('display', pro ? 'block' : 'none');
  els.upgradeOverlay.classList.remove('hidden');
  els.upgradeOverlay.setAttribute('aria-hidden', 'false');
}

function hideUpgradeOverlay() {
  if (!els.upgradeOverlay) return;
  els.upgradeOverlay.classList.add('hidden');
  els.upgradeOverlay.setAttribute('aria-hidden', 'true');
  if (els.upgradeError) els.upgradeError.classList.add('hidden');
}

function renderUpgradeBtn() {
  if (!els.upgradeOpenBtn) return;
  const loggedIn = isLoggedIn();
  const pro = isPro();
  // Show "★ Pro" button only when logged in and not yet Pro
  els.upgradeOpenBtn.classList.toggle('hidden', !loggedIn || pro);
}

// ── Thinking skill labels (2.4) ───────────────────────────────────────────────

const THINKING_SKILLS = {
  async:      { label: 'Async-мышление',      color: '#fb7185' },
  closure:    { label: 'Управление памятью',   color: '#34d399' },
  dom:        { label: 'UI и события',         color: '#22c55e' },
  arrays:     { label: 'Коллекции',            color: '#7dd3fc' },
  objects:    { label: 'Структуры данных',     color: '#a78bfa' },
  functions:  { label: 'Декомпозиция',         color: '#f59e0b' },
  closures:   { label: 'Замыкания',            color: '#34d399' },
  algorithms: { label: 'Алгоритмы',           color: '#f97316' },
};

function getThinkingSkill(task) {
  return THINKING_SKILLS[task?.strategy] ||
         THINKING_SKILLS[task?.category] ||
         { label: 'Программирование', color: '#7a8ba6' };
}

function renderThinkingSkill(task) {
  if (!els.taskSkillBadge) return;
  if (!task) { els.taskSkillBadge.classList.add('hidden'); return; }
  const skill = getThinkingSkill(task);
  els.taskSkillBadge.textContent = `◈ ${skill.label}`;
  els.taskSkillBadge.style.background = `${skill.color}18`;
  els.taskSkillBadge.style.borderColor = `${skill.color}36`;
  els.taskSkillBadge.style.color       = skill.color;
  els.taskSkillBadge.classList.remove('hidden');
}

// ── Smart Session (2.1 — меньше выбора, больше направления) ─────────────────

function buildTodaySession() {
  const data       = buildSkillGraphData();
  const snapshot   = getReviewSnapshotForProgress();
  const allItems   = data.items.slice().sort((a, b) => a.mastery - b.mastery);
  const weakTop3   = allItems.slice(0, 3).map((i) => i.category);

  const plan = [
    {
      label:        'Разминка',
      icon:         '🔥',
      tip:          'Лёгкая задача чтобы войти в ритм и размять пальцы.',
      categories:   CATEGORY_KEYS.slice(),
      difficulties: ['easy'],
      mode:         'practice',
    },
    {
      label:        CATEGORY_META[weakTop3[0]]?.title ?? 'Слабая тема',
      icon:         '🎯',
      tip:          'Твоя сейчас слабейшая тема — хорошее место чтобы расти.',
      categories:   weakTop3[0] ? [weakTop3[0]] : CATEGORY_KEYS.slice(),
      difficulties: ['easy', 'medium'],
      mode:         'practice',
    },
    {
      label:        CATEGORY_META[weakTop3[1]]?.title ?? 'Слабая тема',
      icon:         '🎯',
      tip:          'Вторая слабая зона. Не нужно идеально — просто практика.',
      categories:   weakTop3[1] ? [weakTop3[1]] : CATEGORY_KEYS.slice(),
      difficulties: ['medium'],
      mode:         'practice',
    },
    {
      label:        `${CATEGORY_META[weakTop3[0]]?.title ?? 'Тема'} — сложнее`,
      icon:         '💪',
      tip:          'Та же слабая тема, но сложнее. Закрепляем понимание.',
      categories:   weakTop3[0] ? [weakTop3[0]] : CATEGORY_KEYS.slice(),
      difficulties: ['medium', 'hard'],
      mode:         'practice',
    },
  ];

  // Добавляем повторение если есть просроченные
  if (snapshot.dueItems.length > 0) {
    const due = snapshot.dueItems[0];
    plan.push({
      label:        `Повторение: ${CATEGORY_META[due.category]?.title ?? due.category}`,
      icon:         '🔄',
      tip:          'Эта тема ждёт повторения — лучший момент закрепить.',
      categories:   [due.category],
      difficulties: DIFFICULTIES.slice(),
      mode:         'review',
    });
  }

  return plan;
}

function renderSessionBar() {
  const { session } = state;
  if (!session.active || !els.sessionBar) return;

  const step  = session.plan[session.index] || session.plan[session.plan.length - 1];
  const total = session.plan.length;
  const done  = session.index;

  if (els.sessionLabel)  els.sessionLabel.textContent  = `${step?.icon ?? ''} ${step?.label ?? ''}`;
  if (els.sessionCounter) els.sessionCounter.textContent = `${done + 1} из ${total}`;
  if (els.sessionTip)    els.sessionTip.textContent    = step?.tip ?? '';

  if (els.sessionDots) {
    els.sessionDots.innerHTML = session.plan.map((_, i) => {
      const result = session.results[i];
      const cls = result
        ? (result.skipped ? 'skipped' : 'done')
        : i === done ? 'active' : '';
      return `<div class="session-dot ${cls}" title="${session.plan[i].label}"></div>`;
    }).join('');
  }

  els.sessionBar.classList.remove('hidden');
}

function hideSessionBar() {
  els.sessionBar?.classList.add('hidden');
}

async function startSession() {
  const plan = buildTodaySession();
  state.session = { active: true, plan, index: 0, results: [], startedAt: Date.now() };
  renderSessionBar();
  const step = plan[0];
  await generateTask(step.mode, {
    categories:   step.categories,
    difficulties: step.difficulties,
  });
}

async function advanceSession(solved, skipped = false) {
  const { session } = state;
  if (!session.active) return;

  // Record result for current step
  const step = session.plan[session.index];
  session.results.push({
    label:    step?.label ?? '',
    icon:     step?.icon ?? '',
    category: state.currentTask?.category ?? '',
    solved,
    skipped,
    timeMs:   state.taskStartedAt ? Date.now() - state.taskStartedAt : 0,
  });

  session.index += 1;

  if (session.index >= session.plan.length) {
    // Session complete
    showSessionSummary();
    return;
  }

  renderSessionBar();
  const next = session.plan[session.index];
  await generateTask(next.mode, {
    categories:   next.categories,
    difficulties: next.difficulties,
  });
}

function showSessionSummary() {
  if (!els.sessionSummaryOverlay) return;
  state.session.active = false;
  hideSessionBar();

  // If this was a diagnostic session, show diagnostic results instead
  if (state.diagnosticActive) {
    showDiagnosticResultInSummary();
  }

  const { results, startedAt } = state.session;
  const totalMs   = Date.now() - (startedAt ?? Date.now());
  const solvedN   = results.filter((r) => r.solved).length;
  const skippedN  = results.filter((r) => r.skipped).length;
  const totalMins = Math.round(totalMs / 60000);

  // Title
  if (els.sessionSummaryTitle) {
    els.sessionSummaryTitle.textContent =
      solvedN === results.length ? 'Отличная работа!' :
      solvedN > 0 ? 'Хорошая тренировка!' : 'Тренировка завершена.';
  }

  // Stats
  if (els.sessionSummaryStats) {
    els.sessionSummaryStats.innerHTML = `
      <div class="session-stat">
        <div class="session-stat-value">${solvedN}/${results.length}</div>
        <div class="session-stat-label">Решено</div>
      </div>
      <div class="session-stat">
        <div class="session-stat-value">${totalMins > 0 ? totalMins : '< 1'}</div>
        <div class="session-stat-label">Минут</div>
      </div>
      <div class="session-stat">
        <div class="session-stat-value">${skippedN}</div>
        <div class="session-stat-label">Пропущено</div>
      </div>
    `;
  }

  // Results list
  if (els.sessionSummaryList) {
    els.sessionSummaryList.innerHTML = results.map((r) => `
      <div class="session-result-row ${r.solved ? 'solved' : 'skipped'}">
        <span class="session-result-icon">${r.solved ? '✓' : r.skipped ? '→' : '✗'}</span>
        <div class="session-result-info">
          <div class="session-result-label">${escapeHtml(r.icon)} ${escapeHtml(r.label)}</div>
          <div class="session-result-meta">${escapeHtml(CATEGORY_META[r.category]?.title ?? r.category)} · ${Math.round(r.timeMs / 1000)}с</div>
        </div>
      </div>
    `).join('');
  }

  // Next session suggestion (2.3 — не давить)
  if (els.sessionSummaryNext) {
    const snapshot  = getReviewSnapshotForProgress();
    const nextLabel = snapshot.next
      ? `Следующее повторение: ${CATEGORY_META[snapshot.next.category]?.title ?? snapshot.next.category} · ${snapshot.next.dueLabel}`
      : 'На сегодня достаточно. Возвращайся завтра — прогресс идёт.';
    els.sessionSummaryNext.innerHTML = `<strong>Следующий шаг</strong>${escapeHtml(nextLabel)}`;
  }

  els.sessionSummaryOverlay.classList.remove('hidden');
  els.sessionSummaryOverlay.setAttribute('aria-hidden', 'false');
}

function hideSessionSummary() {
  els.sessionSummaryOverlay?.classList.add('hidden');
  els.sessionSummaryOverlay?.setAttribute('aria-hidden', 'true');
}

// ── Onboarding diagnostic ─────────────────────────────────────────────────────

const DIAGNOSTIC_PLAN = [
  { label: 'Массивы',    categories: ['arrays'],     difficulties: ['easy'] },
  { label: 'Объекты',    categories: ['objects'],     difficulties: ['easy'] },
  { label: 'Функции',    categories: ['functions'],   difficulties: ['easy'] },
  { label: 'Замыкания',  categories: ['closures'],    difficulties: ['easy'] },
  { label: 'Async',      categories: ['async'],       difficulties: ['easy'] },
];

function showOnboardingGoalScreen() {
  if (!els.onboardingScreenGoal || !els.onboardingScreenDiag) return;
  els.onboardingScreenGoal.classList.remove('hidden');
  els.onboardingScreenDiag.classList.add('hidden');
}

function showOnboardingDiagScreen() {
  if (!els.onboardingScreenGoal || !els.onboardingScreenDiag) return;
  els.onboardingScreenGoal.classList.add('hidden');
  els.onboardingScreenDiag.classList.remove('hidden');
}

async function startDiagnosticSession() {
  completeOnboarding();
  state.diagnosticActive = true;
  const plan = DIAGNOSTIC_PLAN.map((step) => ({
    ...step,
    icon: '🔬',
    tip: `Диагностическая задача: ${step.label}`,
    mode: 'practice',
  }));
  state.session = {
    active: true,
    plan,
    index: 0,
    results: [],
    startedAt: Date.now(),
  };
  renderSessionBar();
  const first = plan[0];
  await generateTask(first.mode, { categories: first.categories, difficulties: first.difficulties, randomMode: true });
}

function showDiagnosticResultInSummary() {
  const { results } = state.session;
  const skillResults = DIAGNOSTIC_PLAN.map((step, i) => {
    const r = results[i];
    return { label: step.label, category: step.categories[0], solved: r?.solved ?? false };
  });
  const strong = skillResults.filter((s) => s.solved).map((s) => s.label);
  const weak   = skillResults.filter((s) => !s.solved).map((s) => s.label);

  if (els.sessionSummaryTitle) {
    els.sessionSummaryTitle.textContent = strong.length >= 3 ? 'Хороший уровень!' : 'Диагностика завершена!';
  }
  if (els.sessionSummaryStats) {
    els.sessionSummaryStats.innerHTML = `
      <div class="session-stat"><div class="session-stat-value">${strong.length}/5</div><div class="session-stat-label">Решено</div></div>
      <div class="session-stat"><div class="session-stat-value">${weak.length}</div><div class="session-stat-label">Слабых тем</div></div>
      <div class="session-stat"><div class="session-stat-value">📋</div><div class="session-stat-label">План готов</div></div>
    `;
  }
  if (els.sessionSummaryList) {
    els.sessionSummaryList.innerHTML = skillResults.map((s) => `
      <div class="session-result-row ${s.solved ? 'solved' : 'skipped'}">
        <span class="session-result-icon">${s.solved ? '✓' : '→'}</span>
        <div class="session-result-info">
          <div class="session-result-label">${escapeHtml(s.label)}</div>
          <div class="session-result-meta">${s.solved ? 'Хорошо' : 'Нужна практика'}</div>
        </div>
      </div>
    `).join('');
  }
  if (els.sessionSummaryNext) {
    const focusTopic = weak[0] || strong[0] || 'Массивы';
    els.sessionSummaryNext.innerHTML = `<strong>Первая сессия</strong>Фокус на «${escapeHtml(focusTopic)}» — именно туда пойдут ближайшие задачи.`;
    // Apply weak-topic focus to settings
    if (weak.length > 0) {
      const weakCats = skillResults.filter((s) => !s.solved).map((s) => s.category).filter(Boolean);
      if (weakCats.length > 0) {
        state.settings.selectedCategories = weakCats;
        state.settings.focusCategory = weakCats[0];
        state.settings.randomMode = false;
        saveSettings();
        applySettingsToControls();
      }
    }
  }
  state.diagnosticActive = false;
}

// ── Return after break ────────────────────────────────────────────────────────

const LAST_VISIT_KEY = 'jt.lastVisitAt';

function checkReturnAfterBreak() {
  const last = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
  const now  = Date.now();
  localStorage.setItem(LAST_VISIT_KEY, String(now));
  if (!last || !state.onboarding.completed) return;

  const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  if (daysSince < 7) return;

  showReturnOverlay(daysSince);
}

function showReturnOverlay(days) {
  if (!els.returnOverlay) return;
  if (els.returnTitle)    els.returnTitle.textContent    = days >= 30 ? 'Давно не виделись!' : 'С возвращением!';
  if (els.returnSubtitle) els.returnSubtitle.textContent = `Прошло ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} с последнего захода.`;

  const solved = state.progress.solved || 0;
  const streak = state.progress.bestStreak || 0;
  if (els.returnStats) {
    els.returnStats.innerHTML = `
      <div class="return-stat"><div class="return-stat-value">${solved}</div><div class="return-stat-label">Решено всего</div></div>
      <div class="return-stat"><div class="return-stat-value">${streak}</div><div class="return-stat-label">Лучшая серия</div></div>
      <div class="return-stat"><div class="return-stat-value">${days}д</div><div class="return-stat-label">Перерыв</div></div>
    `;
  }
  els.returnOverlay.classList.remove('hidden');
  els.returnOverlay.setAttribute('aria-hidden', 'false');
}

function hideReturnOverlay() {
  els.returnOverlay?.classList.add('hidden');
  els.returnOverlay?.setAttribute('aria-hidden', 'true');
}

async function startReturnSession() {
  hideReturnOverlay();
  // Easy warm-up: familiar categories (where user has most XP), easy difficulty
  const data = buildSkillGraphData();
  const topCategories = data.items
    .filter((i) => i.count > 0)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 2)
    .map((i) => i.category);
  const cats = topCategories.length > 0 ? topCategories : CATEGORY_KEYS.slice(0, 2);
  await generateTask('practice', { categories: cats, difficulties: ['easy'], randomMode: true });
  setRunStatus(`Добро пожаловать назад! Начнём с того что ты уже знаешь.`, 'success');
}

// ── Progress Report ───────────────────────────────────────────────────────────

function showProgressReport() {
  if (!els.progressReportOverlay) return;

  const summary  = api.getProgressSummary(state.progress);
  const data     = buildSkillGraphData();
  const achieved = api.buildAchievements(state.progress).filter((a) => a.unlocked);

  if (els.progressReportTitle) {
    els.progressReportTitle.textContent = `Уровень ${summary.level} · ${summary.xp} XP`;
  }

  if (els.progressReportBody) {
    const statsHtml = `
      <div class="progress-report-section">
        <div class="progress-report-section-title">Общая статистика</div>
        <div class="session-summary-stats">
          <div class="session-stat"><div class="session-stat-value">${summary.solved}</div><div class="session-stat-label">Решено</div></div>
          <div class="session-stat"><div class="session-stat-value">${summary.accuracy.toFixed(1)}%</div><div class="session-stat-label">Точность</div></div>
          <div class="session-stat"><div class="session-stat-value">${summary.streak}</div><div class="session-stat-label">Серия</div></div>
          <div class="session-stat"><div class="session-stat-value">${formatSolveTime(state.progress.fastestSolveMs)}</div><div class="session-stat-label">Рекорд</div></div>
          <div class="session-stat"><div class="session-stat-value">${summary.bestStreak}</div><div class="session-stat-label">Лучшая серия</div></div>
          <div class="session-stat"><div class="session-stat-value">${formatSolveTime(summary.solved > 0 ? (state.progress.totalSolveTimeMs / summary.solved) : 0)}</div><div class="session-stat-label">Среднее</div></div>
        </div>
      </div>`;

    const catHtml = `
      <div class="progress-report-section">
        <div class="progress-report-section-title">По категориям</div>
        ${data.items.map((item) => {
          const pct = Math.min(100, item.mastery);
          return `
            <div class="progress-category-bar">
              <span style="font-size:0.84rem">${escapeHtml(item.title)}</span>
              <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%;background:${escapeHtml(item.accent)}"></div></div>
              <span class="progress-bar-count">${item.count} реш.</span>
            </div>`;
        }).join('')}
      </div>`;

    const achHtml = achieved.length > 0 ? `
      <div class="progress-report-section">
        <div class="progress-report-section-title">Достижения (${achieved.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${achieved.map((a) => `<span class="skill-node-pill">${escapeHtml(a.title)}</span>`).join('')}
        </div>
      </div>` : '';

    els.progressReportBody.innerHTML = statsHtml + catHtml + achHtml;
  }

  els.progressReportOverlay.classList.remove('hidden');
  els.progressReportOverlay.setAttribute('aria-hidden', 'false');
}

function hideProgressReport() {
  els.progressReportOverlay?.classList.add('hidden');
  els.progressReportOverlay?.setAttribute('aria-hidden', 'true');
}

function exportProgressAsHTML() {
  const summary = api.getProgressSummary(state.progress);
  const data    = buildSkillGraphData();
  const achieved = api.buildAchievements(state.progress).filter((a) => a.unlocked);
  const date    = new Date().toLocaleDateString('ru-RU');

  const html = `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><title>Прогресс — JS Infinite Trainer</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;background:#07090f;color:#eef2ff}
h1{color:#d6b25a;margin-bottom:4px}
.meta{color:#7a8ba6;font-size:.88rem;margin-bottom:28px}
.section{margin-bottom:24px}
.section-title{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#7a8ba6;margin-bottom:10px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.stat{padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);text-align:center;background:rgba(255,255,255,.03)}
.stat-value{font-size:1.4rem;font-weight:900;color:#d6b25a;font-family:monospace}
.stat-label{font-size:.72rem;color:#7a8ba6;text-transform:uppercase;letter-spacing:.07em;margin-top:3px}
.bar-row{display:grid;grid-template-columns:110px 1fr 50px;align-items:center;gap:10px;margin-bottom:8px;font-size:.86rem}
.bar-track{height:6px;border-radius:3px;background:rgba(255,255,255,.08)}
.bar-fill{height:100%;border-radius:inherit;background:#d6b25a}
.bar-count{color:#7a8ba6;font-family:monospace;font-size:.78rem;text-align:right}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:4px 10px;border-radius:999px;background:rgba(214,178,90,.12);border:1px solid rgba(214,178,90,.24);color:#d6b25a;font-size:.78rem}
</style></head><body>
<h1>JS Infinite Trainer</h1>
<p class="meta">Отчёт прогресса · ${date} · Уровень ${summary.level} · ${summary.xp} XP</p>
<div class="section">
  <div class="section-title">Статистика</div>
  <div class="stats">
    <div class="stat"><div class="stat-value">${summary.solved}</div><div class="stat-label">Решено</div></div>
    <div class="stat"><div class="stat-value">${summary.accuracy.toFixed(1)}%</div><div class="stat-label">Точность</div></div>
    <div class="stat"><div class="stat-value">${summary.bestStreak}</div><div class="stat-label">Лучшая серия</div></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Навыки по категориям</div>
  ${data.items.map((i) => `<div class="bar-row"><span>${i.title}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,i.mastery)}%;background:${i.accent}"></div></div><span class="bar-count">${i.count} реш.</span></div>`).join('')}
</div>
${achieved.length > 0 ? `<div class="section"><div class="section-title">Достижения</div><div class="chips">${achieved.map((a) => `<span class="chip">${a.title}</span>`).join('')}</div></div>` : ''}
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `jstrainer-progress-${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── AI Hints ──────────────────────────────────────────────────────────────────

let _aiHintLoading = false;

function showAiHintPanel() {
  if (!els.aiHintPanel) return;
  els.aiHintPanel.classList.remove('hidden');
  if (els.aiHintResult) els.aiHintResult.classList.add('hidden');
}

function hideAiHintPanel() {
  els.aiHintPanel?.classList.add('hidden');
}

async function requestAiHint() {
  if (_aiHintLoading || !state.currentTask || !state.currentReport) return;
  _aiHintLoading = true;
  if (els.aiHintBtn) els.aiHintBtn.disabled = true;

  if (els.aiHintResult) {
    els.aiHintResult.classList.remove('hidden');
    els.aiHintResult.innerHTML = '<span class="ai-hint-loading">✨ Думаю...</span>';
  }

  // Not logged in — show auth prompt
  if (!isLoggedIn()) {
    if (els.aiHintResult) els.aiHintResult.textContent = 'Войди в аккаунт чтобы получить AI-подсказку (кнопка ☁ в профиле).';
    _aiHintLoading = false;
    if (els.aiHintBtn) els.aiHintBtn.disabled = false;
    return;
  }

  try {
    const failedTest = Array.isArray(state.currentReport?.tests)
      ? state.currentReport.tests.find((t) => !t.passed)
      : null;

    const res = await apiFetch('/ai/hint', {
      method: 'POST',
      body:   JSON.stringify({
        taskTitle:      state.currentTask.title,
        taskPrompt:     state.currentTask.prompt,
        signature:      state.currentTask.signature,
        language:       state.currentTask.editorLanguage || 'javascript',
        userCode:       getEditorValue(),
        error:          state.currentReport.error || '',
        failedInput:    failedTest?.input,
        failedExpected: failedTest?.expected,
        failedActual:   failedTest?.actual,
      }),
    });

    const d = await res.json().catch(() => ({}));

    if (res.status === 503 && d.code === 'AI_NOT_CONFIGURED') {
      if (els.aiHintResult) els.aiHintResult.textContent = 'AI пока не настроен. Владелец приложения должен добавить ANTHROPIC_API_KEY в Railway.';
      return;
    }

    if (!res.ok) throw new Error(d.message || `HTTP ${res.status}`);

    if (els.aiHintResult) els.aiHintResult.textContent = d.hint || 'Нет ответа от ИИ.';
  } catch (err) {
    if (els.aiHintResult) els.aiHintResult.textContent = `Не удалось получить подсказку: ${err.message}`;
  } finally {
    _aiHintLoading = false;
    if (els.aiHintBtn) els.aiHintBtn.disabled = false;
  }
}

// ── AI Breakdown (post-success) ───────────────────────────────────────────────

let _breakdownLoading = false;

async function requestAiBreakdown(task) {
  if (_breakdownLoading || !task || !isLoggedIn()) return;
  _breakdownLoading = true;

  if (els.aiBreakdownPanel) {
    els.aiBreakdownPanel.classList.remove('hidden');
    if (els.aiBreakdownBody) els.aiBreakdownBody.innerHTML = '<span class="ai-hint-loading">✨ Анализирую решение...</span>';
  }

  try {
    const res = await apiFetch('/ai/breakdown', {
      method: 'POST',
      body:   JSON.stringify({
        taskTitle:    task.title,
        taskPrompt:   task.prompt,
        signature:    task.signature,
        language:     task.editorLanguage || 'javascript',
        userSolution: getEditorValue(),
        category:     task.category,
        strategy:     task.strategy,
      }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (res.status === 503 && d.code === 'AI_NOT_CONFIGURED') {
        if (els.aiBreakdownBody) els.aiBreakdownBody.innerHTML =
          '<div class="ai-breakdown-item"><div class="ai-breakdown-item-text" style="color:var(--muted);font-size:0.84rem">AI-разбор заработает как только будет добавлен ANTHROPIC_API_KEY.</div></div>';
        return;
      }
      throw new Error(d.message || `HTTP ${res.status}`);
    }

    const { breakdown } = await res.json();
    if (!breakdown || !els.aiBreakdownBody) return;

    els.aiBreakdownBody.innerHTML = [
      breakdown.concept    ? `<div class="ai-breakdown-item"><div class="ai-breakdown-item-label">Что применил</div><div class="ai-breakdown-item-text">${escapeHtml(breakdown.concept)}</div></div>` : '',
      breakdown.whyItWorks ? `<div class="ai-breakdown-item"><div class="ai-breakdown-item-label">Почему работает</div><div class="ai-breakdown-item-text">${escapeHtml(breakdown.whyItWorks)}</div></div>` : '',
      breakdown.edgeCases  ? `<div class="ai-breakdown-item"><div class="ai-breakdown-item-label">Edge cases</div><div class="ai-breakdown-item-text">${escapeHtml(breakdown.edgeCases)}</div></div>` : '',
      breakdown.nextStep   ? `<div class="ai-breakdown-item"><div class="ai-breakdown-item-label">Что дальше</div><div class="ai-breakdown-item-text">${escapeHtml(breakdown.nextStep)}</div></div>` : '',
    ].filter(Boolean).join('');
  } catch {
    els.aiBreakdownPanel?.classList.add('hidden');
  } finally {
    _breakdownLoading = false;
  }
}

// ── Challenges ────────────────────────────────────────────────────────────────

const CHALLENGE_DEFS = [
  { id: 'arrays-7d',    emoji: '📦', name: '7 дней массивов',          desc: 'filter, map, reduce — каждый день одна задача',             days: 7,  categories: ['arrays'],              dailyGoal: 1 },
  { id: 'js-14d',       emoji: '⚡', name: '14 дней JavaScript core',   desc: 'Функции, замыкания, async — базовый JS за 2 недели',        days: 14, categories: ['functions','closures','async'], dailyGoal: 1 },
  { id: 'junior-30d',   emoji: '🎯', name: '30 дней до уверенного junior', desc: 'Все категории, нарастающая сложность — месяц до результата', days: 30, categories: null, dailyGoal: 2 },
  { id: 'async-7d',     emoji: '🔄', name: 'Async без боли',            desc: 'Promise, await, race, retry — 7 дней чистого async',        days: 7,  categories: ['async'],               dailyGoal: 1 },
  { id: 'algo-10d',     emoji: '🧮', name: 'Алгоритмы для тех кто боится', desc: '10 дней — алгоритмы станут понятны',                      days: 10, categories: ['algorithms'],          dailyGoal: 1 },
];

const CHALLENGES_KEY = 'jt.challenges.v1';

function loadChallenges() {
  try { return JSON.parse(localStorage.getItem(CHALLENGES_KEY) || '{}'); }
  catch { return {}; }
}

function saveChallenges(data) {
  localStorage.setItem(CHALLENGES_KEY, JSON.stringify(data));
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getChallengeProgress(challenges, id) {
  return challenges[id] || null;
}

function startChallenge(id) {
  const challenges = loadChallenges();
  if (challenges[id]?.completedAt) return; // already done
  challenges[id] = { startedAt: Date.now(), completedDays: [], completedAt: null };
  saveChallenges(challenges);
}

function markChallengeDay(id) {
  const challenges = loadChallenges();
  const ch = challenges[id];
  if (!ch || ch.completedAt) return;
  const today = todayStr();
  if (!ch.completedDays.includes(today)) {
    ch.completedDays.push(today);
    const def = CHALLENGE_DEFS.find((d) => d.id === id);
    if (def && ch.completedDays.length >= def.days) {
      ch.completedAt = Date.now();
    }
    saveChallenges(challenges);
  }
}

function getActiveChallengeId() {
  const challenges = loadChallenges();
  for (const def of CHALLENGE_DEFS) {
    const ch = challenges[def.id];
    if (ch && !ch.completedAt) return def.id;
  }
  return null;
}

function renderChallengesOverlay() {
  if (!els.challengesList) return;
  const challenges = loadChallenges();
  const activeId = getActiveChallengeId();

  // Active challenge bar
  if (activeId && els.activeChallengeBar) {
    const def = CHALLENGE_DEFS.find((d) => d.id === activeId);
    const ch  = challenges[activeId];
    const done = ch?.completedDays?.length ?? 0;
    const today = todayStr();
    const doneToday = ch?.completedDays?.includes(today);
    els.activeChallengeBar.classList.remove('hidden');
    els.activeChallengeBar.innerHTML = `
      <div class="active-challenge-bar-top">
        <span class="active-challenge-name">${def?.emoji} ${escapeHtml(def?.name ?? '')}</span>
        <span class="active-challenge-days">День ${done}/${def?.days}</span>
      </div>
      <div class="active-challenge-dots">
        ${Array.from({ length: def?.days ?? 0 }, (_, i) => {
          const dayDate = new Date((ch?.startedAt ?? Date.now()) + i * 86400000).toISOString().slice(0, 10);
          const isDone  = ch?.completedDays?.includes(dayDate);
          const isToday = i === done && !doneToday;
          return `<div class="challenge-day-dot ${isDone ? 'done' : isToday ? 'today' : ''}">${isDone ? '✓' : i + 1}</div>`;
        }).join('')}
      </div>
      ${doneToday ? '<span style="font-size:0.82rem;color:var(--accent-3)">✓ Сегодня выполнено</span>' : '<span style="font-size:0.82rem;color:var(--muted)">Реши задачи чтобы закрыть день</span>'}
    `;
  } else {
    els.activeChallengeBar?.classList.add('hidden');
  }

  // Challenge list
  els.challengesList.innerHTML = CHALLENGE_DEFS.map((def) => {
    const ch = challenges[def.id];
    const done = ch?.completedDays?.length ?? 0;
    const isActive = def.id === activeId;
    const isCompleted = Boolean(ch?.completedAt);
    return `
      <div class="challenge-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
        <div class="challenge-card-top">
          <span class="challenge-emoji">${def.emoji}</span>
          <div class="challenge-card-info">
            <div class="challenge-card-name">${escapeHtml(def.name)}</div>
            <div class="challenge-card-desc">${escapeHtml(def.desc)}</div>
          </div>
          <span class="challenge-badge ${isCompleted ? 'challenge-badge-done' : 'challenge-badge-days'}">
            ${isCompleted ? '✓ Готово' : isActive ? `${done}/${def.days}д` : `${def.days}д`}
          </span>
        </div>
        ${!isActive && !isCompleted ? `<button class="button button-primary challenge-start-btn" data-start-challenge="${def.id}" type="button">Начать</button>` : ''}
        ${isActive ? `<button class="button button-secondary challenge-start-btn" data-stop-challenge="${def.id}" type="button">Прекратить</button>` : ''}
      </div>
    `;
  }).join('');
}

function showChallengesOverlay() {
  renderChallengesOverlay();
  els.challengesOverlay?.classList.remove('hidden');
  els.challengesOverlay?.setAttribute('aria-hidden', 'false');
}

function hideChallengesOverlay() {
  els.challengesOverlay?.classList.add('hidden');
  els.challengesOverlay?.setAttribute('aria-hidden', 'true');
}

// Check if current solve should mark challenge day
function checkChallengeDay(task) {
  const activeId = getActiveChallengeId();
  if (!activeId) return;
  const def = CHALLENGE_DEFS.find((d) => d.id === activeId);
  if (!def) return;
  const catMatch = !def.categories || def.categories.includes(task?.category);
  if (catMatch) markChallengeDay(activeId);
}

// ── Personal Goals ────────────────────────────────────────────────────────────

const GOAL_DEFS = [
  { id: 'time-15',     icon: '⏱',  name: '15 минут в день',        desc: 'Короткие сессии — лучший способ не бросить', type: 'time', value: 15 },
  { id: 'tasks-3',     icon: '✅',  name: '3 задачи в день',         desc: 'Три решённых задачи — понятный ориентир',    type: 'tasks', value: 3  },
  { id: 'topic-async', icon: '🔄',  name: 'Закрыть async за неделю', desc: 'Фокус на одной теме пока не станет уверенно', type: 'topic', value: 'async' },
  { id: 'interview',   icon: '💼',  name: 'Готовлюсь к собеседованию', desc: 'Алгоритмы и паттерны — курс на сложные задачи', type: 'interview', value: 'hard' },
  { id: 'relaxed',     icon: '🌿',  name: 'Свободная практика',      desc: 'Без целей и дедлайнов — просто тренируюсь',  type: 'free', value: null },
];

const GOAL_KEY = 'jt.goal.v1';

function loadGoal() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY) || 'null'); }
  catch { return null; }
}

function saveGoal(goal) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

function clearGoal() {
  localStorage.removeItem(GOAL_KEY);
}

function getGoalStatusText() {
  const goal = loadGoal();
  if (!goal) return null;
  const def = GOAL_DEFS.find((d) => d.id === goal.id);
  if (!def) return null;

  const today = new Date().toLocaleDateString('sv-SE');
  const solved = state.progress.solved || 0;
  const timeMs = state.progress.totalSolveTimeMs || 0;

  if (def.type === 'time') {
    const todayTimeMs = Number(localStorage.getItem(`jt.goal.timeToday.${today}`) || 0);
    const pct = Math.min(100, Math.round((todayTimeMs / (def.value * 60000)) * 100));
    return `${def.icon} ${def.name}: ${Math.round(todayTimeMs / 60000)}/${def.value} мин (${pct}%)`;
  }
  if (def.type === 'tasks') {
    const todayTasks = Number(localStorage.getItem(`jt.goal.tasksToday.${today}`) || 0);
    return `${def.icon} ${def.name}: ${todayTasks}/${def.value} задач сегодня`;
  }
  return `${def.icon} ${def.name} — активна`;
}

function applyGoalToSettings(goal) {
  if (!goal) return;
  const def = GOAL_DEFS.find((d) => d.id === goal.id);
  if (!def) return;
  if (def.type === 'topic') {
    state.settings.selectedCategories = [def.value];
    state.settings.focusCategory = def.value;
    state.settings.randomMode = false;
    saveSettings();
    applySettingsToControls();
  }
  if (def.type === 'interview') {
    state.settings.selectedDifficulties = ['medium', 'hard'];
    state.settings.selectedCategories = ['algorithms', 'functions', 'arrays'];
    saveSettings();
    applySettingsToControls();
  }
}

function trackGoalProgress(task) {
  const goal = loadGoal();
  if (!goal) return;
  const def = GOAL_DEFS.find((d) => d.id === goal.id);
  if (!def) return;
  const today = new Date().toLocaleDateString('sv-SE');
  if (def.type === 'tasks') {
    const key = `jt.goal.tasksToday.${today}`;
    localStorage.setItem(key, String(Number(localStorage.getItem(key) || 0) + 1));
  }
  if (def.type === 'time' && state.taskStartedAt) {
    const elapsed = Date.now() - state.taskStartedAt;
    const key = `jt.goal.timeToday.${today}`;
    localStorage.setItem(key, String(Number(localStorage.getItem(key) || 0) + elapsed));
  }
}

function renderGoalsOverlay() {
  if (!els.goalsList) return;
  const current = loadGoal();

  els.goalsList.innerHTML = GOAL_DEFS.map((def) => {
    const isActive = current?.id === def.id;
    return `
      <button class="goal-option ${isActive ? 'active' : ''}" data-goal-id="${escapeHtml(def.id)}" type="button">
        <span class="goal-option-icon">${def.icon}</span>
        <div class="goal-option-info">
          <div class="goal-option-name">${escapeHtml(def.name)}</div>
          <div class="goal-option-desc">${escapeHtml(def.desc)}</div>
        </div>
      </button>
    `;
  }).join('');

  const status = getGoalStatusText();
  if (status && els.activeGoalStatus) {
    els.activeGoalStatus.innerHTML = `<strong>Сегодня</strong>${escapeHtml(status)}`;
    els.activeGoalStatus.classList.remove('hidden');
  } else {
    els.activeGoalStatus?.classList.add('hidden');
  }

  if (els.goalsClearBtn) {
    els.goalsClearBtn.classList.toggle('hidden', !current);
  }
}

function showGoalsOverlay() {
  renderGoalsOverlay();
  els.goalsOverlay?.classList.remove('hidden');
  els.goalsOverlay?.setAttribute('aria-hidden', 'false');
}

function hideGoalsOverlay() {
  els.goalsOverlay?.classList.add('hidden');
  els.goalsOverlay?.setAttribute('aria-hidden', 'true');
}

// ── Account modal ─────────────────────────────────────────────────────────────

async function showAccountModal() {
  if (!els.accountOverlay) return;

  const email = getStoredEmail() || '—';
  const plan  = getStoredPlan();
  const isPr  = plan !== 'free';

  // Avatar: first letter of email
  if (els.accountAvatar)   els.accountAvatar.textContent  = email[0]?.toUpperCase() ?? '?';
  if (els.accountEmail)    els.accountEmail.textContent   = email;
  if (els.accountPlanBadge) {
    els.accountPlanBadge.textContent = isPr ? 'Pro' : 'Free';
    els.accountPlanBadge.className   = 'account-plan-badge' + (isPr ? ' pro' : '');
  }

  if (els.accountSyncStatus) {
    const dot = els.authSyncDot?.className ?? '';
    els.accountSyncStatus.textContent =
      dot.includes('syncing') ? 'Синхронизируется…' :
      dot.includes('error')   ? 'Ошибка' : 'Синхронизировано ✓';
  }

  // Show/hide plan-specific buttons
  els.accountUpgradeBtn?.classList.toggle('hidden', isPr);
  els.accountPortalBtn?.classList.toggle('hidden', !isPr);

  // Sub end date — fetch only if Pro
  if (els.accountSubRow) els.accountSubRow.style.display = 'none';
  if (isPr) {
    try {
      const status = await getBillingStatus();
      if (status?.subscription?.currentPeriodEnd) {
        const d = new Date(status.subscription.currentPeriodEnd);
        if (els.accountSubEnd) els.accountSubEnd.textContent = d.toLocaleDateString('ru-RU');
        if (els.accountSubRow) els.accountSubRow.style.display = 'flex';
      }
    } catch { /* offline — skip */ }
  }

  els.accountOverlay.classList.remove('hidden');
  els.accountOverlay.setAttribute('aria-hidden', 'false');
}

function hideAccountModal() {
  if (!els.accountOverlay) return;
  els.accountOverlay.classList.add('hidden');
  els.accountOverlay.setAttribute('aria-hidden', 'true');
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function showLeaderboard() {
  if (!els.leaderboardOverlay) return;
  if (!isLoggedIn()) {
    showAuthOverlay();
    return;
  }
  if (!isPro()) {
    showUpgradeOverlay();
    return;
  }
  els.leaderboardOverlay.classList.remove('hidden');
  els.leaderboardOverlay.setAttribute('aria-hidden', 'false');

  const kernelId = ACTIVE_KERNEL_ID;
  if (els.leaderboardTitle)    els.leaderboardTitle.textContent  = `Лидерборд — ${ACTIVE_KERNEL_INFO.title}`;
  if (els.leaderboardSubtitle) els.leaderboardSubtitle.textContent = 'Загружаю…';
  if (els.leaderboardList)     els.leaderboardList.innerHTML = '<div class="theory-loading">Загружаю…</div>';

  const data = await fetchLeaderboard(kernelId);

  if (!data || !data.entries?.length) {
    if (els.leaderboardList) els.leaderboardList.innerHTML = '<div class="theory-empty">Пока нет данных. Реши несколько задач, чтобы появиться в таблице.</div>';
    if (els.leaderboardSubtitle) els.leaderboardSubtitle.textContent = 'Нет данных';
    return;
  }

  if (els.leaderboardSubtitle) {
    const yourRank = data.callerRank;
    els.leaderboardSubtitle.textContent = yourRank ? `Твой ранг: #${yourRank}` : `Топ ${data.entries.length}`;
  }

  const rankClass = (r) => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
  const rankIcon  = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  if (els.leaderboardList) {
    els.leaderboardList.innerHTML = data.entries.map((e) => `
      <div class="leaderboard-row ${e.isYou ? 'is-you' : ''} ${e.rank <= 3 ? 'rank-top3' : ''}">
        <span class="leaderboard-rank ${rankClass(e.rank)}">${rankIcon(e.rank)}</span>
        <span class="leaderboard-name">${escapeHtml(e.displayName)}${e.isYou ? ' <span class="leaderboard-you-badge">ты</span>' : ''}</span>
        <span class="leaderboard-xp">${e.xp} XP</span>
        <span class="leaderboard-solved">${e.solved} реш.</span>
      </div>
    `).join('');
  }
}

function hideLeaderboard() {
  if (!els.leaderboardOverlay) return;
  els.leaderboardOverlay.classList.add('hidden');
  els.leaderboardOverlay.setAttribute('aria-hidden', 'true');
}

// ── Kernel lock — все языки бесплатны, Pro = онлайн-фичи ─────────────────────

function applyKernelLocks() {
  // Все ядра доступны бесплатно — ничего не блокируем
}

async function setupEditorInteractions() {
  bindEditorBridge();

  if (codeEditorInstance) {
    return;
  }

  const monaco = await loadMonaco();
  registerPythonLanguage(monaco);

  monaco.editor.defineTheme(EDITOR_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'e5eefb' },
      { token: 'comment', foreground: '7f92b2', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7dd3fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fbbf24' }
    ],
    colors: {
      'editor.background': '#060a14',
      'editor.foreground': '#e5eefb',
      'editor.lineHighlightBackground': '#101828',
      'editorCursor.foreground': '#7dd3fc',
      'editorLineNumber.foreground': '#64748b',
      'editorLineNumber.activeForeground': '#cbd5e1',
      'editor.selectionBackground': '#21406a',
      'editor.inactiveSelectionBackground': '#18304d',
      'editorIndentGuide.background1': '#23324a',
      'editorIndentGuide.activeBackground1': '#355074',
      'editorWhitespace.foreground': '#314560'
    }
  });

  codeEditorInstance = monaco.editor.create(els.codeEditor, {
    value: '',
    language: getEditorLanguageId(),
    theme: EDITOR_THEME,
    automaticLayout: false,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    renderWhitespace: 'selection',
    smoothScrolling: true,
    padding: { top: 14, bottom: 20 },
    lineNumbersMinChars: 2,
    bracketPairColorization: { enabled: true },
    cursorSmoothCaretAnimation: 'on',
    guides: { indentation: true },
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'auto',
      alwaysConsumeMouseWheel: false,
      handleMouseWheel: false
    },
    overviewRulerLanes: 0,
    overviewRulerBorder: false
  });

  const MIN_EDITOR_HEIGHT = 300;

  function updateEditorHeight() {
    const contentHeight = Math.max(MIN_EDITOR_HEIGHT, codeEditorInstance.getContentHeight());
    els.codeEditor.style.height = `${contentHeight}px`;
    if (els.codeEditor.parentElement) {
      els.codeEditor.parentElement.style.height = `${contentHeight}px`;
    }
    codeEditorInstance.layout({ width: els.codeEditor.offsetWidth, height: contentHeight });
  }

  codeEditorInstance.onDidContentSizeChange(updateEditorHeight);
  updateEditorHeight();

  codeEditorFallbackValue = '';
  syncEditorLanguage(getEditorLanguageId());
  codeEditorInstance.onDidChangeModelContent(() => {
    codeEditorFallbackValue = codeEditorInstance.getValue();
    storeCurrentDraft();
  });
  codeEditorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runCurrentTask();
  });
}

function setupControlListeners() {
  bindOverflowMenus();

  if (els.kernelSelect) {
    els.kernelSelect.addEventListener('change', () => {
      const nextKernelId = els.kernelSelect.value;
      if (nextKernelId === ACTIVE_KERNEL_ID) {
        return;
      }

      const nextKernel = KERNELS.find((kernel) => kernel.id === nextKernelId);
      if (!nextKernel || !nextKernel.available) {
        renderKernelOptions();
        return;
      }

      storeCurrentDraft();
      saveSettings();
      saveProgress();
      saveCustomTasks();
      saveDrafts();
      saveJson(KERNEL_STORAGE_KEY, nextKernelId);
      window.location.reload();
    });
  }

  els.randomModeCheckbox.addEventListener('change', () => {
    updateSettingsFromControls();
    syncFocusControls();
  });
  els.infiniteModeCheckbox.addEventListener('change', updateSettingsFromControls);
  els.autoHintCheckbox.addEventListener('change', updateSettingsFromControls);
  els.focusCategorySelect.addEventListener('change', updateSettingsFromControls);
  els.focusDifficultySelect.addEventListener('change', updateSettingsFromControls);

  els.generateTaskBtn.addEventListener('click', () => generateTask('practice'));
  if (els.reviewChallengeBtn) {
    els.reviewChallengeBtn.addEventListener('click', () => generateTask('review'));
  }
  els.dailyChallengeBtn.addEventListener('click', () => startSession());
  els.bossChallengeBtn.addEventListener('click', () => generateTask('boss'));
  els.nextTaskBtn.addEventListener('click', () => {
    if (state.session.active) {
      void advanceSession(false, true);
    } else {
      generateTask(state.currentMode || 'practice');
    }
  });
  els.runTestsBtn.addEventListener('click', runCurrentTask);
  els.resetCodeBtn.addEventListener('click', resetEditor);
  els.showHintBtn.addEventListener('click', () => showNextHint(false));
  els.showAnswerBtn.addEventListener('click', toggleAnswer);
  if (els.openTheoryBtn) {
    els.openTheoryBtn.addEventListener('click', () => showTheoryDrawer(THEORY_DEFAULT_TOPIC_ID));
  }
  els.copyStarterBtn.addEventListener('click', copyStarterCode);
  els.fillTemplateBtn.addEventListener('click', fillCustomTemplate);
  els.exportCustomTasksBtn.addEventListener('click', exportCustomTasksToJson);
  els.importCustomTasksBtn.addEventListener('click', () => {
    els.customTasksImportInput.value = '';
    els.customTasksImportInput.click();
  });
  els.customTasksImportInput.addEventListener('change', async () => {
    const [file] = els.customTasksImportInput.files || [];
    if (!file) {
      return;
    }
    try {
      await importCustomTasksFromFile(file);
    } catch (error) {
      setRunStatus(error.message || 'Не удалось импортировать JSON.', 'danger');
    } finally {
      els.customTasksImportInput.value = '';
    }
  });
  els.customTaskForm.addEventListener('submit', saveCustomTaskFromForm);

  if (els.profileToggle) {
    const activateProfileToggle = () => toggleProfilePanel();
    els.profileToggle.addEventListener('click', activateProfileToggle);
    els.profileToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateProfileToggle();
      }
    });
  }

  if (els.skillsToggle) {
    const activateSkillsToggle = () => toggleSkillsPanel();
    els.skillsToggle.addEventListener('click', activateSkillsToggle);
    els.skillsToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateSkillsToggle();
      }
    });
  }

  if (els.skillGraphList) {
    els.skillGraphList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-skill-train]');
      if (!button) {
        return;
      }
      startSkillSession(button.dataset.skillTrain);
    });
  }

  if (els.theoryBackdrop) {
    els.theoryBackdrop.addEventListener('click', () => {
      hideTheoryDrawer({ focusPractice: true });
    });
  }

  if (els.theoryPracticeBtn) {
    els.theoryPracticeBtn.addEventListener('click', () => {
      returnToPracticeFromTheory();
    });
  }

  if (els.theoryCloseBtn) {
    els.theoryCloseBtn.addEventListener('click', () => {
      hideTheoryDrawer({ focusPractice: true });
    });
  }

  if (els.theoryNav) {
    els.theoryNav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-theory-topic]');
      if (!button) {
        return;
      }
      const topicId = button.dataset.theoryTopic || THEORY_DEFAULT_TOPIC_ID;
      state.theoryTopicId = topicId;
      void renderTheoryDrawer(topicId);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (state.theoryOpen && event.key === 'Escape') {
      hideTheoryDrawer({ focusPractice: true });
    }
  });

  if (els.startOnboardingBtn) {
    els.startOnboardingBtn.addEventListener('click', startGuidedSession);
  }

  if (els.skipOnboardingBtn) {
    els.skipOnboardingBtn.addEventListener('click', () => {
      applyStarterPreset();
      completeOnboarding();
      setRunStatus('Можно менять навыки и сложность вручную.', 'neutral');
      generateTask('practice');
    });
  }

  if (els.shareSeedBtn) {
    els.shareSeedBtn.disabled = true;
    els.shareSeedBtn.addEventListener('click', () => shareSeed());
  }

  if (els.exportProgressBtn) {
    els.exportProgressBtn.addEventListener('click', () => exportProgress());
  }

  if (els.importProgressBtn) {
    els.importProgressBtn.addEventListener('click', () => {
      if (els.importProgressInput) {
        els.importProgressInput.value = '';
        els.importProgressInput.click();
      }
    });
  }

  if (els.importProgressInput) {
    els.importProgressInput.addEventListener('change', async () => {
      const [file] = els.importProgressInput.files || [];
      if (!file) return;
      try {
        await importProgressFromFile(file);
      } catch (error) {
        setRunStatus(error.message || 'Не удалось импортировать прогресс.', 'danger');
      } finally {
        els.importProgressInput.value = '';
      }
    });
  }

  // ── Auth listeners ────────────────────────────────────────────────────────

  els.authOpenBtn?.addEventListener('click', () => {
    setAuthMode('login');
    showAuthOverlay();
  });

  els.authSkipBtn?.addEventListener('click', hideAuthOverlay);

  els.authTabLogin?.addEventListener('click',    () => setAuthMode('login'));
  els.authTabRegister?.addEventListener('click', () => setAuthMode('register'));

  els.authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = els.authEmail?.value.trim()    ?? '';
    const password = els.authPassword?.value.trim() ?? '';

    if (!email || !password) return;

    if (els.authSubmitBtn) els.authSubmitBtn.disabled = true;
    if (els.authError)     els.authError.classList.add('hidden');

    try {
      if (_authMode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      hideAuthOverlay();
      renderAuthStatus();
      applyKernelLocks();
      setRunStatus('Аккаунт подключён. Синхронизируем прогресс…', 'success');
      await pullFromCloud();
      setRunStatus('Прогресс синхронизирован.', 'success');
    } catch (err) {
      if (els.authError) {
        els.authError.textContent = err.message || 'Что-то пошло не так';
        els.authError.classList.remove('hidden');
      }
    } finally {
      if (els.authSubmitBtn) els.authSubmitBtn.disabled = false;
    }
  });

  // ── Account modal ─────────────────────────────────────────────────────────

  els.accountOpenBtn?.addEventListener('click', () => showAccountModal());
  els.accountCloseBtn?.addEventListener('click', hideAccountModal);

  els.accountLogoutBtn?.addEventListener('click', async () => {
    const rt = localStorage.getItem('jt.auth.refreshToken') ?? '';
    await logout(rt);
    hideAccountModal();
    renderAuthStatus();
    setSyncDot('ok');
    setRunStatus('Вышли из аккаунта.', 'neutral');
  });

  els.accountRefreshPlanBtn?.addEventListener('click', async () => {
    if (els.accountRefreshPlanBtn) els.accountRefreshPlanBtn.disabled = true;
    try {
      const status = await getBillingStatus();
      if (status?.plan) {
        localStorage.setItem('jt.auth.plan', status.plan);
        renderAuthStatus();
        showAccountModal();
      }
    } catch { /* offline */ } finally {
      if (els.accountRefreshPlanBtn) els.accountRefreshPlanBtn.disabled = false;
    }
  });

  els.accountUpgradeBtn?.addEventListener('click', () => {
    hideAccountModal();
    showUpgradeOverlay();
  });

  els.accountPortalBtn?.addEventListener('click', async () => {
    try {
      await openBillingPortal();
      hideAccountModal();
    } catch (err) {
      setRunStatus(err.message, 'danger');
    }
  });

  els.accountLeaderboardBtn?.addEventListener('click', () => {
    hideAccountModal();
    showLeaderboard();
  });

  // ── Upgrade modal ─────────────────────────────────────────────────────────

  els.upgradeOpenBtn?.addEventListener('click', showUpgradeOverlay);
  els.upgradeCloseBtn?.addEventListener('click', hideUpgradeOverlay);

  els.upgradeCheckoutBtn?.addEventListener('click', async () => {
    if (els.upgradeError) els.upgradeError.classList.add('hidden');
    if (els.upgradeCheckoutBtn) els.upgradeCheckoutBtn.disabled = true;
    try {
      await startCheckout();
      setRunStatus('Страница оплаты открыта в браузере.', 'neutral');
      hideUpgradeOverlay();
    } catch (err) {
      if (els.upgradeError) {
        els.upgradeError.textContent = err.message;
        els.upgradeError.classList.remove('hidden');
      }
    } finally {
      if (els.upgradeCheckoutBtn) els.upgradeCheckoutBtn.disabled = false;
    }
  });

  els.upgradePortalBtn?.addEventListener('click', async () => {
    try {
      await openBillingPortal();
      hideUpgradeOverlay();
    } catch (err) {
      if (els.upgradeError) {
        els.upgradeError.textContent = err.message;
        els.upgradeError.classList.remove('hidden');
      }
    }
  });

  // ── Leaderboard ───────────────────────────────────────────────────────────

  els.leaderboardOpenBtn?.addEventListener('click', () => showLeaderboard());
  els.leaderboardCloseBtn?.addEventListener('click', hideLeaderboard);

  // Close overlays on Escape
  els.sessionSummaryCloseBtn?.addEventListener('click', hideSessionSummary);
  els.sessionSummaryDoneBtn?.addEventListener('click',  hideSessionSummary);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSessionSummary();
      hideAccountModal();
      hideUpgradeOverlay();
      hideLeaderboard();
      hideReturnOverlay();
      hideProgressReport();
      hideChallengesOverlay();
      hideGoalsOverlay();
    }
  });

  // ── Onboarding goal selection ─────────────────────────────────────────────
  els.onboardingScreenGoal?.querySelectorAll('.onboarding-goal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.diagnosticGoal = btn.dataset.goal;
      localStorage.setItem('jt.onboarding.goal', state.diagnosticGoal);
      showOnboardingDiagScreen();
    });
  });

  els.startDiagnosticBtn?.addEventListener('click', () => {
    hideOnboardingOverlay();
    void startDiagnosticSession();
  });

  els.skipDiagnosticBtn?.addEventListener('click', () => {
    completeOnboarding();
    generateTask('practice');
  });

  // ── Return after break ────────────────────────────────────────────────────
  els.returnStartBtn?.addEventListener('click', () => void startReturnSession());
  els.returnSkipBtn?.addEventListener('click', () => {
    hideReturnOverlay();
    generateTask('practice');
  });

  // ── Progress report ───────────────────────────────────────────────────────
  els.progressReportOpenBtn?.addEventListener('click', showProgressReport);
  els.progressReportCloseBtn?.addEventListener('click', hideProgressReport);
  els.progressReportExportBtn?.addEventListener('click', exportProgressAsHTML);

  // ── AI Hint ───────────────────────────────────────────────────────────────
  els.aiHintBtn?.addEventListener('click', () => void requestAiHint());

  // ── AI Breakdown ──────────────────────────────────────────────────────────
  els.aiBreakdownCloseBtn?.addEventListener('click', () => els.aiBreakdownPanel?.classList.add('hidden'));

  // ── Challenges ────────────────────────────────────────────────────────────
  els.challengesOpenBtn?.addEventListener('click', showChallengesOverlay);
  els.challengesCloseBtn?.addEventListener('click', hideChallengesOverlay);

  els.challengesList?.addEventListener('click', (e) => {
    const startBtn = e.target.closest('[data-start-challenge]');
    const stopBtn  = e.target.closest('[data-stop-challenge]');
    if (startBtn) {
      startChallenge(startBtn.dataset.startChallenge);
      renderChallengesOverlay();
      // Apply challenge categories to settings
      const def = CHALLENGE_DEFS.find((d) => d.id === startBtn.dataset.startChallenge);
      if (def?.categories) {
        state.settings.selectedCategories = def.categories.slice();
        saveSettings();
        applySettingsToControls();
      }
      setRunStatus(`Челлендж "${def?.name}" начат! Удачи.`, 'success');
    }
    if (stopBtn) {
      const challenges = loadChallenges();
      delete challenges[stopBtn.dataset.stopChallenge];
      saveChallenges(challenges);
      renderChallengesOverlay();
    }
  });

  // ── Goals ─────────────────────────────────────────────────────────────────
  els.goalsOpenBtn?.addEventListener('click', showGoalsOverlay);
  els.goalsCloseBtn?.addEventListener('click', hideGoalsOverlay);

  els.goalsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goal-id]');
    if (!btn) return;
    const goal = { id: btn.dataset.goalId, setAt: Date.now() };
    saveGoal(goal);
    applyGoalToSettings(goal);
    renderGoalsOverlay();
    setRunStatus(`Цель "${GOAL_DEFS.find((d) => d.id === goal.id)?.name}" установлена.`, 'success');
  });

  els.goalsClearBtn?.addEventListener('click', () => {
    clearGoal();
    renderGoalsOverlay();
    setRunStatus('Цель сброшена.', 'neutral');
  });
}

async function init() {
  ensureTheoryShell();
  applyProductPositioning();
  compactProfileHeader();
  setProfileExpanded(false);
  setSkillsExpanded(false);
  renderKernelOptions();
  renderCategoryFilters();
  renderDifficultyFilters();
  renderSelectOptions();
  applySettingsToControls();
  renderCustomTaskList();
  updateCustomFormButtonLabel();
  fillCustomTemplate();
  await setupEditorInteractions();
  setupControlListeners();
  updateProgressView();
  updateAchievementsView();
  renderOnboardingTrack();

  // Apply personal goal to settings on startup
  applyGoalToSettings(loadGoal());

  const hasExistingActivity = state.progress.solved > 0 || state.progress.attempted > 0 || state.customTasks.length > 0;
  if (hasExistingActivity && !state.onboarding.completed) {
    state.onboarding.completed = true;
    state.onboarding.completedAt = state.onboarding.completedAt || new Date().toISOString();
    saveOnboarding();
  }

  if (state.customTasks.length > 0) {
    const firstCustom = state.customTasks[0];
    if (firstCustom && !state.customEditingId) {
      renderCustomTaskList();
    }
  }

  // Restore cloud session in background — non-blocking
  restoreSession().then(async (loggedIn) => {
    renderAuthStatus();
    if (loggedIn) {
      void pullFromCloud();
      // Pull custom tasks from server and merge with local
      try {
        const merged = await fetchAndMergeCustomTasks(ACTIVE_KERNEL_ID, state.customTasks);
        if (merged.length !== state.customTasks.length ||
            merged.some((t, i) => t.id !== state.customTasks[i]?.id)) {
          state.customTasks = merged;
          saveCustomTasks();
          renderCustomTaskList();
        }
      } catch { /* offline */ }
    }
  }).catch(() => {});

  if (shouldShowOnboarding()) {
    showOnboardingGoalScreen();
    showOnboardingOverlay();
    setRunStatus('Выбери цель — подберём задачи под тебя.', 'neutral');
  } else {
    hideOnboardingOverlay();
    checkReturnAfterBreak();
    // If return overlay is visible, user will trigger task gen via button
    const returnVisible = els.returnOverlay && !els.returnOverlay.classList.contains('hidden');
    if (!returnVisible) {
      generateTask('practice');
    }
  }
}

window.addEventListener('beforeunload', () => {
  storeCurrentDraft();
  saveSettings();
  saveProgress();
  saveCustomTasks();
  saveDrafts();
  saveOnboarding();
});

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error(error);
    setRunStatus(error.message || 'Не удалось запустить приложение.', 'danger');
  });
});

