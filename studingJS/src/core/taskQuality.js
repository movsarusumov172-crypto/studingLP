'use strict';

const { spawn } = require('node:child_process');
const { preview } = require('../engine/utils');

const QA_CACHE = new Map();

const REQUIRED_STRING_FIELDS = ['id', 'title', 'prompt', 'signature', 'starterCode', 'solution'];
const REQUIRED_ARRAY_FIELDS = ['tests', 'hints', 'tags'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function summarizeIssue(code, message, details = null) {
  return {
    code,
    message,
    details: details === null || details === undefined ? null : preview(details)
  };
}

function validateTaskShape(task) {
  const issues = [];

  if (!hasPlainObject(task)) {
    return [summarizeIssue('invalid-task', 'Task must be a plain object', task)];
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(task[field])) {
      issues.push(summarizeIssue(`missing-${field}`, `Task is missing required field: ${field}`));
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(task[field])) {
      issues.push(summarizeIssue(`invalid-${field}`, `Task field must be an array: ${field}`));
    }
  }

  if (!hasPlainObject(task.meta)) {
    issues.push(summarizeIssue('invalid-meta', 'Task meta must be a plain object'));
  }

  if (!isNonEmptyString(task.category)) {
    issues.push(summarizeIssue('missing-category', 'Task category is required'));
  }

  if (!isNonEmptyString(task.difficulty)) {
    issues.push(summarizeIssue('missing-difficulty', 'Task difficulty is required'));
  }

  return issues;
}

function hasSolutionLikeStarter(task) {
  if (!isNonEmptyString(task?.solution) || !isNonEmptyString(task?.starterCode)) {
    return false;
  }

  const normalize = (value) => String(value).replace(/\s+/g, ' ').trim();
  return normalize(task.solution) === normalize(task.starterCode);
}

async function runRuntimeVerification(task) {
  const cacheKey = task && task.id ? String(task.id) : null;
  if (cacheKey && QA_CACHE.has(cacheKey)) {
    return QA_CACHE.get(cacheKey);
  }

  const executorPath = require.resolve('../runtime/executor');
  const childScript = [
    "const fs = require('node:fs');",
    "const payload = JSON.parse(fs.readFileSync(0, 'utf8'));",
    "const { runTaskTests } = require(process.env.QA_RUNTIME_EXECUTOR);",
    '(async () => {',
    '  try {',
    '    const solutionReport = await runTaskTests(payload.task, payload.task.solution);',
    '    if (!solutionReport || solutionReport.passed !== true) {',
    "      process.stdout.write(JSON.stringify({ passed: false, stage: 'solution', report: solutionReport || null }));",
    '      return;',
    '    }',
    '    const starterReport = await runTaskTests(payload.task, payload.task.starterCode);',
    '    if (starterReport && starterReport.passed === true) {',
    "      process.stdout.write(JSON.stringify({ passed: false, stage: 'starter', report: starterReport }));",
    '      return;',
    '    }',
    "    process.stdout.write(JSON.stringify({ passed: true, solutionReport, starterReport }));",
    '  } catch (error) {',
    "    process.stdout.write(JSON.stringify({ passed: false, stage: 'exception', error: String(error && error.stack ? error.stack : error) }));",
    '  }',
    '})();'
  ].join('\n');

  let stdout = '';
  let spawnError = null;

  await new Promise((resolve) => {
    let settled = false;

    function settle() {
      if (!settled) {
        settled = true;
        resolve();
      }
    }

    const child = spawn(process.execPath, ['-e', childScript], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        QA_RUNTIME_EXECUTOR: executorPath
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      child.kill();
      settle();
    }, 4000);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.on('error', (error) => { spawnError = error; clearTimeout(timer); settle(); });
    child.on('close', () => { clearTimeout(timer); settle(); });

    child.stdin.write(JSON.stringify({ task }));
    child.stdin.end();
  });

  if (spawnError) {
    const result = {
      passed: false,
      issues: [summarizeIssue('qa-spawn-error', 'QA runner failed to start', spawnError)]
    };
    if (cacheKey) {
      QA_CACHE.set(cacheKey, result);
    }
    return result;
  }

  const trimmed = stdout.trim();
  let parsed = null;
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      parsed = {
        passed: false,
        stage: 'parse',
        error: String(error && error.stack ? error.stack : error)
      };
    }
  } else {
    parsed = {
      passed: false,
      stage: 'empty',
      error: 'QA runner returned no output'
    };
  }

  let result;
  if (parsed && parsed.passed === true) {
    result = {
      passed: true,
      issues: [],
      solutionReport: parsed.solutionReport || null,
      starterReport: parsed.starterReport || null
    };
  } else {
    result = {
      passed: false,
      issues: [summarizeIssue(`qa-${parsed?.stage || 'failed'}`, 'Task failed runtime QA', parsed)]
    };
  }

  if (cacheKey) {
    QA_CACHE.set(cacheKey, result);
  }
  return result;
}

async function verifyTaskWithRuntime(task) {
  const issues = validateTaskShape(task);
  if (issues.length > 0) {
    return { passed: false, issues };
  }

  if (task.tests.length === 0) {
    return {
      passed: false,
      issues: [summarizeIssue('empty-tests', 'Task must include at least one test')]
    };
  }

  if (hasSolutionLikeStarter(task)) {
    return {
      passed: false,
      issues: [summarizeIssue('starter-equals-solution', 'Starter code must not already solve the task')]
    };
  }

  return runRuntimeVerification(task);
}

function markVerifiedTask(task, qa) {
  const issues = Array.isArray(qa && qa.issues) ? qa.issues : [];
  return {
    ...task,
    meta: {
      ...(task.meta || {}),
      verified: Boolean(qa && qa.passed),
      qaStatus: qa && qa.passed ? 'verified' : 'failed',
      qaIssues: issues.map((issue) => issue.code),
      qaCheckedAt: Date.now()
    }
  };
}

module.exports = {
  validateTaskShape,
  verifyTaskWithRuntime,
  markVerifiedTask,
  summarizeIssue,
  hasSolutionLikeStarter
};
