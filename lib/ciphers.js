/**
 * Classical Cipher Implementations
 * Caesar, Multiplicative, Affine, Vigenère, Autokey
 *
 * All functions work on uppercase A-Z only.
 * Non-alphabetic characters are preserved as-is.
 */

'use strict';

const ALPHABET_SIZE = 26;

/* ─────────────── Helpers ─────────────── */

/**
 * Greatest Common Divisor (Euclidean algorithm).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Modular inverse of `a` mod `m` using Extended Euclidean Algorithm.
 * Returns -1 if no inverse exists.
 * @param {number} a
 * @param {number} m
 * @returns {number}
 */
function modInverse(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  return -1;
}

/**
 * Positive modulo that always returns a non-negative result.
 * @param {number} n
 * @param {number} m
 * @returns {number}
 */
function mod(n, m) {
  return ((n % m) + m) % m;
}

/**
 * Returns all valid multiplicative keys for mod 26.
 * @returns {number[]}
 */
function getValidMultiplicativeKeys() {
  const keys = [];
  for (let k = 1; k < ALPHABET_SIZE; k++) {
    if (gcd(k, ALPHABET_SIZE) === 1) {
      keys.push(k);
    }
  }
  return keys;
}

/**
 * Converts a character to its numeric value (A=0, B=1, ..., Z=25).
 * Returns -1 if not an uppercase letter.
 * @param {string} ch
 * @returns {number}
 */
function charToNum(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  return -1;
}

/**
 * Converts a numeric value (0-25) to an uppercase letter.
 * @param {number} n
 * @returns {string}
 */
function numToChar(n) {
  return String.fromCharCode(mod(n, ALPHABET_SIZE) + 65);
}

/**
 * Prepares text for encryption: uppercases and keeps only A-Z.
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

/* ─────────────── Caesar Cipher ─────────────── */

/**
 * Encrypt plaintext with Caesar cipher.
 * @param {string} plaintext - Input text (only A-Z processed, rest preserved).
 * @param {number} shift - Key (0-25).
 * @returns {string}
 */
function caesarEncrypt(plaintext, shift) {
  shift = mod(shift, ALPHABET_SIZE);
  let result = '';
  for (const ch of plaintext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      result += numToChar(n + shift);
    }
  }
  return result;
}

/**
 * Decrypt Caesar ciphertext.
 * @param {string} ciphertext
 * @param {number} shift
 * @returns {string}
 */
function caesarDecrypt(ciphertext, shift) {
  return caesarEncrypt(ciphertext, ALPHABET_SIZE - mod(shift, ALPHABET_SIZE));
}

/* ─────────────── Multiplicative Cipher ─────────────── */

/**
 * Encrypt plaintext with Multiplicative cipher.
 * @param {string} plaintext
 * @param {number} key - Must satisfy gcd(key, 26) = 1.
 * @returns {string}
 */
function multiplicativeEncrypt(plaintext, key) {
  if (gcd(key, ALPHABET_SIZE) !== 1) {
    throw new Error(`Invalid multiplicative key: ${key}. gcd(${key}, 26) != 1`);
  }
  let result = '';
  for (const ch of plaintext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      result += numToChar((n * key) % ALPHABET_SIZE);
    }
  }
  return result;
}

/**
 * Decrypt Multiplicative ciphertext.
 * @param {string} ciphertext
 * @param {number} key
 * @returns {string}
 */
function multiplicativeDecrypt(ciphertext, key) {
  const inv = modInverse(key, ALPHABET_SIZE);
  if (inv === -1) {
    throw new Error(`No modular inverse for key ${key} mod 26`);
  }
  return multiplicativeEncrypt(ciphertext, inv);
}

/* ─────────────── Affine Cipher ─────────────── */

/**
 * Encrypt plaintext with Affine cipher: E(x) = (a*x + b) mod 26.
 * @param {string} plaintext
 * @param {number} a - Must satisfy gcd(a, 26) = 1.
 * @param {number} b - Shift value (0-25).
 * @returns {string}
 */
function affineEncrypt(plaintext, a, b) {
  if (gcd(a, ALPHABET_SIZE) !== 1) {
    throw new Error(`Invalid affine key a=${a}. gcd(${a}, 26) != 1`);
  }
  let result = '';
  for (const ch of plaintext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      result += numToChar((a * n + b) % ALPHABET_SIZE);
    }
  }
  return result;
}

