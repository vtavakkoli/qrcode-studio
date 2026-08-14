/* QR Code Studio v2.1 enhancements: native Code 128 barcode mode and adaptive UI. */
(() => {
  const baseUpdate = update;
  const baseExportBaseName = exportBaseName;

  const barcodeType = TYPES.find((item) => item.id === 'barcode');
  if (barcodeType) {
    barcodeType.icon = '▥';
    barcodeType.label = 'Barcode';
  }
  SCHEMAS.barcode = {
    fields: [field('text', 'Barcode data', 'text', 'SKU-2026-001', { full: true, required: true })],
  };

  const barcodeButton = document.querySelector('[data-type="barcode"]');
  if (barcodeButton) {
    const icon = barcodeButton.querySelector('.ico');
    const label = barcodeButton.querySelector('span:last-child');
    if (icon) icon.textContent = '▥';
    if (label) label.textContent = 'Barcode';
  }
  $('#typeGrid')?.setAttribute('aria-label', 'Generator content type');

  function isBarcodeMode() {
    return state.type === 'barcode';
  }

  function setStaticText(id, text) {
    const element = $(`#${id}`);
    if (element) element.textContent = text;
  }

  function refreshModeUi() {
    const barcodeMode = isBarcodeMode();
    document.body.classList.toggle('barcode-mode', barcodeMode);
    setStaticText('design-title', barcodeMode ? 'Design your barcode' : 'Design your QR code');

    const previewTitle = $('#download-title');
    if (previewTitle) {
      previewTitle.innerHTML = `<span class="stepnum" aria-hidden="true">3</span>${barcodeMode ? 'Download barcode' : 'Download QR code'}`;
    }

    const downloadButton = $('#downloadPng');
    if (downloadButton) downloadButton.textContent = barcodeMode ? '↓ Download barcode PNG' : '↓ Download PNG';
    const svgButton = $('#downloadSvg');
    if (svgButton) svgButton.textContent = barcodeMode ? 'Download barcode SVG' : 'Download SVG';
    const printButton = $('#printQr');
    if (printButton) printButton.textContent = barcodeMode ? 'Print barcode' : 'Print';

    const meta = $$('.meta-strip > div');
    if (meta[0]) {
      meta[0].innerHTML = barcodeMode
        ? '<strong>Symbology</strong>Code 128-B'
        : '<strong>Generation</strong>Automatic best mask';
    }

    if (barcodeMode) {
      const selectedTab = $('.tab[aria-selected="true"]');
      if (selectedTab?.id === 'tab-shape' || selectedTab?.id === 'tab-logo') activateTab($('#tab-frame'));
    }
  }

  function updateBarcodeQualityUi() {
    const ratio = contrastRatio(state.fg, state.bg);
    const darkOnLight = relativeLuminance(state.fg) < relativeLuminance(state.bg);
    const excellent = ratio >= 7 && darkOnLight;
    const good = ratio >= 4.5 && darkOnLight;
    const label = excellent ? 'Excellent' : good ? 'Good' : 'Risky';
    $('#contrastValue').textContent = `${ratio.toFixed(1)}:1`;
    $('#qualityLabel').textContent = label;
    $('#qualityLabel').dataset.level = label.toLowerCase();
    $('#qualityHint').textContent = darkOnLight
      ? (ratio >= 4.5 ? 'High-contrast bars with Code 128 quiet zones.' : 'Increase foreground/background contrast for reliable barcode scanning.')
      : 'Use dark bars on a lighter background for reliable barcode scanning.';
  }

  function renderBarcode() {
    const { value: payloadValue, error } = buildPayload();
    state.payload = payloadValue;
    setError(error);
    updateBarcodeQualityUi();
    saveDesign();
    refreshModeUi();

    const preview = $('#preview');
    if (!payloadValue || error) {
      state.qr = null;
      state.svg = '';
      preview.classList.add('placeholder');
      preview.innerHTML = Barcode128.placeholderSvg();
      setExportEnabled(false);
      $('#statusDot').className = `dot${error ? ' error' : ''}`;
      $('#statusText').textContent = error || 'Enter content to generate a barcode';
      $('#qrMeta').textContent = 'CODE 128';
      return;
    }

    try {
      const encoded = Barcode128.encode(payloadValue);
      state.qr = null;
      state.svg = Barcode128.toSvg(payloadValue, {
        foreground: state.fg,
        background: state.bg,
        frame: state.frame,
        frameText: state.frameText,
      });
      preview.innerHTML = state.svg;
      preview.classList.remove('placeholder');
      setExportEnabled(true);
      $('#statusDot').className = 'dot ready';
      $('#statusText').textContent = 'Barcode ready to scan';
      $('#qrMeta').textContent = `CODE 128 · ${encoded.modules} modules`;
    } catch (exception) {
      state.qr = null;
      state.svg = '';
      preview.innerHTML = Barcode128.placeholderSvg();
      preview.classList.add('placeholder');
      setExportEnabled(false);
      $('#statusDot').className = 'dot error';
      $('#statusText').textContent = 'Cannot generate barcode';
      $('#qrMeta').textContent = 'CODE 128';
      setError(exception?.message || 'Unable to generate this barcode.');
    }
  }

  update = function enhancedUpdate() {
    if (isBarcodeMode()) {
      renderBarcode();
      return;
    }
    baseUpdate();
    refreshModeUi();
  };

  exportBaseName = function enhancedExportBaseName() {
    return isBarcodeMode() ? 'barcode-code128' : baseExportBaseName();
  };

  const brandDescription = document.querySelector('.brand p');
  if (brandDescription) brandDescription.textContent = 'Private, offline QR & barcode generator — nothing leaves your browser.';

  refreshModeUi();
})();
