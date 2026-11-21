// Pure markup builders for every TRMNL layout.
//
// Sizing strategy (TRMNL framework 3.x):
// - The platform picks the screen (OG 800x480, TRMNL X 1040x780, portrait, ...) and adds screen--sm/md/lg,
//   screen--portrait and bit-depth classes. We never branch on device in JS; framework classes with
//   lg: / portrait: / lg:portrait: prefixes do the scaling.
// - Graphics are inline SVG with a viewBox, black and white only (no hex colours: they dither badly).
// - TRMNL parses every markup string as Liquid, so nothing here may contain "{{" or "{%". esc() also
//   encodes { and } so user-supplied text (instance name) can never form a Liquid tag.
// - title_bar is a sibling of .layout inside .view.

const FILL = 'width:100%;height:100%;min-width:0;min-height:0';
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function esc(s) {
  return String(s).replace(/[&<>"'{}]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '{': '&#123;', '}': '&#125;',
  })[c]);
}

// Mon..Sun strip with today inverted. Scales to the width it is given.
function dayStripSvg(w) {
  const cells = w.days
    .map((d, i) => {
      const x = i * 40;
      const today = i + 1 === w.weekday;
      const ink = today ? 'white' : 'black';
      return `<rect x="${x + 2}" y="2" width="36" height="52" rx="5" fill="${today ? 'black' : 'none'}" stroke="black" stroke-width="${today ? 0 : 1.5}"/>
<text x="${x + 20}" y="21" text-anchor="middle" font-size="13" fill="${ink}" style="font-family:var(--label-font-family, sans-serif)">${DAY_LETTERS[i]}</text>
<text x="${x + 20}" y="45" text-anchor="middle" font-size="19" font-weight="700" fill="${ink}" style="font-family:var(--value-font-family, sans-serif)">${d}</text>`;
    })
    .join('\n');
  return `<svg viewBox="0 0 280 56" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Week ${w.week}, day ${w.weekday} of 7">
${cells}
</svg>`;
}

// Bar showing how far through the ISO year this week is.
function yearBarSvg(w) {
  const pct = Math.max(0, Math.min(1, w.week / w.weeksInYear));
  return `<svg viewBox="0 0 300 14" preserveAspectRatio="none" style="display:block;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Week ${w.week} of ${w.weeksInYear}">
<rect x="1" y="1" width="298" height="12" fill="none" stroke="black" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
<rect x="1" y="1" width="${(298 * pct).toFixed(1)}" height="12" fill="black"/>
</svg>`;
}

function titleBar(baseUrl, instance) {
  return `<div class="title_bar">
<img class="image" src="${esc(baseUrl)}/icon.svg" alt="">
<span class="title">Week Number</span>
<span class="instance">${esc(instance || 'ISO 8601')}</span>
</div>`;
}

// Type ramps. Base = OG (800x480), lg: = TRMNL X, lg:portrait: = TRMNL X held upright (most room, biggest type).
const T = {
  rowLabel: 'label lg:label--large lg:portrait:label--xlarge',
  rowValue: 'value value--xsmall lg:value--small lg:portrait:value--base value--tnums',
  caption: 'description description--large lg:description--xlarge lg:portrait:description--xxlarge',
};

// Stacked "Label  value" rows: read better than one long "A · B · C" line and grow with the screen.
// fit: shrink to content width instead of stretching (keeps label and value close on wide slots).
function rows(items, { cls = T, display = 'flex', fit = false } = {}) {
  const body = items
    .map(([label, value]) => `<div class="flex flex--row" style="justify-content:space-between;align-items:baseline;gap:20px">
<span class="${cls.rowLabel}">${esc(label)}</span>
<span class="${cls.rowValue}" style="white-space:nowrap">${esc(value)}</span>
</div>`)
    .join('');
  return `<div class="${display} flex--col" style="align-items:stretch;gap:4px;min-width:0${fit ? ';width:max-content;max-width:100%' : ''}">${body}</div>`;
}

function infoRows(w) {
  return [
    ['Monday', w.monday],
    ['Sunday', w.sunday],
    ['Week-year', String(w.year)],
  ];
}

function yearProgress(w, extraClass = '') {
  return `<div class="flex flex--col ${extraClass}" style="gap:4px;align-items:stretch;min-width:0">
<div style="height:14px">${yearBarSvg(w)}</div>
<span class="${T.caption}">Week ${w.week} of ${w.weeksInYear}</span>
</div>`;
}

