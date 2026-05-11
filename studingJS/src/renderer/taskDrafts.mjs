function readDraftForTask(drafts, task) {
  if (!task || !task.id) {
    return '';
  }

  const saved = drafts && typeof drafts === 'object' ? drafts[task.id] : undefined;
  return typeof saved === 'string' && saved.length > 0 ? saved : (task.starterCode || '');
}

function rememberDraftForTask(drafts, taskId, value) {
  if (!drafts || typeof drafts !== 'object' || !taskId) {
    return drafts;
  }

  drafts[taskId] = String(value ?? '');
  return drafts;
}

function forgetDraftForTask(drafts, taskId) {
  if (!drafts || typeof drafts !== 'object' || !taskId) {
    return drafts;
  }

  delete drafts[taskId];
  return drafts;
}

export {
  forgetDraftForTask,
  readDraftForTask,
  rememberDraftForTask
};
