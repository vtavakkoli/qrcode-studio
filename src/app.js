/* QR Code Studio application. No network calls, analytics, or external dependencies. */
const TYPES = [
  { id: 'link', icon: '↗', label: 'Link' },
  { id: 'text', icon: '≡', label: 'Text' },
  { id: 'email', icon: '✉', label: 'E-mail' },
  { id: 'call', icon: '☎', label: 'Call' },
  { id: 'sms', icon: 'SMS', label: 'SMS' },
  { id: 'vcard', icon: 'ID', label: 'V-card' },
  { id: 'whatsapp', icon: 'WA', label: 'WhatsApp' },
  { id: 'wifi', icon: '⌁', label: 'Wi-Fi' },
  { id: 'location', icon: '⌖', label: 'Location' },
  { id: 'pdf', icon: 'PDF', label: 'PDF' },
  { id: 'app', icon: '▣', label: 'App' },
  { id: 'images', icon: '▧', label: 'Images' },
  { id: 'video', icon: '▶', label: 'Video' },
  { id: 'social', icon: '●', label: 'Social Media' },
  { id: 'event', icon: '▦', label: 'Event' },
  { id: 'barcode', icon: 'Ⅱ', label: '2D Data' },
];

const SCHEMAS = {
  link: { fields: [field('url', 'Website', 'url', 'https://example.com', { full: true, required: true })] },
  text: { fields: [field('text', 'Text', 'textarea', 'Type any text, note, or message', { full: true, required: true })] },
  email: { fields: [
    field('to', 'Recipient', 'email', 'name@example.com', { required: true }),
    field('subject', 'Subject', 'text', 'QR code message'),
    field('body', 'Message', 'textarea', 'Write the e-mail body', { full: true }),
  ] },
  call: { fields: [field('phone', 'Phone number', 'tel', '+43 1 2345678', { full: true, required: true })] },
  sms: { fields: [
    field('phone', 'Phone number', 'tel', '+43 660 1234567', { required: true }),
    field('body', 'SMS message', 'textarea', 'Hello!', { full: true }),
  ] },
  vcard: { fields: [
    field('name', 'Full name', 'text', 'Jane Doe', { required: true }),
    field('org', 'Organization', 'text', 'Example GmbH'),
    field('title', 'Job title', 'text', 'Product Manager'),
    field('phone', 'Phone', 'tel', '+43 660 1234567'),
    field('email', 'E-mail', 'email', 'jane@example.com'),
    field('url', 'Website', 'url', 'https://example.com'),
    field('address', 'Address', 'text', 'Vienna, Austria', { full: true }),
    field('note', 'Note', 'textarea', 'Optional note', { full: true }),
  ] },
  whatsapp: { fields: [
    field('phone', 'Phone number', 'tel', '436601234567', { required: true }),
    field('body', 'Pre-filled message', 'textarea', 'Hello!', { full: true }),
  ] },
  wifi: { fields: [
    field('ssid', 'Network name (SSID)', 'text', 'My Wi-Fi', { required: true }),
    field('password', 'Password', 'password', 'password'),
    selectField('security', 'Security', ['WPA', 'WEP', 'None'], 'WPA'),
    selectField('hidden', 'Hidden network', ['No', 'Yes'], 'No'),
  ] },
  location: { fields: [
    field('latitude', 'Latitude', 'number', '48.2082', { required: true, step: 'any' }),
    field('longitude', 'Longitude', 'number', '16.3738', { required: true, step: 'any' }),
    field('label', 'Label', 'text', 'Vienna', { full: true }),
  ] },
  pdf: { fields: [field('url', 'PDF URL', 'url', 'https://example.com/document.pdf', { full: true, required: true })] },
  app: { fields: [field('url', 'App Store / Play Store URL', 'url', 'https://', { full: true, required: true })] },
  images: { fields: [field('url', 'Image or gallery URL', 'url', 'https://', { full: true, required: true })] },
  video: { fields: [field('url', 'Video URL', 'url', 'https://', { full: true, required: true })] },
  social: { fields: [field('url', 'Social profile or post URL', 'url', 'https://', { full: true, required: true })] },
  event: { fields: [
    field('title', 'Event title', 'text', 'My event', { required: true }),
    field('location', 'Location', 'text', 'Vienna'),
    field('start', 'Start', 'datetime-local', '', { required: true }),
    field('end', 'End', 'datetime-local', ''),
    field('description', 'Description', 'textarea', 'Event details', { full: true }),
  ] },
  barcode: { fields: [field('text', 'Identifier / data', 'textarea', '1234567890', { full: true, required: true })] },
};

