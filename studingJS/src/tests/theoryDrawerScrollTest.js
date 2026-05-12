const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const cssPath = path.join(__dirname, '..', 'renderer', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');

function findBlock(selector) {
  const selectorIndex = css.indexOf(selector);
  assert.ok(selectorIndex >= 0, `${selector} block not found`);
  const startBrace = css.indexOf('{', selectorIndex);
  assert.ok(startBrace >= 0, `${selector} opening brace not found`);

  let depth = 0;
  for (let i = startBrace; i < css.length; i += 1) {
    const char = css[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(startBrace + 1, i);
      }
    }
  }

  throw new Error(`Unclosed CSS block for ${selector}`);
}

const panelBlock = findBlock('.theory-drawer-panel');
const bodyBlock = findBlock('.theory-drawer-body');
const navBlock = findBlock('.theory-nav');
const contentBlock = findBlock('.theory-content');
const topicCopyBlock = findBlock('.theory-topic-copy');
const topicCardBlock = findBlock('.theory-topic-card');
const topicToplineBlock = findBlock('.theory-topic-topline');
const blockBlock = findBlock('.theory-block');
const codeBlock = findBlock('.theory-code');
const exampleGridBlock = findBlock('.theory-example-grid');
const exampleCardBlock = findBlock('.theory-example-card');
const columnsBlock = findBlock('.theory-columns');

assert.match(panelBlock, /max-height:\s*calc\(100dvh\s*-\s*28px\)/, 'theory drawer panel must be bounded by viewport height');
assert.match(panelBlock, /overflow:\s*hidden/, 'theory drawer panel must hide outer overflow');
assert.match(bodyBlock, /min-height:\s*0/, 'theory drawer body must be shrinkable');
assert.match(navBlock, /overflow-y:\s*auto/, 'theory nav must scroll vertically');
assert.match(contentBlock, /overflow-y:\s*auto/, 'theory content must scroll vertically');
assert.match(contentBlock, /scrollbar-gutter:\s*stable/, 'theory content should reserve room for the scrollbar');
assert.match(topicCopyBlock, /min-width:\s*0/, 'theory nav copy must not widen the drawer');
assert.match(topicCardBlock, /min-width:\s*0/, 'theory topic card must shrink inside the content column');
assert.match(topicToplineBlock, /min-width:\s*0/, 'theory topic header must be shrinkable');
assert.match(blockBlock, /min-width:\s*0/, 'theory block must not widen the content column');
assert.match(codeBlock, /max-width:\s*100%/, 'theory code must stay inside its card');
assert.match(codeBlock, /white-space:\s*pre-wrap/, 'theory code should wrap long examples');
assert.match(codeBlock, /overflow-wrap:\s*anywhere/, 'theory code should break long tokens when needed');
assert.match(exampleGridBlock, /min-width:\s*0/, 'theory example grid must shrink inside the card');
assert.match(exampleCardBlock, /min-width:\s*0/, 'theory example card must shrink inside the grid');
assert.match(columnsBlock, /min-width:\s*0/, 'theory columns must shrink inside the card');

console.log('Theory drawer scroll contract passed.');
