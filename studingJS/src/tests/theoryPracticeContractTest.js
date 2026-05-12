const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const LANGUAGE_MODULES = [
  { id: 'js', label: 'JavaScript', theoryFile: 'theoryContent.js.mjs', kernelPath: '../kernels/js' },
  { id: 'python', label: 'Python', theoryFile: 'theoryContent.mjs', kernelPath: '../kernels/python' },
  { id: 'go', label: 'Go', theoryFile: 'theoryContent.go.mjs', kernelPath: '../kernels/go' },
  { id: 'c', label: 'C', theoryFile: 'theoryContent.c.mjs', kernelPath: '../kernels/c' },
  { id: 'cpp', label: 'C++', theoryFile: 'theoryContent.cpp.mjs', kernelPath: '../kernels/cpp' },
  { id: 'csharp', label: 'C#', theoryFile: 'theoryContent.csharp.mjs', kernelPath: '../kernels/csharp' },
  { id: 'java', label: 'Java', theoryFile: 'theoryContent.java.mjs', kernelPath: '../kernels/java' }
];

async function importTheory(theoryFile) {
  const modulePath = path.join(__dirname, '..', 'renderer', theoryFile);
  return import(pathToFileURL(modulePath).href);
}

function categoryKeys(kernel) {
  const categories = kernel.getCategories ? kernel.getCategories() : kernel.CATEGORY_META;
  return Object.keys(categories || {});
}

async function main() {
  let checkedTopics = 0;

  for (const language of LANGUAGE_MODULES) {
    const theory = await importTheory(language.theoryFile);
    const kernel = require(language.kernelPath);
    const categories = categoryKeys(kernel);

    assert.ok(categories.length > 0, `${language.label} kernel should expose practice categories`);
    assert.equal(typeof kernel.generateTask, 'function', `${language.label} kernel should generate tasks`);

    for (const topic of theory.THEORY_TOPICS) {
      const route = theory.getTheoryPracticeRoute(topic.id);
      assert.ok(route, `${language.label}:${topic.id} should have a practice route`);
      assert.ok(
        categories.includes(route.practiceCategory),
        `${language.label}:${topic.id} routes to missing category "${route.practiceCategory}"`
      );

      const task = await Promise.resolve(
        kernel.generateTask({
          categories: [route.practiceCategory],
          focusCategory: route.practiceCategory,
          randomMode: false,
          difficulty: 'easy',
          seed: `theory-practice-${language.id}-${topic.id}`,
          practiceTopicId: topic.id,
          practiceTopicTitle: topic.title
        })
      );

      assert.ok(task, `${language.label}:${topic.id} should generate a practice task`);
      assert.equal(task.kernelId, language.id, `${language.label}:${topic.id} should keep kernel id`);
      assert.equal(task.category, route.practiceCategory, `${language.label}:${topic.id} should use route category`);
      assert.equal(task.meta?.practiceTopicId, topic.id, `${language.label}:${topic.id} should mark topic id`);
      assert.equal(task.meta?.practiceTopicTitle, topic.title, `${language.label}:${topic.id} should mark topic title`);
      assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `${language.label}:${topic.id} should include tests`);

      checkedTopics += 1;
    }
  }

  console.log(`Theory-practice contract passed for ${checkedTopics} topics.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