const DEFAULT_DESIGN = Object.freeze({
  frame: 'none',
  frameText: 'SCAN ME',
  shape: 'square',
  logoSize: 18,
  fg: '#17233f',
  bg: '#ffffff',
  ecc: 'M',
  quiet: 4,
  pngSize: 1024,
});

let state = {
  type: 'link',
  forms: {},
  ...loadDesign(),
  logo: null,
  svg: '',
  qr: null,
  payload: '',
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function field(id, label, type, placeholder, options = {}) {
  return { id, label, type, placeholder, ...options };
}
function selectField(id, label, options, value) {
  return { id, label, type: 'select', options, value };
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
function xmlEsc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[char]));
}
function vEscape(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function icsEscape(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function normalizeUrl(raw) {
  const input = String(raw || '').trim();
  if (!input) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch { return ''; }
}
function currentForm() {
  state.forms[state.type] ||= {};
  return state.forms[state.type];
}
function val(id) {
  return String(currentForm()[id] ?? '').trim();
}
function rawVal(id) {
  return String(currentForm()[id] ?? '');
}
function setFormValue(id, value) {
  currentForm()[id] = value;
}
function loadDesign() {
  try {
    const parsed = JSON.parse(localStorage.getItem('qr-studio-design') || '{}');
    const merged = { ...DEFAULT_DESIGN, ...parsed };
    if (!/^#[0-9a-f]{6}$/i.test(merged.fg)) merged.fg = DEFAULT_DESIGN.fg;
    if (!/^#[0-9a-f]{6}$/i.test(merged.bg)) merged.bg = DEFAULT_DESIGN.bg;
    if (!['none', 'border', 'label'].includes(merged.frame)) merged.frame = DEFAULT_DESIGN.frame;
    if (!['square', 'rounded', 'dots'].includes(merged.shape)) merged.shape = DEFAULT_DESIGN.shape;
    if (!['L', 'M', 'Q', 'H'].includes(merged.ecc)) merged.ecc = DEFAULT_DESIGN.ecc;
    return merged;
  } catch { return { ...DEFAULT_DESIGN }; }
}
function saveDesign() {
  try {
    const design = {
      frame: state.frame,
      frameText: state.frameText,
      shape: state.shape,
      logoSize: state.logoSize,
      fg: state.fg,
      bg: state.bg,
      ecc: state.ecc,
      quiet: state.quiet,
      pngSize: state.pngSize,
    };
    localStorage.setItem('qr-studio-design', JSON.stringify(design));
  } catch { /* Storage can be unavailable in privacy modes; the app still works. */ }
}

function initTypes() {
  const grid = $('#typeGrid');
  grid.innerHTML = TYPES.map(({ id, icon, label }) => `
    <button type="button" class="type-btn ${id === state.type ? 'active' : ''}" data-type="${id}"
      aria-pressed="${id === state.type}">
      <span class="ico" aria-hidden="true">${esc(icon)}</span><span>${esc(label)}</span>
    </button>`).join('');

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.type-btn');
    if (!button) return;
    state.type = button.dataset.type;
    $$('.type-btn').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderFields();
    update();
  });
}

function renderFields() {
  const schema = SCHEMAS[state.type];
  const form = currentForm();
  const host = $('#contentFields');
  host.innerHTML = schema.fields.map((item) => {
    const id = `field-${state.type}-${item.id}`;
    let control;
    if (item.type === 'textarea') {
      control = `<textarea id="${id}" data-field="${item.id}" placeholder="${esc(item.placeholder)}" ${item.required ? 'required' : ''}>${esc(form[item.id] ?? '')}</textarea>`;
    } else if (item.type === 'select') {
      const current = form[item.id] ?? item.value ?? item.options[0];
      control = `<select id="${id}" data-field="${item.id}">${item.options.map((option) => `<option ${option === current ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
      if (form[item.id] == null) form[item.id] = current;
    } else {
      const attrs = [
        `id="${id}"`, `data-field="${item.id}"`, `type="${item.type}"`, `placeholder="${esc(item.placeholder)}"`,
        item.required ? 'required' : '', item.step ? `step="${esc(item.step)}"` : '',
        `value="${esc(form[item.id] ?? '')}"`,
      ].filter(Boolean).join(' ');
      control = `<input ${attrs}>`;
    }
    return `<div class="field ${item.full ? 'full' : ''}"><label for="${id}">${esc(item.label)}${item.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>${control}</div>`;
  }).join('');

  host.querySelectorAll('input,textarea,select').forEach((control) => {
    const handler = () => {
      setFormValue(control.dataset.field, control.value);
      update();
    };
    control.addEventListener('input', handler);
    control.addEventListener('change', handler);
  });
}

function dateToIcs(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function buildPayload() {
  const type = state.type;
  if (['link', 'pdf', 'app', 'images', 'video', 'social'].includes(type)) {
    if (!val('url')) return { value: '', error: '' };
    const url = normalizeUrl(val('url'));
    return url ? { value: url, error: '' } : { value: '', error: 'Enter a valid http:// or https:// URL.' };
  }

  switch (type) {
    case 'text':
    case 'barcode':
      return { value: rawVal('text').trim(), error: '' };
    case 'email': {
      const to = val('to');
      if (!to) return { value: '', error: '' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { value: '', error: 'Enter a valid e-mail address.' };
      const query = [];
      if (rawVal('subject')) query.push(`subject=${encodeURIComponent(rawVal('subject'))}`);
      if (rawVal('body')) query.push(`body=${encodeURIComponent(rawVal('body'))}`);
      return { value: `mailto:${to}${query.length ? `?${query.join('&')}` : ''}`, error: '' };
    }
    case 'call': {
      const phone = val('phone');
      return { value: phone ? `tel:${phone.replace(/\s+/g, '')}` : '', error: '' };
    }
    case 'sms': {
      const phone = val('phone').replace(/\s+/g, '');
      if (!phone) return { value: '', error: '' };
      return { value: `SMSTO:${phone}:${rawVal('body')}`, error: '' };
    }
    case 'whatsapp': {
      const number = val('phone').replace(/\D/g, '');
      if (!number) return { value: '', error: val('phone') ? 'Enter a phone number with country code.' : '' };
      return { value: `https://wa.me/${number}${rawVal('body') ? `?text=${encodeURIComponent(rawVal('body'))}` : ''}`, error: '' };
    }
    case 'wifi': {
      const ssid = rawVal('ssid').trim();
      if (!ssid) return { value: '', error: '' };
      const security = val('security') || 'WPA';
      if (security !== 'None' && !rawVal('password')) return { value: '', error: 'Enter a Wi-Fi password or choose “None” for an open network.' };
      const quote = (text) => String(text).replace(/([\\;,:"'])/g, '\\$1');
      const sec = security === 'None' ? 'nopass' : security;
      const hidden = val('hidden') === 'Yes' ? 'true' : 'false';
      return { value: `WIFI:T:${sec};S:${quote(ssid)};P:${quote(rawVal('password'))};H:${hidden};;`, error: '' };
    }
    case 'vcard': {
      const name = val('name');
      if (!name) return { value: '', error: '' };
      const email = val('email');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { value: '', error: 'Enter a valid vCard e-mail address.' };
      const urlRaw = val('url');
      const url = urlRaw ? normalizeUrl(urlRaw) : '';
      if (urlRaw && !url) return { value: '', error: 'Enter a valid vCard website URL.' };
      const lines = [
        'BEGIN:VCARD', 'VERSION:3.0', `FN:${vEscape(name)}`,
        val('org') ? `ORG:${vEscape(val('org'))}` : '',
        val('title') ? `TITLE:${vEscape(val('title'))}` : '',
        val('phone') ? `TEL;TYPE=CELL:${vEscape(val('phone'))}` : '',
        email ? `EMAIL:${vEscape(email)}` : '',
        url ? `URL:${vEscape(url)}` : '',
        val('address') ? `ADR;TYPE=WORK:;;${vEscape(val('address'))};;;;` : '',
        rawVal('note') ? `NOTE:${vEscape(rawVal('note'))}` : '',
        'END:VCARD',
      ].filter(Boolean);
      return { value: lines.join('\r\n'), error: '' };
    }
    case 'location': {
      if (!val('latitude') && !val('longitude')) return { value: '', error: '' };
      const lat = Number(val('latitude'));
      const lon = Number(val('longitude'));
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { value: '', error: 'Latitude must be between −90 and 90.' };
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { value: '', error: 'Longitude must be between −180 and 180.' };
      const label = val('label') ? `?q=${lat},${lon}(${encodeURIComponent(val('label'))})` : '';
      return { value: `geo:${lat},${lon}${label}`, error: '' };
    }
    case 'event': {
      const title = val('title');
      if (!title) return { value: '', error: '' };
      if (!val('start')) return { value: '', error: 'Choose an event start date and time.' };
      const start = new Date(val('start'));
      const end = val('end') ? new Date(val('end')) : null;
      if (end && end < start) return { value: '', error: 'Event end must be after the start.' };
      const uidSeed = `${title}|${val('start')}|${val('location')}`;
      const uid = `${simpleHash(uidSeed)}@offline-qr-studio`;
      const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QR Code Studio//Offline//EN', 'BEGIN:VEVENT',
        `UID:${uid}`, `DTSTART:${dateToIcs(val('start'))}`,
        val('end') ? `DTEND:${dateToIcs(val('end'))}` : '',
        `SUMMARY:${icsEscape(title)}`,
        val('location') ? `LOCATION:${icsEscape(val('location'))}` : '',
        rawVal('description') ? `DESCRIPTION:${icsEscape(rawVal('description'))}` : '',
        'END:VEVENT', 'END:VCALENDAR',
      ].filter(Boolean);
      return { value: lines.join('\r\n'), error: '' };
    }
    default: return { value: '', error: '' };
  }
}

function simpleHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function inFinder(x, y, size) {
  return (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
}

function makeSvg(qr) {
  const quiet = Number(state.quiet);
  const foreground = state.fg;
  const background = state.bg;
  const size = qr.size;
  const hasLabel = state.frame === 'label';
  const hasBorder = state.frame !== 'none';
  const framePadding = hasBorder ? 2 : 0;
  const total = size + 2 * quiet + framePadding * 2;
  const extra = hasLabel ? 7 : 0;
  const viewHeight = total + extra;
  const accessibleLabel = `${TYPES.find((item) => item.id === state.type)?.label || 'QR'} QR code`;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${viewHeight}" width="1024" height="${Math.round(1024 * viewHeight / total)}" role="img" aria-label="${xmlEsc(accessibleLabel)}">`;
  svg += `<rect width="${total}" height="${viewHeight}" fill="${background}"/>`;
  if (hasBorder) svg += `<rect x="0.7" y="0.7" width="${total - 1.4}" height="${viewHeight - 1.4}" rx="2.2" fill="none" stroke="${foreground}" stroke-width="0.75"/>`;

  const ox = quiet + framePadding;
  const oy = quiet + framePadding;
  let dataModules = '';
  let functionModules = '';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!qr.modules[y][x] || inFinder(x, y, size)) continue;
      const X = ox + x;
      const Y = oy + y;
      if (qr.isFunction[y][x]) {
        functionModules += `<rect x="${X}" y="${Y}" width="1" height="1"/>`;
      } else if (state.shape === 'square') {
        dataModules += `<rect x="${X}" y="${Y}" width="1" height="1"/>`;
      } else if (state.shape === 'rounded') {
        dataModules += `<rect x="${X + 0.055}" y="${Y + 0.055}" width="0.89" height="0.89" rx="0.22"/>`;
      } else {
        dataModules += `<circle cx="${X + 0.5}" cy="${Y + 0.5}" r="0.445"/>`;
      }
    }
  }
  svg += `<g fill="${foreground}">${functionModules}${dataModules}</g>`;

  const eyeRadius = state.shape === 'square' ? 0 : 0.55;
  const eyeCoreRadius = state.shape === 'dots' ? 1.4 : (state.shape === 'rounded' ? 0.3 : 0);
  const eye = (x, y) => `<g><rect x="${ox + x}" y="${oy + y}" width="7" height="7" rx="${eyeRadius}" fill="${foreground}"/><rect x="${ox + x + 1}" y="${oy + y + 1}" width="5" height="5" rx="${eyeRadius ? 0.35 : 0}" fill="${background}"/><rect x="${ox + x + 2}" y="${oy + y + 2}" width="3" height="3" rx="${eyeCoreRadius}" fill="${foreground}"/></g>`;
  svg += eye(0, 0) + eye(size - 7, 0) + eye(0, size - 7);

  if (state.logo) {
    const logoSize = size * (state.logoSize / 100);
    const cx = ox + size / 2;
    const cy = oy + size / 2;
    svg += `<rect x="${cx - logoSize / 2 - 0.7}" y="${cy - logoSize / 2 - 0.7}" width="${logoSize + 1.4}" height="${logoSize + 1.4}" rx="1.15" fill="${background}"/>`;
    svg += `<image href="${xmlEsc(state.logo)}" x="${cx - logoSize / 2}" y="${cy - logoSize / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  if (hasLabel) {
    const label = (state.frameText || 'SCAN ME').trim().slice(0, 32);
    svg += `<text x="${total / 2}" y="${viewHeight - 2.1}" text-anchor="middle" fill="${foreground}" font-family="Arial,sans-serif" font-size="3.1" font-weight="700">${xmlEsc(label)}</text>`;
  }
  return `${svg}</svg>`;
}

function placeholder() {
  const size = 21;
  const quiet = 3;
  const total = size + quiet * 2;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const eye = (sx, sy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      modules[sy + y][sx + x] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
    }
  };
  eye(0, 0); eye(14, 0); eye(0, 14);
  for (let i = 8; i < 20; i++) { modules[10][i] = i % 2 === 0; modules[i][10] = i % 3 === 0; }
  for (let y = 8; y < size; y++) for (let x = 8; x < size; x++) if ((x * 3 + y * 5) % 7 < 2) modules[y][x] = true;
  let svg = `<svg viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100%" height="100%" fill="#fff"/><g fill="#cfd6dd">`;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) svg += `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`;
  return `${svg}</g></svg>`;
}

function hexRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}
function relativeLuminance(hex) {
  const channels = hexRgb(hex).map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function qualityInfo() {
  const contrast = contrastRatio(state.fg, state.bg);
  const fgLum = relativeLuminance(state.fg);
  const bgLum = relativeLuminance(state.bg);
  let score = 100;
  const warnings = [];
  if (contrast < 4.5) { score -= 45; warnings.push('Low contrast'); }
  else if (contrast < 7) { score -= 10; warnings.push('Moderate contrast'); }
  if (fgLum >= bgLum) { score -= 35; warnings.push('Use a darker foreground'); }
  if (state.shape === 'dots') score -= 8;
  if (state.logo && state.logoSize > 20) { score -= 10; warnings.push('Large logo'); }
  if (state.logo && state.ecc !== 'H') score -= 20;
  if (state.quiet < 4) { score -= 30; warnings.push('Quiet zone too small'); }
  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Fair' : 'Risky';
  return { contrast, label, warnings };
}

function updateQualityUi() {
  const info = qualityInfo();
  $('#contrastValue').textContent = `${info.contrast.toFixed(1)}:1`;
  $('#qualityLabel').textContent = info.label;
  $('#qualityLabel').dataset.level = info.label.toLowerCase();
  $('#qualityHint').textContent = info.warnings.length ? info.warnings.join(' · ') : 'High-contrast design with a standards-compliant quiet zone.';
}

function setError(message) {
  const element = $('#payloadError');
  element.textContent = message || '';
  element.classList.toggle('show', Boolean(message));
}

function update() {
  const { value: payloadValue, error } = buildPayload();
  state.payload = payloadValue;
  setError(error);
  updateQualityUi();
  saveDesign();

  const preview = $('#preview');
  const canGenerate = payloadValue && !error;
  if (!canGenerate) {
    state.qr = null;
    state.svg = '';
    preview.classList.add('placeholder');
    preview.innerHTML = placeholder();
    setExportEnabled(false);
    $('#statusDot').className = `dot${error ? ' error' : ''}`;
    $('#statusText').textContent = error || 'Enter content to generate a QR code';
    $('#qrMeta').textContent = '—';
    return;
  }

  try {
    const effectiveEcc = state.logo ? 'H' : state.ecc;
    const qr = QRCode.encodeText(payloadValue, effectiveEcc, -1);
    state.qr = qr;
    state.svg = makeSvg(qr);
    preview.innerHTML = state.svg;
    preview.classList.remove('placeholder');
    setExportEnabled(true);
    $('#statusDot').className = 'dot ready';
    $('#statusText').textContent = 'Ready to scan';
    const modeLabel = { numeric: 'Numeric', alphanumeric: 'Alnum', byte: 'Byte' }[qr.mode] || 'Byte';
    $('#qrMeta').textContent = `V${qr.version} · ${effectiveEcc} · Mask ${qr.mask} · ${modeLabel}`;
  } catch (exception) {
    state.qr = null;
    state.svg = '';
    preview.innerHTML = placeholder();
    preview.classList.add('placeholder');
    setExportEnabled(false);
    $('#statusDot').className = 'dot error';
    $('#statusText').textContent = 'Cannot generate';
    $('#qrMeta').textContent = 'Too large';
    setError(exception?.message || 'Unable to generate this QR code.');
  }
}

function setExportEnabled(enabled) {
  ['downloadPng', 'downloadSvg', 'copySvg', 'printQr'].forEach((id) => { $(`#${id}`).disabled = !enabled; });
}

function selectOptions(hostSelector, stateKey) {
  $(hostSelector).addEventListener('click', (event) => {
    const button = event.target.closest('.option');
    if (!button) return;
    $(hostSelector).querySelectorAll('.option').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    state[stateKey] = button.dataset.value;
    if (stateKey === 'frame') $('#frameTextWrap').hidden = state.frame !== 'label';
    update();
  });
}

function downloadBlob(blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function exportBaseName() {
  const type = state.type.replace(/[^a-z0-9_-]/gi, '-');
  return `qr-${type}`;
}
function downloadSvg() {
  if (!state.svg) return;
  downloadBlob(new Blob([state.svg], { type: 'image/svg+xml;charset=utf-8' }), `${exportBaseName()}.svg`);
}
function downloadPng() {
  if (!state.svg) return;
  const requestedSize = Number(state.pngSize);
  const svgBlob = new Blob([state.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const ratio = image.naturalHeight / image.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = requestedSize;
    canvas.height = Math.round(requestedSize * ratio);
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `${exportBaseName()}.png`); }, 'image/png');
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

async function copyText(text, button, successText = 'Copied') {
  if (!text) return;
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { /* Use fallback below. */ }
  if (!copied) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    copied = document.execCommand('copy');
    area.remove();
  }
  if (copied && button) {
    const old = button.textContent;
    button.textContent = successText;
    setTimeout(() => { button.textContent = old; }, 1000);
  }
}

function sanitizeLogo(file) {
  return new Promise((resolve, reject) => {
    const accepted = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!accepted.has(file.type)) return reject(new Error('Use a PNG, JPG, or WebP logo.'));
    if (file.size > 5 * 1024 * 1024) return reject(new Error('Logo must be smaller than 5 MB.'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the logo file.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected file is not a valid image.'));
      image.onload = () => {
        const maxSide = 512;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleLogoFile(file) {
  if (!file) return;
  try {
    state.logo = await sanitizeLogo(file);
    $('#logoThumb').innerHTML = `<img src="${state.logo}" alt="Uploaded logo preview">`;
    state.ecc = 'H';
    $('#ecc').value = 'H';
    $('#logoMessage').textContent = 'Logo sanitized locally and embedded as PNG. High error correction enabled.';
    update();
  } catch (error) {
    $('#logoMessage').textContent = error.message;
    $('#logoInput').value = '';
  }
}

function syncDesignControls() {
  $('#frameText').value = state.frameText;
  $('#frameTextWrap').hidden = state.frame !== 'label';
  $('#logoSize').value = state.logoSize;
  $('#logoSizeText').textContent = `${state.logoSize}%`;
  $('#fgColor').value = state.fg;
  $('#fgHex').value = state.fg;
  $('#bgColor').value = state.bg;
  $('#bgHex').value = state.bg;
  $('#ecc').value = state.ecc;
  $('#quiet').value = String(state.quiet);
  $('#pngSize').value = String(state.pngSize);
  $$('#frameOptions .option').forEach((item) => {
    const active = item.dataset.value === state.frame;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  $$('#shapeOptions .option').forEach((item) => {
    const active = item.dataset.value === state.shape;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}

function resetDesign() {
  Object.assign(state, DEFAULT_DESIGN, { logo: null });
  try { localStorage.removeItem('qr-studio-design'); } catch { /* no-op */ }
  $('#logoInput').value = '';
  $('#logoThumb').innerHTML = '<span>None</span>';
  $('#logoMessage').textContent = 'PNG, JPG, or WebP. Processed entirely in your browser.';
  syncDesignControls();
  update();
}

function wireTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('.tab');
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;
      event.preventDefault();
      tabs[index].focus();
      activateTab(tabs[index]);
    });
  });
}
function activateTab(tab) {
  $$('.tab').forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  $$('.design-panel').forEach((panel) => {
    const active = panel.id === `panel-${tab.dataset.panel}`;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

function wire() {
  wireTabs();
  selectOptions('#frameOptions', 'frame');
  selectOptions('#shapeOptions', 'shape');

  $('#frameText').addEventListener('input', (event) => {
    state.frameText = event.target.value.slice(0, 32);
    update();
  });

  const upload = $('#logoUpload');
  $('#logoInput').addEventListener('change', (event) => handleLogoFile(event.target.files[0]));
  ['dragenter', 'dragover'].forEach((name) => upload.addEventListener(name, (event) => {
    event.preventDefault(); upload.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((name) => upload.addEventListener(name, (event) => {
    event.preventDefault(); upload.classList.remove('dragging');
  }));
  upload.addEventListener('drop', (event) => handleLogoFile(event.dataTransfer.files[0]));

  $('#removeLogo').addEventListener('click', () => {
    state.logo = null;
    $('#logoInput').value = '';
    $('#logoThumb').innerHTML = '<span>None</span>';
    $('#logoMessage').textContent = 'PNG, JPG, or WebP. Processed entirely in your browser.';
    update();
  });
  $('#logoSize').addEventListener('input', (event) => {
    state.logoSize = Number(event.target.value);
    $('#logoSizeText').textContent = `${event.target.value}%`;
    update();
  });

  [['fgColor', 'fgHex', 'fg'], ['bgColor', 'bgHex', 'bg']].forEach(([pickerId, hexId, key]) => {
    const picker = $(`#${pickerId}`);
    const hex = $(`#${hexId}`);
    picker.addEventListener('input', (event) => {
      state[key] = event.target.value;
      hex.value = event.target.value;
      update();
    });
    hex.addEventListener('input', (event) => {
      if (/^#[0-9a-f]{6}$/i.test(event.target.value)) {
        state[key] = event.target.value.toLowerCase();
        picker.value = state[key];
        update();
      }
    });
  });

  $('#ecc').addEventListener('change', (event) => { state.ecc = event.target.value; update(); });
  $('#quiet').addEventListener('change', (event) => { state.quiet = Number(event.target.value); update(); });
  $('#pngSize').addEventListener('change', (event) => { state.pngSize = Number(event.target.value); saveDesign(); });

  $('#downloadSvg').addEventListener('click', downloadSvg);
  $('#downloadPng').addEventListener('click', downloadPng);
  $('#copySvg').addEventListener('click', (event) => copyText(state.svg, event.currentTarget, 'SVG copied'));
  $('#printQr').addEventListener('click', () => window.print());
  $('#copyPayload').addEventListener('click', (event) => copyText(state.payload, event.currentTarget, 'Payload copied'));
  $('#clearForm').addEventListener('click', () => {
    state.forms[state.type] = {};
    renderFields();
    update();
    $('#contentFields').querySelector('input,textarea,select')?.focus();
  });
  $('#resetDesign').addEventListener('click', resetDesign);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter' && state.svg) {
      event.preventDefault();
      downloadPng();
    }
  });
}

initTypes();
renderFields();
syncDesignControls();
wire();
update();
