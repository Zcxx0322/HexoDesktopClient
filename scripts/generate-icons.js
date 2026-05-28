/**
 * Generate a 256x256 PNG app icon for Hexo Desktop Client.
 * Uses only Node.js built-in modules (zlib for PNG compression).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESOURCES = path.resolve(__dirname, '..', 'resources');
const ICON_PATH = path.join(RESOURCES, 'icon.png');

if (!fs.existsSync(RESOURCES)) {
  fs.mkdirSync(RESOURCES, { recursive: true });
}

const W = 256;
const H = 256;

// Create raw RGBA pixel data
const pixels = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

// Fill background: dark gradient (top to bottom)
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(30 + t * 10);
  const g2 = Math.round(41 + t * 10);
  const b2 = Math.round(59 + t * 10);
  for (let x = 0; x < W; x++) {
    setPixel(x, y, r, g2, b2);
  }
}

// Draw rounded rect background for icon area (hexo-style)
const cx = W / 2;
const cy = H / 2;
const rr = 70; // circle radius

// Draw a circle with orange color (#f59e0b)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < rr - 1) {
      // Inside: orange fill
      setPixel(x, y, 245, 158, 11);
    } else if (dist < rr + 1) {
      // Edge: anti-aliased blend
      const alpha = Math.max(0, Math.min(255, Math.round((rr + 1 - dist) * 127)));
      const R = Math.round((245 * alpha + (30 + (y / H) * 10) * (255 - alpha)) / 255);
      const G = Math.round((158 * alpha + (41 + (y / H) * 10) * (255 - alpha)) / 255);
      const B = Math.round((11 * alpha + (59 + (y / H) * 10) * (255 - alpha)) / 255);
      setPixel(x, y, R, G, B);
    }
  }
}

// Draw "H" letter in the circle (dark color)
const hw = 16; // half width of letter strokes
const top = cy - 32;
const bottom = cy + 32;
const mid = cy;
const left = cx - 30;
const right = cx + 30;

for (let y = top; y <= bottom; y++) {
  for (let x = left - hw; x <= left + hw; x++) {
    if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < rr - 2) {
      setPixel(x, y, 30, 41, 59);
    }
  }
  for (let x = right - hw; x <= right + hw; x++) {
    if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < rr - 2) {
      setPixel(x, y, 30, 41, 59);
    }
  }
}
for (let y = mid - hw; y <= mid + hw; y++) {
  for (let x = left; x <= right; x++) {
    if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < rr - 2) {
      setPixel(x, y, 30, 41, 59);
    }
  }
}

// Build PNG
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crcVal]);
}

// PNG signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT: raw scanlines with filter byte 0
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filter: none
  pixels.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = zlib.deflateSync(raw);

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(ICON_PATH, png);
console.log(`Generated icon: ${ICON_PATH} (${(png.length / 1024).toFixed(1)} KB)`);
