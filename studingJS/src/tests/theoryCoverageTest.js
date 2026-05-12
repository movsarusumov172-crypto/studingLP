const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const LANGUAGE_MODULES = [
  { id: 'js', label: 'JavaScript', file: 'theoryContent.js.mjs', minTopics: 12 },
  { id: 'python', label: 'Python', file: 'theoryContent.mjs', minTopics: 18 },
  { id: 'go', label: 'Go', file: 'theoryContent.go.mjs', minTopics: 10 },
  { id: 'c', label: 'C', file: 'theoryContent.c.mjs', minTopics: 10 },
  { id: 'cpp', label: 'C++', file: 'theoryContent.cpp.mjs', minTopics: 10 },
  { id: 'csharp', label: 'C#', file: 'theoryContent.csharp.mjs', minTopics: 10 },
  { id: 'java', label: 'Java', file: 'theoryContent.java.mjs', minTopics: 10 }
];

const REQUIRED_STRING_FIELDS = [
  'id',
  'title',
  'shortTitle',
  'simpleExplanation',
  'howItWorks',
  'practiceHint'
];

const REQUIRED_ARRAY_FIELDS = [
  'syntax',
  'examples',
  'commonMistakes',
  'importantNuances',
  'checklist'
];

async function importTheory(file) {
  const modulePath = path.join(__dirname, '..', 'renderer', file);
  return import(pathToFileURL(modulePath).href);
}

async function main() {
  let totalTopics = 0;

  for (const language of LANGUAGE_MODULES) {
    const theory = await importTheory(language.file);
    const topics = theory.THEORY_TOPICS;

    assert.ok(Array.isArray(topics), `${language.label} THEORY_TOPICS must be an array`);
    assert.ok(
      topics.length >= language.minTopics,
      `${language.label} theory needs at least ${language.minTopics} topics, got ${topics.length}`
    );

    const seenIds = new Set();
    for (const [index, topic] of topics.entries()) {
      for (const field of REQUIRED_STRING_FIELDS) {
        assert.equal(typeof topic[field], 'string', `${language.label} topic ${index} must have ${field}`);
        assert.ok(topic[field].trim().length > 0, `${language.label} topic ${topic.id || index} ${field} must not be empty`);
      }

      assert.ok(!seenIds.has(topic.id), `${language.label} topic id must be unique: ${topic.id}`);
      seenIds.add(topic.id);

      for (const field of REQUIRED_ARRAY_FIELDS) {
        assert.ok(Array.isArray(topic[field]), `${language.label}:${topic.id} must have ${field} array`);
        assert.ok(topic[field].length > 0, `${language.label}:${topic.id} ${field} must not be empty`);
      }

      if (topic.practiceCategory !== undefined) {
        assert.equal(typeof topic.practiceCategory, 'string', `${language.label}:${topic.id} practiceCategory must be a string when present`);
        assert.ok(topic.practiceCategory.trim().length > 0, `${language.label}:${topic.id} practiceCategory must not be empty`);
      }

      assert.ok(topic.examples.length >= 3, `${language.label}:${topic.id} should include at least 3 examples`);
      for (const example of topic.examples) {
        assert.equal(typeof example.title, 'string', `${language.label}:${topic.id} example must have title`);
        assert.equal(typeof example.note, 'string', `${language.label}:${topic.id} example must have note`);
        assert.equal(typeof example.code, 'string', `${language.label}:${topic.id} example must have code`);
      }

      const html = theory.buildTheoryTopicHtml(topic);
      assert.equal(typeof html, 'string', `${language.label}:${topic.id} should render html`);
      assert.ok(html.includes(topic.title), `${language.label}:${topic.id} html should include title`);
    }

    totalTopics += topics.length;
  }

  console.log(`Theory coverage contract passed for ${totalTopics} topics across ${LANGUAGE_MODULES.length} languages.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
