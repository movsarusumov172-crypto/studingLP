const { buildTaskFromParts } = require('./taskBuilder');
const { unique } = require('./utils');
const {
  normalizeTextList,
  joinPromptParts,
  pickVariantByKey,
  buildVariationProfile
} = require('./variationProfile');

function buildVariantTask(spec) {
  const category = spec.category || 'js';
  const difficulty = spec.difficulty || 'easy';
  const context = spec.context && typeof spec.context === 'object'
    ? spec.context
    : { id: 'general', title: 'значений' };
  const family = spec.family || spec.logicType || category;
  const logicType = spec.logicType || family;
  const structureType = spec.structureType || 'primitive';
  const answerFormat = spec.answerFormat || 'default';
  const thinkingStyle = spec.thinkingStyle || 'direct';
  const variationNotes = normalizeTextList(spec.variationNotes);
  const seed = spec.seed || spec.variantId || `${category}-${family}-${logicType}-${structureType}-${answerFormat}-${thinkingStyle}-${context.id}`;

  return buildTaskFromParts({
    category,
    difficulty,
    title: spec.title,
    prompt: joinPromptParts(spec.prompt, variationNotes),
    signature: spec.signature,
    starterBody: spec.starterBody,
    solutionBody: spec.solutionBody,
    hints: spec.hints,
    explanation: spec.explanation,
    tests: spec.tests,
    strategy: spec.strategy || 'simple',
    async: spec.async === true,
    tags: unique([...(spec.tags || []), category, family, logicType, structureType, context.id, answerFormat, thinkingStyle]),
    challengeType: spec.challengeType || 'practice',
    seed,
    kernelId: spec.kernelId || 'js',
    meta: {
      ...(spec.meta || {}),
      family,
      logicType,
      structureType,
      answerFormat,
      thinkingStyle,
      contextType: context.id,
      constraints: unique(Array.isArray(spec.constraints) ? spec.constraints : []),
      variationNotes,
      variantId: seed
    },
    source: spec.source || 'generated',
    createdAt: spec.createdAt || null
  });
}

module.exports = {
  buildVariantTask,
  pickVariantByKey,
  joinPromptParts,
  normalizeTextList,
  buildVariationProfile
};
