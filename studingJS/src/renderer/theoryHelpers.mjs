function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items, className = 'theory-bullets') {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSyntaxBlock(snippets) {
  if (!Array.isArray(snippets) || snippets.length === 0) return '';
  return `
    <section class="theory-block">
      <div class="theory-block-label">Синтаксис</div>
      ${snippets.map((s) => `<pre class="theory-code"><code>${escapeHtml(s)}</code></pre>`).join('')}
    </section>`;
}

function renderExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) return '';
  return `
    <section class="theory-block">
      <div class="theory-block-label">Примеры</div>
      <div class="theory-example-grid">
        ${examples.map((ex) => `
          <article class="theory-example-card">
            <div class="theory-example-title">${escapeHtml(ex.title)}</div>
            <div class="theory-example-note">${escapeHtml(ex.note || '')}</div>
            <pre class="theory-code"><code>${escapeHtml(ex.code)}</code></pre>
          </article>`).join('')}
      </div>
    </section>`;
}

function buildTheoryTopicList(topics, activeId) {
  return topics.map((topic, i) => `
    <button type="button"
      class="theory-topic-button ${topic.id === activeId ? 'active' : ''}"
      data-theory-topic="${escapeHtml(topic.id)}"
      aria-pressed="${topic.id === activeId}"
    >
      <span class="theory-topic-index">${String(i + 1).padStart(2, '0')}</span>
      <span class="theory-topic-copy">
        <strong>${escapeHtml(topic.title)}</strong>
        <small>${escapeHtml(topic.shortTitle || topic.title)}</small>
      </span>
    </button>`).join('');
}

function buildTheoryTopicHtml(topic, languageLabel = 'Теория') {
  if (!topic) return '<div class="theory-empty">Тема не найдена.</div>';
  return `
    <article class="theory-topic-card">
      <div class="theory-topic-topline">
        <div>
          <div class="eyebrow">${escapeHtml(languageLabel)}</div>
          <h3>${escapeHtml(topic.title)}</h3>
        </div>
        <div class="theory-practice-pill">Готово к практике</div>
      </div>

      <section class="theory-block">
        <div class="theory-block-label">Просто</div>
        <p class="theory-lead">${escapeHtml(topic.simpleExplanation)}</p>
      </section>

      <section class="theory-block">
        <div class="theory-block-label">Как это работает</div>
        <p>${escapeHtml(topic.howItWorks)}</p>
      </section>

      ${renderSyntaxBlock(topic.syntax)}
      ${renderExamples(topic.examples)}

      <section class="theory-block theory-columns">
        <div>
          <div class="theory-block-label">Частые ошибки</div>
          ${renderList(topic.commonMistakes, 'theory-bullets danger')}
        </div>
        <div>
          <div class="theory-block-label">Важные нюансы</div>
          ${renderList(topic.importantNuances, 'theory-bullets')}
        </div>
      </section>

      <section class="theory-block theory-columns">
        <div>
          <div class="theory-block-label">Мини-чеклист</div>
          ${renderList(topic.checklist, 'theory-bullets success')}
        </div>
        <div class="theory-practice-card">
          <div class="theory-block-label">Переход к практике</div>
          <p>${escapeHtml(topic.practiceHint)}</p>
        </div>
      </section>
    </article>`;
}

export { escapeHtml, buildTheoryTopicList, buildTheoryTopicHtml };
