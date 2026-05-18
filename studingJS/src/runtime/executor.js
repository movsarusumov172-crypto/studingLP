const vm = require('node:vm');
const { executeTaskTests } = require('./testRunner');

const EXECUTION_TIMEOUT_MS = 1000;

const SANDBOX_BOOTSTRAP = `
globalThis.__codexLogs__ = [];
function __codexPreview__(value) {
  if (typeof value === 'string') return value;
  try {
    if (value === null || value === undefined || typeof value !== 'object') return String(value);
    return JSON.stringify(value);
  } catch (error) {
    return Object.prototype.toString.call(value);
  }
}
globalThis.console = {
  log: (...args) => __codexLogs__.push({ type: 'log', text: args.map(__codexPreview__).join(' ') }),
  info: (...args) => __codexLogs__.push({ type: 'info', text: args.map(__codexPreview__).join(' ') }),
  warn: (...args) => __codexLogs__.push({ type: 'warn', text: args.map(__codexPreview__).join(' ') }),
  error: (...args) => __codexLogs__.push({ type: 'error', text: args.map(__codexPreview__).join(' ') })
};
globalThis.module = { exports: {} };
globalThis.exports = globalThis.module.exports;
globalThis.global = globalThis;
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.document = null;
globalThis.eval = undefined;
globalThis.require = undefined;
globalThis.process = undefined;
globalThis.setTimeout = function () { throw new Error('Timers are not available in the task sandbox.'); };
globalThis.clearTimeout = function () {};
globalThis.setInterval = function () { throw new Error('Timers are not available in the task sandbox.'); };
globalThis.clearInterval = function () {};

globalThis.__codexTestState__ = { callCounts: Object.create(null), collected: Object.create(null), functions: Object.create(null) };
globalThis.__codexResetTestState__ = function () {
  globalThis.__codexTestState__ = { callCounts: Object.create(null), collected: Object.create(null), functions: Object.create(null) };
};
function __codexClone__(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function __codexBumpCall__(key) {
  const calls = globalThis.__codexTestState__.callCounts;
  calls[key] = (calls[key] || 0) + 1;
}
function __codexCollect__(key, value) {
  const collected = globalThis.__codexTestState__.collected;
  if (!collected[key]) collected[key] = [];
  collected[key].push(__codexClone__(value));
}
function __codexBuildFn__(spec) {
  const kind = spec.__fn;
  const key = spec.key || spec.name || kind;
  const cache = globalThis.__codexTestState__.functions;
  if (cache[key]) return cache[key];
  switch (kind) {
    case 'constant':
      cache[key] = () => spec.value;
      break;
    case 'asyncValue':
      cache[key] = async () => { __codexBumpCall__(key); return __codexClone__(spec.value); };
      break;
    case 'add':
      cache[key] = (value) => { __codexBumpCall__(key); return value + spec.value; };
      break;
    case 'subtract':
      cache[key] = (value) => { __codexBumpCall__(key); return value - spec.value; };
      break;
    case 'multiply':
      cache[key] = (value) => { __codexBumpCall__(key); return value * spec.value; };
      break;
    case 'divide':
      cache[key] = (value) => { __codexBumpCall__(key); return value / spec.value; };
      break;
    case 'predicateGreaterThan':
      cache[key] = (value) => { __codexBumpCall__(key); return value > spec.value; };
      break;
    case 'predicateLessThan':
      cache[key] = (value) => { __codexBumpCall__(key); return value < spec.value; };
      break;
    case 'predicateNotMultipleOf':
      cache[key] = (value) => { __codexBumpCall__(key); return value % spec.divisor !== 0; };
      break;
    case 'predicateModuloEquals':
      cache[key] = (value) => { __codexBumpCall__(key); return value % spec.divisor === spec.remainder; };
      break;
    case 'toUpperCase':
      cache[key] = (value) => { __codexBumpCall__(key); return String(value).toUpperCase(); };
      break;
    case 'appendSuffix':
      cache[key] = (value) => { __codexBumpCall__(key); return String(value) + (spec.suffix ?? ''); };
      break;
    case 'formatUserScore':
      cache[key] = (user) => { __codexBumpCall__(key); return String(user.name) + ':' + String(user.score); };
      break;
    case 'weightedAdd':
      cache[key] = (value, index = 0) => { __codexBumpCall__(key); return value * (index + 1); };
      break;
    case 'accumulate':
      cache[key] = (acc, value) => { __codexBumpCall__(key); return acc + value + (Number(spec.value) || 0); };
      break;
    case 'methodProduct':
      cache[key] = function (a, b) { __codexBumpCall__(key); return Number(this && this.factor ? this.factor : 1) * a * b; };
      break;
    case 'spyMultiply':
      cache[key] = (value) => { __codexBumpCall__(key); return value * spec.value; };
      break;
    case 'asyncAdd':
      cache[key] = async (value) => { __codexBumpCall__(key); return value + spec.value; };
      break;
    case 'asyncMultiply':
      cache[key] = async (value) => { __codexBumpCall__(key); return value * spec.value; };
      break;
    case 'delay':
      cache[key] = async (value = spec.value) => { __codexBumpCall__(key); return value; };
      break;
    case 'asyncReject':
    case 'reject':
      cache[key] = async () => { __codexBumpCall__(key); throw new Error(spec.message || 'Rejected'); };
      break;
    case 'collect':
      cache[key] = (value) => { __codexBumpCall__(key); __codexCollect__(key, value); return value; };
      break;
    case 'record':
      cache[key] = (...args) => { __codexBumpCall__(key); __codexCollect__(key, args); return __codexClone__(spec.returnValue); };
      break;
    case 'returnArgument':
      cache[key] = (value) => { __codexBumpCall__(key); return value; };
      break;
    default:
      throw new Error('Unknown test function spec: ' + kind);
  }
  return cache[key];
}
globalThis.__codexMaterialize__ = function __codexMaterialize__(value) {
  if (Array.isArray(value)) return value.map((item) => __codexMaterialize__(item));
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '__fn')) return __codexBuildFn__(value);
    const result = {};
    for (const key of Object.keys(value)) result[key] = __codexMaterialize__(value[key]);
    return result;
  }
  return value;
};
function __codexMatchesSelector__(node, selector) {
  const text = String(selector || '').trim();
  if (!text || !node) return false;
  if (text.startsWith('#')) return node.id === text.slice(1);
  if (text.startsWith('.')) return node.classList.contains(text.slice(1));
  return String(node.tagName || '').toLowerCase() === text.toLowerCase();
}
function __codexCreateNode__(document, tagName = 'div') {
  const node = {
    nodeType: 1,
    tagName: String(tagName || 'div').toUpperCase(),
    parentNode: null,
    children: [],
    attributes: Object.create(null),
    _text: '',
    _value: '',
    _id: '',
    _classSet: new Set(),
    ownerDocument: document,
    appendChild(child) {
      if (!child) return child;
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = node;
      child.ownerDocument = document;
      node.children.push(child);
      if (child.id) document._registerNode(child);
      return child;
    },
    removeChild(child) {
      const index = node.children.indexOf(child);
      if (index >= 0) {
        node.children.splice(index, 1);
        if (child && child.id) document._unregisterNode(child);
        child.parentNode = null;
      }
      return child;
    },
    setAttribute(name, value) {
      const key = String(name);
      if (key === 'id') { node.id = value; return; }
      if (key === 'class' || key === 'className') { node.className = value; return; }
      node.attributes[key] = String(value);
    },
    getAttribute(name) {
      const key = String(name);
      if (key === 'id') return node.id || null;
      if (key === 'class' || key === 'className') return node.className || null;
      return Object.prototype.hasOwnProperty.call(node.attributes, key) ? node.attributes[key] : null;
    },
    matches(selector) { return __codexMatchesSelector__(node, selector); },
    querySelector(selector) { return node.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const result = [];
      const walk = (root) => {
        for (const child of root.children || []) {
          if (__codexMatchesSelector__(child, selector)) result.push(child);
          walk(child);
        }
      };
      walk(node);
      return result;
    }
  };
  Object.defineProperty(node, 'id', {
    get() { return node._id; },
    set(value) {
      if (node.ownerDocument) node.ownerDocument._unregisterNode(node);
      node._id = String(value ?? '').trim();
      if (node.ownerDocument) node.ownerDocument._registerNode(node);
    }
  });
  Object.defineProperty(node, 'className', {
    get() { return Array.from(node._classSet).join(' '); },
    set(value) { node._classSet = new Set(String(value ?? '').split(/\\s+/).map((token) => token.trim()).filter(Boolean)); }
  });
  Object.defineProperty(node, 'textContent', {
    get() { return String(node._text) + node.children.map((child) => child.textContent).join(''); },
    set(value) { node.children = []; node._text = String(value ?? ''); }
  });
  Object.defineProperty(node, 'value', {
    get() { return node._value; },
    set(value) { node._value = String(value ?? ''); }
  });
  node.classList = {
    add(...tokens) { for (const token of tokens) if (token) node._classSet.add(String(token)); },
    remove(...tokens) { for (const token of tokens) node._classSet.delete(String(token)); },
    contains(token) { return node._classSet.has(String(token)); },
    toggle(token, force) {
      const value = String(token);
      if (force === true) { node._classSet.add(value); return true; }
      if (force === false) { node._classSet.delete(value); return false; }
      if (node._classSet.has(value)) { node._classSet.delete(value); return false; }
      node._classSet.add(value);
      return true;
    },
    toString() { return node.className; },
    get value() { return node.className; }
  };
  return node;
}
globalThis.__codexCreateDomDocument__ = function (fixture = {}) {
  const nodesById = new Map();
  const document = {
    body: null,
    documentElement: null,
    createElement(tagName) { return __codexCreateNode__(document, tagName); },
    getElementById(id) { return nodesById.get(String(id)) || null; },
    querySelector(selector) { return document.body.querySelector(selector); },
    querySelectorAll(selector) { return document.body.querySelectorAll(selector); },
    _registerNode(node) {
      if (node && node.id) nodesById.set(node.id, node);
      for (const child of node && node.children ? node.children : []) {
        child.ownerDocument = document;
        document._registerNode(child);
      }
    },
    _unregisterNode(node) {
      if (node && node.id && nodesById.get(node.id) === node) nodesById.delete(node.id);
      for (const child of node && node.children ? node.children : []) document._unregisterNode(child);
    }
  };
  function buildNode(spec) {
    const node = document.createElement(spec.tag || 'div');
    if (spec.id) node.id = spec.id;
    if (spec.className) node.className = spec.className;
    if (Object.prototype.hasOwnProperty.call(spec, 'text')) node.textContent = spec.text;
    if (Object.prototype.hasOwnProperty.call(spec, 'value')) node.value = spec.value;
    if (spec.attrs && typeof spec.attrs === 'object') {
      for (const key of Object.keys(spec.attrs)) node.setAttribute(key, spec.attrs[key]);
    }
    if (Array.isArray(spec.children)) {
      for (const child of spec.children) node.appendChild(buildNode(child));
    }
    return node;
  }
  document.body = document.createElement('body');
  document.documentElement = document.body;
  if (Array.isArray(fixture.body)) {
    for (const nodeSpec of fixture.body) document.body.appendChild(buildNode(nodeSpec));
  }
  document._registerNode(document.body);
  return document;
};
`;

