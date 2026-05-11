const assert = require('node:assert/strict');

const kernelName = String(process.argv[2] || '').trim();

if (!kernelName) {
  throw new Error('Usage: node kernelVariationGuard.js <kernel>');
}

const kernel = require(`../kernels/${kernelName}`);

function sampleKernelVariations() {
  const answerFormats = new Set();
  const thinkingStyles = new Set();
  const structureTypes = new Set();
  const contextTypes = new Set();

  const categories = Object.keys(kernel.getCategories());
  const difficulties = kernel.getDifficulties();

  for (const category of categories) {
    for (const difficulty of difficulties) {
      for (let index = 0; index < 6; index += 1) {
        const task = kernel.generateTask({
          categories: [category],
          difficulties: [difficulty],
          focusCategory: category,
          focusDifficulty: difficulty,
          randomMode: false,
          seed: `${kernelName}-variation:${category}:${difficulty}:${index}`
        });

        assert.ok(task && typeof task === 'object', `${kernelName} must return a task object`);
        assert.equal(task.kernelId, kernelName, `${kernelName} must preserve kernelId`);
        assert.ok(task.meta && typeof task.meta === 'object', `${kernelName} task must expose meta`);
        assert.equal(typeof task.meta.answerFormat, 'string', `${kernelName} task must expose answerFormat`);
        assert.equal(typeof task.meta.thinkingStyle, 'string', `${kernelName} task must expose thinkingStyle`);
        assert.equal(typeof task.meta.structureType, 'string', `${kernelName} task must expose structureType`);
        assert.equal(typeof task.meta.contextType, 'string', `${kernelName} task must expose contextType`);
        assert.equal(typeof task.meta.variantId, 'string', `${kernelName} task must expose variantId`);
        assert.ok(Array.isArray(task.meta.constraints), `${kernelName} task must expose constraints`);
        assert.ok(Array.isArray(task.meta.variationNotes), `${kernelName} task must expose variationNotes`);
        assert.ok(task.meta.variationNotes.length > 0, `${kernelName} task must include variation notes`);
        assert.ok(
          task.prompt.includes('Сюжет:') ||
          task.prompt.includes('Ожидаемый формат ответа') ||
          task.prompt.includes('Подход:') ||
          task.prompt.includes('Структура решения:'),
          `${kernelName} prompt must include variation notes`
        );

        answerFormats.add(task.meta.answerFormat);
        thinkingStyles.add(task.meta.thinkingStyle);
        structureTypes.add(task.meta.structureType);
        contextTypes.add(task.meta.contextType);
      }
    }
  }

  assert.ok(answerFormats.size >= 2, `${kernelName} must vary answerFormat`);
  assert.ok(thinkingStyles.size >= 2, `${kernelName} must vary thinkingStyle`);
  assert.ok(structureTypes.size >= 2, `${kernelName} must vary structureType`);
  assert.ok(contextTypes.size >= 2, `${kernelName} must vary contextType`);

  console.log(`Variation guard passed for ${kernelName}.`);
}

sampleKernelVariations();
