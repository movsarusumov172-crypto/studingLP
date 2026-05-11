const { buildTaskFromParts } = require('./taskBuilder');
const utils = require('./utils');

function pickVariant(rng, variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }
  return variants[rng.int(0, variants.length - 1)];
}

function buildTask(parts) {
  return buildTaskFromParts(parts);
}

module.exports = {
  buildTask,
  pickVariant,
  ...utils
};
