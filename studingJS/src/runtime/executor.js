const vm = require('node:vm');
const { executeTaskTests } = require('./testRunner');
const { preview } = require('../engine/utils');

function createBasicConsoleBuffer() {
  const logs = [];
  const push = (type, args) => {
    logs.push({
      type,
      text: args.map((arg) => (typeof arg === 'string' ? arg : preview(arg))).join(' ')
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
  const executionTimeoutMs = 1000;
  const { logs, console } = createBasicConsoleBuffer();
  let context;
  const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    JSON,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    BigInt,
    Intl,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    queueMicrotask,
    structuredClone,
    performance: globalThis.performance,
    Error,
    TypeError,
    RangeError,
    ReferenceError,
    SyntaxError,
    URIError,
    eval: undefined,
    require: undefined,
    process: undefined
  };

  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.document = null;

  let solve;

  try {
    context = vm.createContext(sandbox);
    const script = new vm.Script(String(userCode), {
      filename: 'user-code.js',
      displayErrors: true
    });
    script.runInContext(context, { timeout: executionTimeoutMs });
    solve = resolveExportedFunction(sandbox);

    if (typeof solve !== 'function') {
      return {
        passed: false,
        error: 'Нужно определить функцию `solve(...)` или экспортировать её через `module.exports`.',
        tests: [],
        logs,
        durationMs: Date.now() - start
      };
    }
  } catch (error) {
    return {
      passed: false,
      error: error && error.message ? error.message : String(error),
      tests: [],
      logs,
      durationMs: Date.now() - start
    };
  }

  try {
    const tests = await executeTaskTests(task, solve, sandbox, context, executionTimeoutMs);
    const passed = tests.every((test) => test.passed);
    const result = {
      passed,
      tests,
      logs,
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
      logs,
      durationMs: Date.now() - start
    };
  }
}

module.exports = {
  createBasicConsoleBuffer,
  resolveExportedFunction,
  runTaskTests
};
