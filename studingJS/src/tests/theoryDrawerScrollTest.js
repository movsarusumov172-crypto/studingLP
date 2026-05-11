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

assert.match(panelBlock, /max-height:\s*calc\(100dvh\s*-\s*28px\)/, 'theory drawer panel must be bounded by viewport height');
assert.match(panelBlock, /overflow:\s*hidden/, 'theory drawer panel must hide outer overflow');
assert.match(bodyBlock, /min-height:\s*0/, 'theory drawer body must be shrinkable');
assert.match(navBlock, /overflow-y:\s*auto/, 'theory nav must scroll vertically');
assert.match(contentBlock, /overflow-y:\s*auto/, 'theory content must scroll vertically');
assert.match(contentBlock, /scrollbar-gutter:\s*stable/, 'theory content should reserve room for the scrollbar');

console.log('Theory drawer scroll contract passed.');
