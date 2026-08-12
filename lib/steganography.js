/**
 * LSB Steganography Module
 *
 * Embeds and extracts messages using Least Significant Bit encoding in PNG images.
 *
 * Format:
 *   First 32 bits  = message byte-length (big-endian)
 *   Remaining bits = UTF-8 message bytes, one bit per R/G/B channel LSB
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BASE_IMAGE_PATH = path.join(__dirname, '..', 'assets', 'base_evidence.png');

/**
 * Loads the base evidence image and returns a parsed PNG object.
 * Falls back to a procedurally generated image if the file is missing.
 *
 * @param {import('./seededRandom')} rng - Seeded random for fallback generation.
 * @returns {PNG}
 */
function loadBaseImage(rng) {
  if (fs.existsSync(BASE_IMAGE_PATH)) {
    const buf = fs.readFileSync(BASE_IMAGE_PATH);
    try {
      return PNG.sync.read(buf);
    } catch (_) {
      // If the file can't be parsed as PNG, fall through to procedural
    }
  }
  return generateProceduralImage(640, 480, rng);
}

/**
 * Generates a procedural PNG if no base image exists.
 * @param {number} w
 * @param {number} h
 * @param {import('./seededRandom')} rng
 * @returns {PNG}
 */
function generateProceduralImage(w, h, rng) {
  const png = new PNG({ width: w, height: h });
  const r1 = rng.nextInt(20, 60), g1 = rng.nextInt(25, 55), b1 = rng.nextInt(50, 90);
  const r2 = rng.nextInt(60, 130), g2 = rng.nextInt(60, 120), b2 = rng.nextInt(100, 180);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (w * y + x) << 2;
      const t = (x / w + y / h) / 2;
      const n = rng.nextInt(-8, 8);
      png.data[idx]     = Math.min(255, Math.max(0, Math.round(r1 + (r2 - r1) * t + n)));
      png.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g1 + (g2 - g1) * t + n * 0.6)));
      png.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b1 + (b2 - b1) * t + n * 0.4)));
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

/**
 * Embeds a message into a PNG image via LSB.
 *
 * @param {PNG} png  - Parsed PNG object (will be mutated).
 * @param {string} message - Message to hide.
 * @returns {Buffer} Encoded PNG buffer.
 */
function embedMessage(png, message) {
  const { width, height, data } = png;
  const msgBytes = Buffer.from(message, 'utf-8');
  const lenBits = int32ToBits(msgBytes.length);
  const msgBits = bytesToBits(msgBytes);
  const allBits = lenBits.concat(msgBits);

  const capacity = width * height * 3;
  if (allBits.length > capacity) {
    throw new Error('Message too large for image: need ' + allBits.length + ' bits, have ' + capacity);
  }

  let bi = 0;
  for (let y = 0; y < height && bi < allBits.length; y++) {
    for (let x = 0; x < width && bi < allBits.length; x++) {
      const idx = (width * y + x) << 2;
      if (bi < allBits.length) data[idx]     = (data[idx]     & 0xFE) | allBits[bi++]; // R
      if (bi < allBits.length) data[idx + 1] = (data[idx + 1] & 0xFE) | allBits[bi++]; // G
      if (bi < allBits.length) data[idx + 2] = (data[idx + 2] & 0xFE) | allBits[bi++]; // B
    }
  }

  return PNG.sync.write(png);
}

/**
 * Extracts a hidden message from a PNG buffer.
 *
 * @param {Buffer} pngBuffer
 * @returns {string}
 */
function extractMessage(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const { width, height, data } = png;

  const allBits = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      allBits.push(data[idx] & 1);
      allBits.push(data[idx + 1] & 1);
      allBits.push(data[idx + 2] & 1);
    }
  }

  let byteLen = 0;
  for (let i = 0; i < 32; i++) byteLen = (byteLen << 1) | allBits[i];

  const msgBits = allBits.slice(32, 32 + byteLen * 8);
  return bitsToString(msgBits);
}

/* ── Bit helpers ─────────────────────────────── */

function int32ToBits(num) {
  const bits = [];
  for (let i = 31; i >= 0; i--) bits.push((num >> i) & 1);
  return bits;
}

function bytesToBits(buf) {
  const bits = [];
  for (let i = 0; i < buf.length; i++) {
    for (let j = 7; j >= 0; j--) bits.push((buf[i] >> j) & 1);
  }
  return bits;
}

function bitsToString(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8 && (i + j) < bits.length; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return Buffer.from(bytes).toString('utf-8');
}

module.exports = { loadBaseImage, embedMessage, extractMessage };
