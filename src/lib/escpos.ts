// Minimal ESC/POS command builder for 58 mm / 80 mm thermal printers.
// Reference: Epson ESC/POS; the subset below is supported by practically
// every generic Bluetooth receipt printer.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export type PaperWidth = 58 | 80;

/** Characters per line in the default font (Font A). */
export const CHARS_PER_LINE: Record<PaperWidth, number> = { 58: 32, 80: 48 };

type Align = 'left' | 'center' | 'right';

/**
 * Printers use a single-byte code page, so map text to plain ASCII:
 * ₱ becomes "PHP ", accents are dropped (ñ → n), anything else unknown → "?".
 */
export function toPrinterText(value: string) {
  return value
    .replace(/₱\s?/g, 'PHP ')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e\n]/g, '?');
}

/** Splits text into lines of at most `width` characters, breaking on spaces. */
export function wrapText(value: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= width) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
      while (line.length > width) {
        lines.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
    lines.push(line);
  }
  return lines;
}

export class EscPosBuilder {
  readonly width: number;
  private bytes: number[] = [];
  private charScale = 1;

  constructor(paperWidth: PaperWidth) {
    this.width = CHARS_PER_LINE[paperWidth];
    this.command(ESC, 0x40); // Initialize printer
    this.command(ESC, 0x74, 0x00); // Code page 0 (PC437, ASCII-compatible)
  }

  private command(...values: number[]) {
    this.bytes.push(...values);
    return this;
  }

  /** Characters that fit on a line at the current text size. */
  private get lineWidth() {
    return Math.floor(this.width / this.charScale);
  }

  align(value: Align) {
    return this.command(ESC, 0x61, value === 'left' ? 0 : value === 'center' ? 1 : 2);
  }

  bold(on: boolean) {
    return this.command(ESC, 0x45, on ? 1 : 0);
  }

  /** 1 = normal, 2 = double. Width scaling halves the characters per line. */
  size(width: 1 | 2, height: 1 | 2 = width) {
    this.charScale = width;
    return this.command(GS, 0x21, ((width - 1) << 4) | (height - 1));
  }

  text(value: string) {
    for (const char of toPrinterText(value)) {
      this.bytes.push(char.charCodeAt(0));
    }
    return this;
  }

  newline(count = 1) {
    for (let i = 0; i < count; i += 1) this.bytes.push(LF);
    return this;
  }

  /** Word-wrapped text, one printed line per wrapped line. */
  line(value = '') {
    for (const wrapped of wrapText(toPrinterText(value), this.lineWidth)) {
      this.text(wrapped).newline();
    }
    return this;
  }

  divider(char = '-') {
    return this.text(char.repeat(this.lineWidth)).newline();
  }

  /** "Label ........ value" on one line; wraps the label if both don't fit. */
  row(label: string, value: string) {
    const left = toPrinterText(label);
    const right = toPrinterText(value);
    const width = this.lineWidth;

    if (left.length + 1 + right.length <= width) {
      return this.text(left + ' '.repeat(width - left.length - right.length) + right).newline();
    }

    this.line(left);
    for (const wrapped of wrapText(right, width)) {
      this.text(wrapped.padStart(width)).newline();
    }
    return this;
  }

  feed(lines: number) {
    return this.command(ESC, 0x64, Math.max(0, Math.min(255, lines)));
  }

  /** Feed and partial-cut. Printers without a cutter ignore it. */
  cut() {
    return this.command(GS, 0x56, 66, 0);
  }

  build() {
    return Uint8Array.from(this.bytes);
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Byte-safe base64 encoder (no dependency on btoa/Buffer). */
export function toBase64(bytes: Uint8Array) {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET[(triple >> 18) & 63] + BASE64_ALPHABET[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : '=';
  }
  return output;
}