/**
 * Decrypt Affine ciphertext: D(y) = a_inv * (y - b) mod 26.
 * @param {string} ciphertext
 * @param {number} a
 * @param {number} b
 * @returns {string}
 */
function affineDecrypt(ciphertext, a, b) {
  const aInv = modInverse(a, ALPHABET_SIZE);
  if (aInv === -1) {
    throw new Error(`No modular inverse for a=${a} mod 26`);
  }
  let result = '';
  for (const ch of ciphertext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      result += numToChar(mod(aInv * (n - b), ALPHABET_SIZE));
    }
  }
  return result;
}

/* ─────────────── Vigenère Cipher ─────────────── */

/**
 * Encrypt plaintext with Vigenère cipher.
 * @param {string} plaintext
 * @param {string} key - Keyword (A-Z characters).
 * @returns {string}
 */
function vigenereEncrypt(plaintext, key) {
  const keyClean = cleanText(key);
  if (keyClean.length === 0) throw new Error('Vigenère key must not be empty');

  let result = '';
  let ki = 0;
  for (const ch of plaintext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      const shift = charToNum(keyClean[ki % keyClean.length]);
      result += numToChar((n + shift) % ALPHABET_SIZE);
      ki++;
    }
  }
  return result;
}

/**
 * Decrypt Vigenère ciphertext.
 * @param {string} ciphertext
 * @param {string} key
 * @returns {string}
 */
function vigenereDecrypt(ciphertext, key) {
  const keyClean = cleanText(key);
  if (keyClean.length === 0) throw new Error('Vigenère key must not be empty');

  let result = '';
  let ki = 0;
  for (const ch of ciphertext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      const shift = charToNum(keyClean[ki % keyClean.length]);
      result += numToChar(mod(n - shift, ALPHABET_SIZE));
      ki++;
    }
  }
  return result;
}

/* ─────────────── Autokey Cipher ─────────────── */

/**
 * Encrypt plaintext with Autokey cipher.
 * The keyword is used first, then plaintext characters extend the key stream.
 * @param {string} plaintext
 * @param {string} keyword - Initial keyword (A-Z characters).
 * @returns {string}
 */
function autokeyEncrypt(plaintext, keyword) {
  const kwClean = cleanText(keyword);
  if (kwClean.length === 0) throw new Error('Autokey keyword must not be empty');

  const ptClean = cleanText(plaintext);
  // Build key stream: keyword + plaintext
  const keyStream = kwClean + ptClean;

  let result = '';
  let pi = 0;
  for (const ch of plaintext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      const shift = charToNum(keyStream[pi]);
      result += numToChar((n + shift) % ALPHABET_SIZE);
      pi++;
    }
  }
  return result;
}

/**
 * Decrypt Autokey ciphertext.
 * @param {string} ciphertext
 * @param {string} keyword
 * @returns {string}
 */
function autokeyDecrypt(ciphertext, keyword) {
  const kwClean = cleanText(keyword);
  if (kwClean.length === 0) throw new Error('Autokey keyword must not be empty');

  let keyStream = kwClean;
  let result = '';
  let ci = 0;
  for (const ch of ciphertext.toUpperCase()) {
    const n = charToNum(ch);
    if (n === -1) {
      result += ch;
    } else {
      const shift = charToNum(keyStream[ci]);
      const plain = mod(n - shift, ALPHABET_SIZE);
      result += numToChar(plain);
      // Extend key stream with recovered plaintext character
      keyStream += numToChar(plain);
      ci++;
    }
  }
  return result;
}

/* ─────────────── Frequency Analysis Helpers ─────────────── */

/**
 * Compute letter frequency distribution of a text.
 * Returns an object { A: count, B: count, ... }.
 * @param {string} text
 * @returns {Object<string, number>}
 */
function letterFrequency(text) {
  const freq = {};
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    freq[String.fromCharCode(65 + i)] = 0;
  }
  for (const ch of text.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') {
      freq[ch]++;
    }
  }
  return freq;
}

/* ─────────────── Exports ─────────────── */

module.exports = {
  ALPHABET_SIZE,
  gcd,
  modInverse,
  mod,
  getValidMultiplicativeKeys,
  charToNum,
  numToChar,
  cleanText,
  caesarEncrypt,
  caesarDecrypt,
  multiplicativeEncrypt,
  multiplicativeDecrypt,
  affineEncrypt,
  affineDecrypt,
  vigenereEncrypt,
  vigenereDecrypt,
  autokeyEncrypt,
  autokeyDecrypt,
  letterFrequency,
};