function createBasicConsoleBuffer() {
  const logs = [];
  const push = (type, args) => {
    logs.push({
      type,
      text: args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ')
    });
  };

  return {
    logs,
    console: {
      log: (...args) => push('log', args),
      info: (...args) => push('info', args),
      warn: (...args) => push('warn', args),
      error: (...args) => push('error', args)
    }
  };
}

function readSandboxLogs(context) {
  const rawLogs = context && Array.isArray(context.__codexLogs__) ? context.__codexLogs__ : [];
  return rawLogs.map((entry) => ({
    type: String(entry && entry.type ? entry.type : 'log'),
    text: String(entry && entry.text ? entry.text : '')
  }));
}

function resolveExportedFunction(sandbox) {
  const direct = sandbox.solve;
  if (typeof direct === 'function') {
    return direct;
  }

  const candidates = [sandbox.module && sandbox.module.exports, sandbox.exports];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (typeof candidate === 'function') {
      return candidate;
    }
    if (typeof candidate.solve === 'function') {
      return candidate.solve;
    }
    if (typeof candidate.default === 'function') {
      return candidate.default;
    }
  }

  return null;
}

async function runTaskTests(task, userCode) {
  const start = Date.now();
  const sandbox = Object.create(null);
  let context;
  let solve;

  try {
    context = vm.createContext(sandbox, {
      name: 'task-sandbox',
      codeGeneration: { strings: false, wasm: false }
    });
    vm.runInContext(SANDBOX_BOOTSTRAP, context, {
      filename: 'sandbox-bootstrap.js',
      timeout: EXECUTION_TIMEOUT_MS
    });
    const script = new vm.Script(String(userCode), {
      filename: 'user-code.js',
      displayErrors: true
    });
    script.runInContext(context, { timeout: EXECUTION_TIMEOUT_MS });
    solve = resolveExportedFunction(context);

    if (typeof solve !== 'function') {
      return {
        passed: false,
        error: 'Define a solve(...) function or export it with module.exports.',
        tests: [],
        logs: readSandboxLogs(context),
        durationMs: Date.now() - start
      };
    }
  } catch (error) {
    return {
      passed: false,
      error: error && error.message ? error.message : String(error),
      tests: [],
      logs: readSandboxLogs(context),
      durationMs: Date.now() - start
    };
  }

  try {
    const tests = await executeTaskTests(task, solve, context, context, EXECUTION_TIMEOUT_MS);
    const passed = tests.every((test) => test.passed);
    const result = {
      passed,
      tests,
      logs: readSandboxLogs(context),
      durationMs: Date.now() - start
    };

    if (!passed) {
      const failure = tests.find((test) => !test.passed);
      result.error = failure ? failure.error : 'Unknown failure';
    }

    return result;
  } catch (error) {
    return {
      passed: false,
      error: error && error.message ? error.message : String(error),
      tests: [],
      logs: readSandboxLogs(context),
      durationMs: Date.now() - start
    };
  }
}

module.exports = {
  createBasicConsoleBuffer,
  resolveExportedFunction,
  runTaskTests
};
