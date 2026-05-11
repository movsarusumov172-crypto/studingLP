const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');
const { cloneJson, preview } = require('../engine/utils');

function createTestState() {
  return {
    callCounts: Object.create(null),
    collected: Object.create(null),
    functions: Object.create(null)
  };
}

function bumpCall(state, key) {
  state.callCounts[key] = (state.callCounts[key] || 0) + 1;
}

function ensureCollected(state, key) {
  if (!state.collected[key]) {
    state.collected[key] = [];
  }
  return state.collected[key];
}

function buildCallableFromSpec(spec, state) {
  const kind = spec.__fn;
  const key = spec.key || spec.name || kind;

  if (state.functions[key]) {
    return state.functions[key];
  }

  switch (kind) {
    case 'constant':
      state.functions[key] = () => spec.value;
      return state.functions[key];
    case 'asyncValue':
      state.functions[key] = async () => {
        bumpCall(state, key);
        return cloneJson(spec.value);
      };
      return state.functions[key];
    case 'add':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value + spec.value;
      };
      return state.functions[key];
    case 'subtract':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value - spec.value;
      };
      return state.functions[key];
    case 'multiply':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value * spec.value;
      };
      return state.functions[key];
    case 'divide':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value / spec.value;
      };
      return state.functions[key];
    case 'predicateGreaterThan':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value > spec.value;
      };
      return state.functions[key];
    case 'predicateLessThan':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value < spec.value;
      };
      return state.functions[key];
    case 'predicateNotMultipleOf':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value % spec.divisor !== 0;
      };
      return state.functions[key];
    case 'predicateModuloEquals':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value % spec.divisor === spec.remainder;
      };
      return state.functions[key];
    case 'toUpperCase':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return String(value).toUpperCase();
      };
      return state.functions[key];
    case 'appendSuffix':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return `${String(value)}${spec.suffix ?? ''}`;
      };
      return state.functions[key];
    case 'formatUserScore':
      state.functions[key] = (user) => {
        bumpCall(state, key);
        return `${user.name}:${user.score}`;
      };
      return state.functions[key];
    case 'weightedAdd':
      state.functions[key] = (value, index = 0) => {
        bumpCall(state, key);
        return value * (index + 1);
      };
      return state.functions[key];
    case 'accumulate':
      state.functions[key] = (acc, value) => {
        bumpCall(state, key);
        return acc + value + (Number(spec.value) || 0);
      };
      return state.functions[key];
    case 'methodProduct':
      state.functions[key] = function (a, b) {
        bumpCall(state, key);
        return Number(this && this.factor ? this.factor : 1) * a * b;
      };
      return state.functions[key];
    case 'spyMultiply':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value * spec.value;
      };
      return state.functions[key];
    case 'asyncAdd':
      state.functions[key] = async (value) => {
        bumpCall(state, key);
        return value + spec.value;
      };
      return state.functions[key];
    case 'asyncMultiply':
      state.functions[key] = async (value) => {
        bumpCall(state, key);
        return value * spec.value;
      };
      return state.functions[key];
    case 'delay':
      state.functions[key] = async (value = spec.value) => {
        bumpCall(state, key);
        const delay = Math.max(0, Number(spec.ms) || 0);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return value;
      };
      return state.functions[key];
    case 'asyncReject':
    case 'reject':
      state.functions[key] = async () => {
        bumpCall(state, key);
        throw new Error(spec.message || 'Rejected');
      };
      return state.functions[key];
    case 'collect':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        ensureCollected(state, key).push(normalizeComparisonValue(value));
        return value;
      };
      return state.functions[key];
    case 'record':
      state.functions[key] = (...args) => {
        bumpCall(state, key);
        ensureCollected(state, key).push(normalizeComparisonValue(args));
        return spec.returnValue;
      };
      return state.functions[key];
    case 'returnArgument':
      state.functions[key] = (value) => {
        bumpCall(state, key);
        return value;
      };
      return state.functions[key];
    default:
      throw new Error(`Unknown test function spec: ${kind}`);
  }
}

