const kernelManager = require('../core/kernelManager');

function registerExecutionIpc(ipcMain) {
  ipcMain.handle('app:runTaskTests', async (_event, task, code) => {
    return kernelManager.runTaskTests(task, code);
  });
}

module.exports = {
  registerExecutionIpc
};
