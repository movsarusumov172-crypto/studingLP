const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const modulePath = path.join(__dirname, '..', 'renderer', 'theoryContent.mjs');
  const theory = await import(pathToFileURL(modulePath).href);

  assert.ok(Array.isArray(theory.PYTHON_THEORY_TOPICS), 'PYTHON_THEORY_TOPICS must be an array');
  assert.ok(theory.PYTHON_THEORY_TOPICS.length >= 14, 'Expected at least 14 theory topics');

  for (const [index, topic] of theory.PYTHON_THEORY_TOPICS.entries()) {
    assert.equal(typeof topic.id, 'string', `topic ${index} must have id`);
    assert.equal(typeof topic.title, 'string', `topic ${index} must have title`);
    assert.equal(typeof topic.simpleExplanation, 'string', `topic ${index} must have simpleExplanation`);
    assert.equal(typeof topic.howItWorks, 'string', `topic ${index} must have howItWorks`);
    assert.ok(Array.isArray(topic.syntax), `topic ${index} must have syntax array`);
    assert.ok(Array.isArray(topic.examples), `topic ${index} must have examples array`);
    assert.ok(Array.isArray(topic.commonMistakes), `topic ${index} must have commonMistakes array`);
    assert.ok(Array.isArray(topic.importantNuances), `topic ${index} must have importantNuances array`);
    assert.ok(Array.isArray(topic.checklist), `topic ${index} must have checklist array`);
    assert.equal(typeof topic.practiceHint, 'string', `topic ${index} must have practiceHint`);
  }

  assert.equal(typeof theory.getTheoryTopicById, 'function', 'getTheoryTopicById must be exported');
  assert.equal(typeof theory.getTheoryPracticeRoute, 'function', 'getTheoryPracticeRoute must be exported');
  assert.equal(typeof theory.buildTheoryTopicList, 'function', 'buildTheoryTopicList must be exported');
  assert.equal(typeof theory.buildTheoryTopicHtml, 'function', 'buildTheoryTopicHtml must be exported');

  const firstTopic = theory.PYTHON_THEORY_TOPICS[0];
  assert.equal(theory.getTheoryTopicById(firstTopic.id).id, firstTopic.id, 'getTheoryTopicById must return matching topic');
  const firstRoute = theory.getTheoryPracticeRoute(firstTopic.id);
  assert.equal(firstRoute.topicId, firstTopic.id, 'getTheoryPracticeRoute must preserve topic id');
  assert.equal(firstRoute.practiceCategory, 'variables', 'variables topic must route to variables practice');

  const nav = theory.buildTheoryTopicList(firstTopic.id);
  assert.equal(typeof nav, 'string', 'buildTheoryTopicList must return a string');
  assert.ok(nav.includes(firstTopic.title), 'topic list should include the active topic title');

  const html = theory.buildTheoryTopicHtml(firstTopic);
  assert.equal(typeof html, 'string', 'buildTheoryTopicHtml must return a string');
  assert.ok(html.includes(firstTopic.simpleExplanation), 'topic html should include simple explanation');

  console.log('Theory content contract passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