function materializeTestValue(value, state) {
  if (Array.isArray(value)) {
    return value.map((item) => materializeTestValue(item, state));
  }

  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '__fn')) {
      return buildCallableFromSpec(value, state);
    }

    const result = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = materializeTestValue(child, state);
    }
    return result;
  }

  return value;
}

function normalizeComparisonValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fall through to JSON clone.
    }
  }

  try {
    return cloneJson(value);
  } catch (error) {
    return value;
  }
}

function serializeReportValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;
  if (type === 'function') {
    return `[Function${value.name ? ` ${value.name}` : ''}]`;
  }
  if (type !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => serializeReportValue(item, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Set) {
    return {
      type: 'Set',
      values: Array.from(value, (item) => serializeReportValue(item, seen))
    };
  }
  if (value instanceof Map) {
    return {
      type: 'Map',
      entries: Array.from(value.entries(), ([key, item]) => [serializeReportValue(key, seen), serializeReportValue(item, seen)])
    };
  }

  if (typeof value.nodeType === 'number' && typeof value.tagName === 'string') {
    return {
      type: 'DOMNode',
      tagName: value.tagName,
      id: value.id || null,
      className: value.className || null,
      textContent: typeof value.textContent === 'string' ? value.textContent : null
    };
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return preview(value);
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = serializeReportValue(child, seen);
  }
  return result;
}

function invokeInContext(context, callable, thisArg, args, timeoutMs) {
  if (typeof callable !== 'function') {
    throw new Error('Callable is not a function');
  }

  context.__codexInvoke__ = callable;
  context.__codexThis__ = thisArg;
  context.__codexArgs__ = Array.isArray(args) ? args : [];

  const script = new vm.Script('__codexInvoke__.apply(__codexThis__, __codexArgs__)', {
    filename: 'user-call.js',
    displayErrors: true
  });

  return script.runInContext(context, { timeout: timeoutMs });
}

function awaitWithTimeout(value, timeoutMs, label = 'Execution') {
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve(value);
  }

  let timer = null;
  const timeoutError = new Error(`${label} timed out after ${ms}ms`);

  return Promise.race([
    Promise.resolve(value),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(timeoutError), ms);
    })
  ]).finally(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
  });
}

function createDomNode(tagName = 'div') {
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
    ownerDocument: null,
    appendChild(child) {
      if (!child) {
        return child;
      }
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = node;
      node.children.push(child);
      child.ownerDocument = node.ownerDocument;
      if (child.id) {
        child.ownerDocument._registerNode(child);
      }
      return child;
    },
    removeChild(child) {
      const index = node.children.indexOf(child);
      if (index >= 0) {
        node.children.splice(index, 1);
        if (child && child.id && child.ownerDocument) {
          child.ownerDocument._unregisterNode(child);
        }
        child.parentNode = null;
      }
      return child;
    },
    setAttribute(name, value) {
      const key = String(name);
      if (key === 'id') {
        node.id = value;
        return;
      }
      if (key === 'class' || key === 'className') {
        node.className = value;
        return;
      }
      node.attributes[key] = String(value);
    },
    getAttribute(name) {
      const key = String(name);
      if (key === 'id') {
        return node.id || null;
      }
      if (key === 'class' || key === 'className') {
        return node.className || null;
      }
      return Object.prototype.hasOwnProperty.call(node.attributes, key)
        ? node.attributes[key]
        : null;
    },
    matches(selector) {
      return matchesSelector(node, selector);
    },
    querySelector(selector) {
      return querySelector(node, selector);
    },
    querySelectorAll(selector) {
      return querySelectorAll(node, selector);
    }
  };

  Object.defineProperty(node, 'id', {
    get() {
      return node._id;
    },
    set(value) {
      const next = String(value ?? '').trim();
      if (node.ownerDocument) {
        node.ownerDocument._unregisterNode(node);
      }
      node._id = next;
      if (node.ownerDocument) {
        node.ownerDocument._registerNode(node);
      }
    }
  });

  Object.defineProperty(node, 'className', {
    get() {
      return Array.from(node._classSet).join(' ');
    },
    set(value) {
      const tokens = String(value ?? '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
      node._classSet = new Set(tokens);
    }
  });

  Object.defineProperty(node, 'textContent', {
    get() {
      return `${node._text}${node.children.map((child) => child.textContent).join('')}`;
    },
    set(value) {
      node.children = [];
      node._text = String(value ?? '');
    }
  });

  Object.defineProperty(node, 'value', {
    get() {
      return node._value;
    },
    set(value) {
      node._value = String(value ?? '');
    }
  });

  node.classList = {
    add(...tokens) {
      for (const token of tokens) {
        if (token) {
          node._classSet.add(String(token));
        }
      }
    },
    remove(...tokens) {
      for (const token of tokens) {
        node._classSet.delete(String(token));
      }
    },
    contains(token) {
      return node._classSet.has(String(token));
    },
    toggle(token, force) {
      const value = String(token);
      if (force === true) {
        node._classSet.add(value);
        return true;
      }
      if (force === false) {
        node._classSet.delete(value);
        return false;
      }
      if (node._classSet.has(value)) {
        node._classSet.delete(value);
        return false;
      }
      node._classSet.add(value);
      return true;
    },
    toString() {
      return node.className;
    },
    get value() {
      return node.className;
    }
  };

  return node;
}