function full(w, ctx) {
  return `<div class="view view--full">
<div class="layout">
<div class="flex flex--row portrait:flex--col gap--xlarge" style="${FILL};align-items:stretch">
  <div class="flex flex--col" style="flex:1 1 0;min-width:0;min-height:0;justify-content:center;align-items:center">
    <span class="title title--large lg:title--xlarge lg:portrait:title--xxlarge">Week</span>
    <span class="value value--mega lg:value--giga lg:portrait:value--tera value--tnums">${w.week}</span>
    <span class="title title--large lg:title--xlarge lg:portrait:title--xxlarge">of ${w.year}</span>
  </div>
  <div class="flex flex--col gap--medium" style="flex:1 1 0;min-width:0;min-height:0;justify-content:center;align-items:stretch">
    ${rows(infoRows(w))}
    <div class="h--16 lg:h--20 lg:portrait:h--28" style="max-width:100%;width:100%">${dayStripSvg(w)}</div>
    ${yearProgress(w)}
  </div>
</div>
</div>
${titleBar(ctx.baseUrl, ctx.instance)}
</div>`;
}

// Landscape: number | rows | day strip side by side. Portrait slots are narrower, so the strip moves under the rows.
function halfHorizontal(w, ctx) {
  return `<div class="view view--half_horizontal">
<div class="layout">
<div class="flex flex--row gap--xlarge" style="${FILL};align-items:center;justify-content:center">
  <div class="flex flex--col" style="flex:0 0 auto;align-items:center;justify-content:center">
    <span class="label lg:label--large lg:portrait:label--xlarge">Week</span>
    <span class="value value--xxxlarge lg:value--mega lg:portrait:value--giga value--tnums">${w.week}</span>
  </div>
  <div class="flex flex--col gap--small" style="flex:0 1 auto;min-width:0;justify-content:center;align-items:stretch">
    ${rows(infoRows(w), { fit: true })}
    <div class="hidden portrait:block h--12 lg:portrait:h--20">${dayStripSvg(w)}</div>
  </div>
  <div class="portrait:hidden h--14 lg:h--20" style="flex:1 1 0;min-width:0;max-width:420px">${dayStripSvg(w)}</div>
</div>
</div>
${titleBar(ctx.baseUrl, ctx.instance)}
</div>`;
}

function halfVertical(w, ctx) {
  return `<div class="view view--half_vertical">
<div class="layout">
<div class="flex flex--col gap--medium" style="${FILL};align-items:stretch;justify-content:center">
  <div class="flex flex--col" style="align-items:center">
    <span class="title lg:title--large lg:portrait:title--xlarge">Week</span>
    <span class="value value--xxxlarge lg:value--mega lg:portrait:value--giga value--tnums">${w.week}</span>
    <span class="title lg:title--large lg:portrait:title--xlarge">of ${w.year}</span>
  </div>
  ${rows([['Monday', w.monday], ['Sunday', w.sunday]])}
  <div class="h--12 lg:h--16 lg:portrait:h--20">${dayStripSvg(w)}</div>
  ${yearProgress(w)}
</div>
</div>
${titleBar(ctx.baseUrl, ctx.instance)}
</div>`;
}

// Quadrant gets no portrait type step (TRMNL X quadrants are the same size in both orientations).
// On TRMNL X there is room for the Monday/Sunday dates, the week-year and a full-width day strip;
// smaller screens show week number + year only.
function quadrant(w, ctx) {
  const qRows = { rowLabel: 'label label--large', rowValue: 'value value--small value--tnums' };
  return `<div class="view view--quadrant">
<div class="layout">
<div class="flex flex--col gap--medium" style="${FILL};align-items:stretch;justify-content:center">
  <div class="flex flex--row gap--xlarge" style="align-items:center;justify-content:center">
    <div class="flex flex--col" style="flex:0 0 auto;align-items:center">
      <span class="label lg:label--large">Week</span>
      <span class="value value--xxlarge lg:value--xxxlarge value--tnums">${w.week}</span>
      <span class="label lg:hidden">${w.year}</span>
    </div>
    <div class="hidden lg:flex" style="flex:0 1 auto;min-width:0">
      ${rows([['Mon', w.monday], ['Sun', w.sunday], ['Year', String(w.year)]], { cls: qRows, fit: true })}
    </div>
  </div>
  <div class="hidden lg:block h--14">${dayStripSvg(w)}</div>
</div>
</div>
${titleBar(ctx.baseUrl, ctx.instance)}
</div>`;
}

// w: result of weekInfo(); ctx: { baseUrl, instance }
function renderAll(w, ctx = {}) {
  return {
    markup: full(w, ctx),
    markup_half_horizontal: halfHorizontal(w, ctx),
    markup_half_vertical: halfVertical(w, ctx),
    markup_quadrant: quadrant(w, ctx),
    shared: '',
  };
}

module.exports = { renderAll, esc, dayStripSvg, yearBarSvg };
