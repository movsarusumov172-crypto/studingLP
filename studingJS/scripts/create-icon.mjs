/**
 * Generates build/icon.ico — BMP-in-ICO, 48/32/16 px.
 * Gold background, dark "JS" text. Maximum compatibility.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });

// BGRA values
const GOLD = [0xd6, 0xb2, 0x5a, 0xff];
const DARK = [0x0a, 0x0c, 0x16, 0xff];
const EDGE = [0xb8, 0x96, 0x40, 0xff]; // slightly darker gold for border

// 5×7 bitmap font (5 bits per row, MSB = leftmost pixel)
const FONT = {
  J: [0b01110, 0b00100, 0b00100, 0b00100, 0b10100, 0b10100, 0b01100],
  S: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110]
};

function renderIcon(size) {
  // All pixels start as GOLD background
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4 + 0] = GOLD[0];
    pixels[i * 4 + 1] = GOLD[1];
    pixels[i * 4 + 2] = GOLD[2];
    pixels[i * 4 + 3] = GOLD[3];
  }

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = c[0]; pixels[i+1] = c[1]; pixels[i+2] = c[2]; pixels[i+3] = c[3];
  }

  // 1px dark border around the whole icon
  for (let i = 0; i < size; i++) {
    set(i, 0, EDGE); set(i, size-1, EDGE);
    set(0, i, EDGE); set(size-1, i, EDGE);
  }

  // Draw "JS" centered, scale based on size
  const scale = size <= 16 ? 1 : size <= 32 ? 2 : 3;
  const gap = scale;
  const charW = 5 * scale;
  const charH = 7 * scale;
  const totalW = charW * 2 + gap;
  const ox = Math.floor((size - totalW) / 2);
  const oy = Math.floor((size - charH) / 2);

  let cx = ox;
  for (const ch of 'JS') {
    const rows = FONT[ch];
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < 5; col++) {
        if (rows[row] & (1 << (4 - col))) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              set(cx + col * scale + dx, oy + row * scale + dy, DARK);
            }
          }
        }
      }
    }
    cx += charW + gap;
  }

  return pixels;
}

function makeBMP(size, pixels) {
  // BGRA pixel data is stored bottom-to-top in BMP
  const andRowBytes = Math.ceil(size / 32) * 4;
  const bmpSize = 40 + size * size * 4 + andRowBytes * size;
  const buf = Buffer.alloc(bmpSize, 0);
  let o = 0;

  buf.writeUInt32LE(40, o);             o += 4; // biSize
  buf.writeInt32LE(size, o);            o += 4; // biWidth
  buf.writeInt32LE(size * 2, o);        o += 4; // biHeight × 2 for ICO
  buf.writeUInt16LE(1, o);              o += 2; // biPlanes
  buf.writeUInt16LE(32, o);             o += 2; // biBitCount
  buf.writeUInt32LE(0, o);              o += 4; // biCompression
  buf.writeUInt32LE(size * size * 4, o);o += 4; // biSizeImage
  o += 16; // biXPels, biYPels, biClrUsed, biClrImportant — all 0

  // XOR mask: BGRA, bottom row first
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      buf[o++] = pixels[s + 2]; // B
      buf[o++] = pixels[s + 1]; // G
      buf[o++] = pixels[s + 0]; // R
      buf[o++] = pixels[s + 3]; // A
    }
  }
  // AND mask: all 0 = pixel from XOR mask shown (already zeroed)
  return buf;
}

function makeICO(sizes) {
  const bmps = sizes.map(s => makeBMP(s, renderIcon(s)));
  let offset = 6 + sizes.length * 16;

  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0);
  hdr.writeUInt16LE(1, 2);
  hdr.writeUInt16LE(sizes.length, 4);

  const dirs = sizes.map((s, i) => {
    const d = Buffer.alloc(16);
    d[0] = s >= 256 ? 0 : s;
    d[1] = s >= 256 ? 0 : s;
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(bmps[i].length, 8);
    d.writeUInt32LE(offset, 12);
    offset += bmps[i].length;
    return d;
  });

  return Buffer.concat([hdr, ...dirs, ...bmps]);
}

const ico = makeICO([256, 48, 32, 16]);
fs.writeFileSync(path.join(ROOT, 'build', 'icon.ico'), ico);
console.log(`  icon → build/icon.ico  (${(ico.length / 1024).toFixed(1)} kb)`);