function matchesSelector(node, selector) {
  if (!selector || !node) {
    return false;
  }

  const text = String(selector).trim();
  if (!text) {
    return false;
  }
  if (text.startsWith('#')) {
    return node.id === text.slice(1);
  }
  if (text.startsWith('.')) {
    return node.classList.contains(text.slice(1));
  }
  return node.tagName.toLowerCase() === text.toLowerCase();
}

function walkTree(root, visit) {
  if (!root || !Array.isArray(root.children)) {
    return;
  }
  for (const child of root.children) {
    if (visit(child) !== false) {
      walkTree(child, visit);
    }
  }
}

function querySelectorAll(root, selector) {
  const result = [];
  walkTree(root, (node) => {
    if (matchesSelector(node, selector)) {
      result.push(node);
    }
  });
  return result;
}

function querySelector(root, selector) {
  return querySelectorAll(root, selector)[0] || null;
}

function createDomDocument(fixture = {}) {
  const nodesById = new Map();

  const document = {
    body: null,
    documentElement: null,
    createElement(tagName) {
      const node = createDomNode(tagName);
      node.ownerDocument = document;
      return node;
    },
    getElementById(id) {
      return nodesById.get(String(id)) || null;
    },
    querySelector(selector) {
      return querySelector(document.body, selector);
    },
    querySelectorAll(selector) {
      return querySelectorAll(document.body, selector);
    },
    _registerNode(node) {
      if (node && node.id) {
        nodesById.set(node.id, node);
      }
      if (node && Array.isArray(node.children)) {
        for (const child of node.children) {
          child.ownerDocument = document;
          document._registerNode(child);
        }
      }
    },
    _unregisterNode(node) {
      if (node && node.id && nodesById.get(node.id) === node) {
        nodesById.delete(node.id);
      }
      if (node && Array.isArray(node.children)) {
        for (const child of node.children) {
          document._unregisterNode(child);
        }
      }
    }
  };

  function buildNode(spec) {
    const node = document.createElement(spec.tag || 'div');
    if (spec.id) {
      node.id = spec.id;
    }
    if (spec.className) {
      node.className = spec.className;
    }
    if (Object.prototype.hasOwnProperty.call(spec, 'text')) {
      node.textContent = spec.text;
    }
    if (Object.prototype.hasOwnProperty.call(spec, 'value')) {
      node.value = spec.value;
    }
    if (spec.attrs && typeof spec.attrs === 'object') {
      for (const [key, value] of Object.entries(spec.attrs)) {
        node.setAttribute(key, value);
      }
    }
    if (Array.isArray(spec.children)) {
      for (const child of spec.children) {
        node.appendChild(buildNode(child));
      }
    }
    return node;
  }

  document.body = document.createElement('body');
  document.documentElement = document.body;
  document.body.ownerDocument = document;

  if (Array.isArray(fixture.body)) {
    for (const nodeSpec of fixture.body) {
      document.body.appendChild(buildNode(nodeSpec));
    }
  }

  document._registerNode(document.body);
  return document;
}

