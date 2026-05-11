const kernelManager = require('../core/kernelManager');
const { registerExecutionIpc } = require('./ipc');

module.exports = {
  ...kernelManager,
  registerExecutionIpc
};
