/*
 * QR Code Model 2 encoder (numeric/alphanumeric/byte modes, versions 1–40, automatic mask selection).
 * Encoding structure and constants are adapted from Project Nayuki's QR Code generator.
 * Project Nayuki copyright and MIT license are preserved in NOTICE.md.
 */
class BitBuffer {
  constructor() { this.bits = []; }
  append(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push(((value >>> i) & 1) !== 0);
  }
  get length() { return this.bits.length; }
  toBytes() {
    const out = Array(Math.ceil(this.bits.length / 8)).fill(0);
    this.bits.forEach((bit, index) => {
      if (bit) out[index >>> 3] |= 1 << (7 - (index & 7));
    });
    return out;
  }
}

class QRCode {
  static ECC = {
    L: { o: 0, f: 1 },
    M: { o: 1, f: 0 },
    Q: { o: 2, f: 3 },
    H: { o: 3, f: 2 },
  };

  static ECC_CODEWORDS_PER_BLOCK = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  ];

  static NUM_ERROR_CORRECTION_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81],
  ];

  constructor(version, ecl, dataCodewords, mask = -1) {
    if (!(version >= 1 && version <= 40)) throw new RangeError('QR version out of range.');
    if (!(mask >= -1 && mask <= 7)) throw new RangeError('QR mask out of range.');

    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    if (mask === -1) {
      let bestMask = 0;
      let bestPenalty = Infinity;
      for (let candidate = 0; candidate < 8; candidate++) {
        this.applyMask(candidate);
        this.drawFormatBits(candidate);
        const penalty = this.getPenaltyScore();
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestMask = candidate;
        }
        this.applyMask(candidate); // Undo data mask; function modules are never masked.
      }
      mask = bestMask;
    }

    this.applyMask(mask);
    this.drawFormatBits(mask);
    this.mask = mask;
  }

  static encodeText(text, eclKey = 'M', mask = -1) {
    const value = String(text);
    const ecl = this.ECC[eclKey] || this.ECC.M;
    const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    const isNumeric = /^[0-9]*$/.test(value);
    const isAlphanumeric = value.length > 0 && [...value].every((char) => ALPHANUMERIC.includes(char));
    const bytes = Array.from(new TextEncoder().encode(value));

    const mode = isNumeric
      ? { name: 'numeric', indicator: 0x1 }
      : isAlphanumeric
        ? { name: 'alphanumeric', indicator: 0x2 }
        : { name: 'byte', indicator: 0x4 };
    const needsEci = mode.name === 'byte' && bytes.some((byte) => byte >= 0x80); // UTF-8 ECI assignment 26.
    const charCount = mode.name === 'byte' ? bytes.length : value.length;

    const countBitsFor = (version) => {
      const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
      if (mode.name === 'numeric') return [10, 12, 14][group];
      if (mode.name === 'alphanumeric') return [9, 11, 13][group];
      return [8, 16, 16][group];
    };
    const payloadBits = () => {
      if (mode.name === 'numeric') {
        const groups = Math.floor(value.length / 3);
        const remainder = value.length % 3;
        return groups * 10 + (remainder === 2 ? 7 : remainder === 1 ? 4 : 0);
      }
      if (mode.name === 'alphanumeric') return Math.floor(value.length / 2) * 11 + (value.length % 2) * 6;
      return bytes.length * 8;
    };

    let version = 1;
    let capacity = 0;
    for (; version <= 40; version++) {
      const countBits = countBitsFor(version);
      if (charCount >= (1 << Math.min(countBits, 30))) continue;
      const usedBits = (needsEci ? 12 : 0) + 4 + countBits + payloadBits();
      capacity = this.getNumDataCodewords(version, ecl) * 8;
      if (usedBits <= capacity) break;
    }
    if (version > 40) {
      throw new Error('Content is too large for a QR code at this error-correction level.');
    }

    const buffer = new BitBuffer();
    if (needsEci) {
      buffer.append(0x7, 4); // ECI mode.
      buffer.append(26, 8);  // UTF-8 assignment number.
    }
    buffer.append(mode.indicator, 4);
    buffer.append(charCount, countBitsFor(version));

    if (mode.name === 'numeric') {
      for (let i = 0; i < value.length; i += 3) {
        const chunk = value.slice(i, i + 3);
        buffer.append(Number(chunk), chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4);
      }
    } else if (mode.name === 'alphanumeric') {
      for (let i = 0; i < value.length; i += 2) {
        const a = ALPHANUMERIC.indexOf(value[i]);
        if (i + 1 < value.length) {
          const b = ALPHANUMERIC.indexOf(value[i + 1]);
          buffer.append(a * 45 + b, 11);
        } else {
          buffer.append(a, 6);
        }
      }
    } else {
      bytes.forEach((byte) => buffer.append(byte, 8));
    }

    buffer.append(0, Math.min(4, capacity - buffer.length));
    buffer.append(0, (8 - (buffer.length % 8)) % 8);

    const data = buffer.toBytes();
    for (let pad = 0xec; data.length * 8 < capacity; pad ^= 0xec ^ 0x11) data.push(pad);
    const qr = new QRCode(version, ecl, data, mask);
    qr.mode = mode.name;
    return qr;
  }

  static getNumRawDataModules(version) {
    let result = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const numAlign = Math.floor(version / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (version >= 7) result -= 36;
    }
    return result;
  }

  static getNumDataCodewords(version, ecl) {
    return Math.floor(this.getNumRawDataModules(version) / 8)
      - this.ECC_CODEWORDS_PER_BLOCK[ecl.o][version] * this.NUM_ERROR_CORRECTION_BLOCKS[ecl.o][version];
  }

  setFunctionModule(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const positions = this.getAlignmentPatternPositions();
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (!((i === 0 && j === 0)
          || (i === 0 && j === positions.length - 1)
          || (i === positions.length - 1 && j === 0))) {
          this.drawAlignmentPattern(positions[i], positions[j]);
        }
      }
    }
    this.drawFormatBits(0);
    this.drawVersion();
  }

  drawFinderPattern(x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          this.setFunctionModule(xx, yy, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  drawAlignmentPattern(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  getAlignmentPatternPositions() {
    if (this.version === 1) return [];
    const count = Math.floor(this.version / 7) + 2;
    const step = Math.floor((this.version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
    const result = [6];
    for (let position = this.size - 7; result.length < count; position -= step) result.splice(1, 0, position);
    return result;
  }

  drawFormatBits(mask) {
    const data = (this.ecl.f << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (i) => ((bits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, bit(i));
    this.setFunctionModule(8, 7, bit(6));
    this.setFunctionModule(8, 8, bit(7));
    this.setFunctionModule(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, bit(i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  drawVersion() {
    if (this.version < 7) return;
    let remainder = this.version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  drawCodewords(data) {
    let bitIndex = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < this.size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vertical : vertical;
          if (!this.isFunction[y][x] && bitIndex < data.length * 8) {
            this.modules[y][x] = ((data[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex++;
          }
        }
      }
    }
  }

  applyMask(mask) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert = false;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = (x * y % 2 + x * y % 3) === 0; break;
          case 6: invert = ((x * y % 2 + x * y % 3) % 2) === 0; break;
          case 7: invert = (((x + y) % 2 + x * y % 3) % 2) === 0; break;
          default: throw new RangeError('QR mask out of range.');
        }
        if (!this.isFunction[y][x] && invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  getPenaltyScore() {
    let result = 0;
    const size = this.size;

    const scoreRuns = (line) => {
      let score = 0;
      let runColor = line[0];
      let runLength = 1;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && line[i] === runColor) {
          runLength++;
        } else {
          if (runLength >= 5) score += 3 + (runLength - 5);
          if (i < line.length) {
            runColor = line[i];
            runLength = 1;
          }
        }
      }
      return score;
    };

    const hasFinderLikePattern = (line, i) => {
      // ISO/IEC 18004 pattern: 1:1:3:1:1 dark/light runs with four light modules on one side.
      const a = [true,false,true,true,true,false,true,false,false,false,false];
      const b = [false,false,false,false,true,false,true,true,true,false,true];
      for (let j = 0; j < 11; j++) {
        if (line[i + j] !== a[j]) break;
        if (j === 10) return true;
      }
      for (let j = 0; j < 11; j++) {
        if (line[i + j] !== b[j]) return false;
      }
      return true;
    };

    for (let y = 0; y < size; y++) {
      const row = this.modules[y];
      result += scoreRuns(row);
      for (let i = 0; i <= size - 11; i++) if (hasFinderLikePattern(row, i)) result += 40;
    }

    for (let x = 0; x < size; x++) {
      const col = Array.from({ length: size }, (_, y) => this.modules[y][x]);
      result += scoreRuns(col);
      for (let i = 0; i <= size - 11; i++) if (hasFinderLikePattern(col, i)) result += 40;
    }

    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = this.modules[y][x];
        if (this.modules[y][x + 1] === color
          && this.modules[y + 1][x] === color
          && this.modules[y + 1][x + 1] === color) result += 3;
      }
    }

    let dark = 0;
    for (const row of this.modules) for (const cell of row) if (cell) dark++;
    const total = size * size;
    result += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return result;
  }

  addEccAndInterleave(data) {
    const numBlocks = QRCode.NUM_ERROR_CORRECTION_BLOCKS[this.ecl.o][this.version];
    const eccLength = QRCode.ECC_CODEWORDS_PER_BLOCK[this.ecl.o][this.version];
    const rawCodewords = Math.floor(QRCode.getNumRawDataModules(this.version) / 8);
    const shortBlockLength = Math.floor(rawCodewords / numBlocks);
    const numShortBlocks = numBlocks - rawCodewords % numBlocks;
    const divisor = QRCode.rsDiv(eccLength);
    const blocks = [];
    let dataIndex = 0;

    for (let i = 0; i < numBlocks; i++) {
      const dataLength = shortBlockLength - eccLength + (i < numShortBlocks ? 0 : 1);
      const blockData = data.slice(dataIndex, dataIndex + dataLength);
      dataIndex += blockData.length;
      const ecc = QRCode.rsRem(blockData, divisor);
      if (i < numShortBlocks) blockData.push(0);
      blocks.push(blockData.concat(ecc));
    }

    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i !== shortBlockLength - eccLength || j >= numShortBlocks) result.push(blocks[j][i]);
      }
    }
    return result;
  }

  static rsDiv(degree) {
    const result = Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = this.rsMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = this.rsMul(root, 2);
    }
    return result;
  }

  static rsRem(data, divisor) {
    const result = Array(divisor.length).fill(0);
    for (const byte of data) {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i++) result[i] ^= this.rsMul(divisor[i], factor);
    }
    return result;
  }

  static rsMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
}
