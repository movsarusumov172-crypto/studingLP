const assert = require('node:assert/strict');
const pythonKernel = require('../kernels/python');

function main() {
  const answerFormats = new Set();
  const thinkingStyles = new Set();

  const categories = Object.keys(pythonKernel.getCategories());

  for (const category of categories) {
    for (const difficulty of pythonKernel.getDifficulties()) {
      const task = pythonKernel.generateTask({
        categories: [category],
        difficulties: [difficulty],
        focusCategory: category,
        focusDifficulty: difficulty,
        randomMode: false,
        seed: `python-variation:${category}:${difficulty}`
      });

      assert.ok(task && typeof task === 'object', 'Python kernel must return a task');
      assert.equal(task.kernelId, 'python', 'Python kernel must preserve kernelId');
      assert.ok(task.meta && typeof task.meta === 'object', 'Python task must expose meta');
      assert.equal(typeof task.meta.answerFormat, 'string', 'Python task must expose answerFormat');
      assert.equal(typeof task.meta.thinkingStyle, 'string', 'Python task must expose thinkingStyle');
      assert.ok(Array.isArray(task.meta.variationNotes), 'Python task must expose variationNotes');
      assert.ok(task.meta.variationNotes.length > 0, 'Python task must include variation notes');
      assert.ok(task.prompt.includes('Ожидаемый формат ответа') || task.prompt.includes('РћР¶РёРґР°РµРјС‹Р№ С„РѕСЂРјР°С‚ РѕС‚РІРµС‚Р°'), 'Python prompt must reflect answer format');

      answerFormats.add(task.meta.answerFormat);
      thinkingStyles.add(task.meta.thinkingStyle);
    }
  }

  assert.ok(answerFormats.size >= 2, 'Python kernel must vary answerFormat');
  assert.ok(thinkingStyles.size >= 2, 'Python kernel must vary thinkingStyle');

  console.log('Python variation guard passed.');
}

main();
