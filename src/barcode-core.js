/* Dependency-free Code 128-B encoder and SVG renderer. */
const Barcode128 = (() => {
  const PATTERNS = [
    '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212',
    '112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131',
    '311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321',
    '112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121',
    '313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114',
    '122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212',
    '124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113',
    '114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112',
  ];

  const START_B = 104;
  const STOP = 106;
  const MAX_LENGTH = 120;

  function xmlEscape(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    }[char]));
  }

  function encode(text) {
    const value = String(text ?? '');
    if (!value) throw new Error('Enter barcode content.');
    if (value.length > MAX_LENGTH) throw new Error(`Code 128 barcode content is limited to ${MAX_LENGTH} characters for reliable output.`);

    const dataCodes = [];
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      if (codePoint < 32 || codePoint > 126) {
        throw new Error('Code 128 currently supports printable ASCII characters from space through ~.');
      }
      dataCodes.push(codePoint - 32);
    }

    let checksum = START_B;
    dataCodes.forEach((code, index) => { checksum += code * (index + 1); });
    checksum %= 103;

    const codes = [START_B, ...dataCodes, checksum, STOP];
    const patterns = codes.map((code) => PATTERNS[code]);
    const modules = patterns.reduce((sum, pattern) => (
      sum + [...pattern].reduce((patternSum, digit) => patternSum + Number(digit), 0)
    ), 0);

    return { text: value, codes, checksum, patterns, modules };
  }

  function toSvg(text, options = {}) {
    const encoded = encode(text);
    const foreground = options.foreground || '#17233f';
    const background = options.background || '#ffffff';
    const frame = ['none', 'border', 'label'].includes(options.frame) ? options.frame : 'none';
    const frameText = String(options.frameText || 'SCAN ME').trim().slice(0, 32);
    const quiet = Math.max(10, Number(options.quiet) || 10);
    const framePadding = frame === 'none' ? 0 : 4;
    const barsHeight = 70;
    const textBand = 15;
    const labelBand = frame === 'label' ? 13 : 0;
    const width = encoded.modules + quiet * 2 + framePadding * 2;
    const height = barsHeight + textBand + labelBand + framePadding * 2;
    const startX = quiet + framePadding;
    const startY = framePadding;
    const accessibleText = encoded.text.length > 80 ? `${encoded.text.slice(0, 77)}...` : encoded.text;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="1200" height="${Math.round(1200 * height / width)}" role="img" aria-label="${xmlEscape(`Code 128 barcode for ${accessibleText}`)}" shape-rendering="crispEdges">`;
    svg += `<rect width="${width}" height="${height}" fill="${background}"/>`;
    if (frame !== 'none') {
      svg += `<rect x="0.8" y="0.8" width="${width - 1.6}" height="${height - 1.6}" rx="3" fill="none" stroke="${foreground}" stroke-width="0.8"/>`;
    }

    let cursor = startX;
    for (const pattern of encoded.patterns) {
      let bar = true;
      for (const digit of pattern) {
        const segment = Number(digit);
        if (bar) svg += `<rect x="${cursor}" y="${startY}" width="${segment}" height="${barsHeight}" fill="${foreground}"/>`;
        cursor += segment;
        bar = !bar;
      }
    }

    const textY = startY + barsHeight + 10.5;
    const textSize = Math.max(5, Math.min(9, width / Math.max(18, encoded.text.length * 1.7)));
    svg += `<text x="${width / 2}" y="${textY}" text-anchor="middle" fill="${foreground}" font-family="Arial,Helvetica,sans-serif" font-size="${textSize}" font-weight="600" shape-rendering="geometricPrecision">${xmlEscape(encoded.text)}</text>`;

    if (frame === 'label' && frameText) {
      svg += `<text x="${width / 2}" y="${height - 4.2}" text-anchor="middle" fill="${foreground}" font-family="Arial,Helvetica,sans-serif" font-size="6.2" font-weight="800" letter-spacing="0.25" shape-rendering="geometricPrecision">${xmlEscape(frameText)}</text>`;
    }

    return `${svg}</svg>`;
  }

  function placeholderSvg() {
    const bars = [2,1,1,3,1,2,2,2,1,1,3,1,2,1,2,3,1,1,1,3,2,2,1,2,1,1,3,2,1,2,2,1];
    let x = 12;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 78" aria-hidden="true"><rect width="150" height="78" fill="#fff"/><g fill="#cfd6dd">';
    bars.forEach((width, index) => {
      if (index % 2 === 0) svg += `<rect x="${x}" y="10" width="${width * 2}" height="48"/>`;
      x += width * 2;
    });
    return `${svg}</g><rect x="40" y="65" width="70" height="4" rx="2" fill="#dce2e8"/></svg>`;
  }

  return Object.freeze({ encode, toSvg, placeholderSvg, maxLength: MAX_LENGTH });
})();