function getDomTarget(document, target) {
  if (!target) {
    return null;
  }

  if (typeof target === 'string') {
    return document.getElementById(target) || document.querySelector(target) || null;
  }

  return target;
}

function runDomAssertions(document, assertions = []) {
  for (const assertion of assertions) {
    const target = getDomTarget(document, assertion.target);
    if (!target) {
      throw new Error(`DOM target not found: ${assertion.target}`);
    }

    switch (assertion.type) {
      case 'text': {
        if (target.textContent !== assertion.equals) {
          throw new Error(`expected text ${preview(assertion.equals)}, got ${preview(target.textContent)}`);
        }
        break;
      }
      case 'value': {
        if (target.value !== assertion.equals) {
          throw new Error(`expected value ${preview(assertion.equals)}, got ${preview(target.value)}`);
        }
        break;
      }
      case 'classContains': {
        if (!target.classList.contains(assertion.value)) {
          throw new Error(`expected class ${assertion.value} on ${preview(assertion.target)}`);
        }
        break;
      }
      case 'classMissing': {
        if (target.classList.contains(assertion.value)) {
          throw new Error(`did not expect class ${assertion.value} on ${preview(assertion.target)}`);
        }
        break;
      }
      case 'attr': {
        const name = assertion.name || assertion.attr || assertion.attribute;
        if (target.getAttribute(name) !== assertion.equals) {
          throw new Error(`expected attribute ${name} = ${preview(assertion.equals)}, got ${preview(target.getAttribute(name))}`);
        }
        break;
      }
      case 'childCount': {
        if (target.children.length !== assertion.equals) {
          throw new Error(`expected ${assertion.equals} children, got ${target.children.length}`);
        }
        break;
      }
      case 'exists': {
        if (!target) {
          throw new Error(`expected ${assertion.target} to exist`);
        }
        break;
      }
      default:
        throw new Error(`Unknown DOM assertion type: ${assertion.type}`);
    }
  }
}

