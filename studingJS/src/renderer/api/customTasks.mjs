import { apiFetch } from './client.mjs';

/** Push one custom task to the server. Silent fail. */
export async function syncCustomTask(task) {
  if (!task?.id) return;
  try {
    await apiFetch(`/custom-tasks/${encodeURIComponent(task.id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        kernelId: task.kernelId || 'js',
        payload:  task,
      }),
    });
  } catch { /* offline — ok */ }
}

/** Delete one custom task from the server. Silent fail. */
export async function deleteCustomTaskFromServer(taskId) {
  if (!taskId) return;
  try {
    await apiFetch(`/custom-tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  } catch { /* offline — ok */ }
}

/**
 * Fetch all custom tasks from server for a kernel and merge with local.
 * Returns merged array — server tasks win on ID conflict.
 */
export async function fetchAndMergeCustomTasks(kernelId, localTasks = []) {
  try {
    const res = await apiFetch(`/custom-tasks?kernelId=${encodeURIComponent(kernelId)}`);
    if (!res.ok) return localTasks;
    const { tasks: serverTasks } = await res.json();
    if (!Array.isArray(serverTasks) || serverTasks.length === 0) return localTasks;

    const serverById = new Map(serverTasks.map((t) => [t.id, t]));
    // Keep local tasks not on server, replace conflicts with server version
    const merged = localTasks.map((t) => serverById.get(t.id) ?? t);
    // Add server tasks that aren't local
    const localIds = new Set(localTasks.map((t) => t.id));
    for (const t of serverTasks) {
      if (!localIds.has(t.id)) merged.push(t);
    }
    return merged;
  } catch {
    return localTasks;
  }
}