async function executeTaskTests(task, solve, sandbox, context, timeoutMs = 1000) {
  const results = [];
  const strategy = task.strategy || 'simple';
  const tests = Array.isArray(task.tests) ? task.tests : [];

  for (const test of tests) {
    const state = createTestState();
    let args = [];

    try {
      args = materializeTestValue(test.args || [], state);

      if (strategy === 'closure') {
        const current = await awaitWithTimeout(invokeInContext(context, solve, undefined, args, timeoutMs), timeoutMs, 'solve(...)');
        let lastActual = current;

        if (Array.isArray(test.sequence)) {
          for (const step of test.sequence) {
            const methodName = step.method || 'call';
            const stepArgs = materializeTestValue(step.input || [], state);

            if (typeof current === 'function' && methodName === 'call') {
              lastActual = await awaitWithTimeout(invokeInContext(context, current, undefined, stepArgs, timeoutMs), timeoutMs, `closure step ${methodName}`);
            } else if (current && typeof current[methodName] === 'function') {
              lastActual = await awaitWithTimeout(invokeInContext(context, current[methodName], current, stepArgs, timeoutMs), timeoutMs, `closure step ${methodName}`);
            } else {
              throw new Error(`method ${methodName} is not available`);
            }

            if (Object.prototype.hasOwnProperty.call(step, 'expected')) {
              const actualStep = normalizeComparisonValue(lastActual);
              if (!isDeepStrictEqual(actualStep, step.expected)) {
                throw new Error(`expected ${preview(step.expected)}, got ${preview(actualStep)}`);
              }
            }
          }
        } else if (Object.prototype.hasOwnProperty.call(test, 'expected')) {
          const normalized = normalizeComparisonValue(lastActual);
          if (!isDeepStrictEqual(normalized, test.expected)) {
            throw new Error(`expected ${preview(test.expected)}, got ${preview(normalized)}`);
          }
        }

        if (test.expectCalls) {
          for (const [key, expected] of Object.entries(test.expectCalls)) {
            const actual = state.callCounts[key] || 0;
            if (actual !== expected) {
              throw new Error(`call count for ${key} expected ${expected}, got ${actual}`);
            }
          }
        }

        if (test.expectCollected) {
          for (const [key, expected] of Object.entries(test.expectCollected)) {
            const actual = state.collected[key] || [];
            if (!isDeepStrictEqual(actual, expected)) {
              throw new Error(`collected values for ${key} expected ${preview(expected)}, got ${preview(actual)}`);
            }
          }
        }

        results.push({
          passed: true,
          input: serializeReportValue(args),
          expected: serializeReportValue(test.expected),
          actual: serializeReportValue(normalizeComparisonValue(lastActual))
        });
        continue;
      }

      if (strategy === 'dom' || test.fixture || test.assertions) {
        const document = createDomDocument(test.fixture || task.fixture || {});
        sandbox.document = document;
        sandbox.window = sandbox;
        sandbox.self = sandbox;
        const returned = await awaitWithTimeout(invokeInContext(context, solve, undefined, [document, ...args], timeoutMs), timeoutMs, 'DOM solve(...)');

        if (Array.isArray(test.assertions)) {
          runDomAssertions(document, test.assertions);
        }

        if (Object.prototype.hasOwnProperty.call(test, 'expected')) {
          const normalized = normalizeComparisonValue(returned);
          if (!isDeepStrictEqual(normalized, test.expected)) {
            throw new Error(`expected ${preview(test.expected)}, got ${preview(normalized)}`);
          }
        }

        results.push({
          passed: true,
          input: serializeReportValue(args),
          expected: serializeReportValue(test.expected),
          actual: serializeReportValue(normalizeComparisonValue(returned))
        });
        continue;
      }

      const returned = await awaitWithTimeout(invokeInContext(context, solve, undefined, args, timeoutMs), timeoutMs, 'solve(...)');

      if (Object.prototype.hasOwnProperty.call(test, 'expected')) {
        const normalized = normalizeComparisonValue(returned);
        if (!isDeepStrictEqual(normalized, test.expected)) {
          throw new Error(`expected ${preview(test.expected)}, got ${preview(normalized)}`);
        }
      }

      if (test.expectCalls) {
        for (const [key, expected] of Object.entries(test.expectCalls)) {
          const actual = state.callCounts[key] || 0;
          if (actual !== expected) {
            throw new Error(`call count for ${key} expected ${expected}, got ${actual}`);
          }
        }
      }

      if (test.expectCollected) {
        for (const [key, expected] of Object.entries(test.expectCollected)) {
          const actual = state.collected[key] || [];
          if (!isDeepStrictEqual(actual, expected)) {
            throw new Error(`collected values for ${key} expected ${preview(expected)}, got ${preview(actual)}`);
          }
        }
      }

      results.push({
        passed: true,
        input: serializeReportValue(args),
        expected: serializeReportValue(test.expected),
        actual: serializeReportValue(normalizeComparisonValue(returned))
      });
    } catch (error) {
      results.push({
        passed: false,
        input: serializeReportValue(args),
        expected: serializeReportValue(test.expected),
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  return results;
}

module.exports = {
  createTestState,
  buildCallableFromSpec,
  materializeTestValue,
  normalizeComparisonValue,
  serializeReportValue,
  createDomDocument,
  runDomAssertions,
  executeTaskTests
};
