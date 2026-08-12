/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Produces deterministic sequences from a given seed.
 * Same seed always yields the same sequence.
 */

'use strict';

class SeededRandom {
  /**
   * @param {number|string} seed - A numeric seed or string (hashed to number).
   */
  constructor(seed) {
    if (typeof seed === 'string') {
      this._state = SeededRandom.hashString(seed);
    } else {
      this._state = seed >>> 0;
    }
    // Ensure non-zero state
    if (this._state === 0) this._state = 1;
  }

  /**
   * Hash a string to a 32-bit unsigned integer.
   * Uses a simple but effective FNV-1a variant.
   * @param {string} str
   * @returns {number}
   */
  static hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Returns the next random float in [0, 1).
   * Uses the Mulberry32 algorithm.
   * @returns {number}
   */
  next() {
    this._state |= 0;
    this._state = (this._state + 0x6D2B79F5) | 0;
    let t = Math.imul(this._state ^ (this._state >>> 15), 1 | this._state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] (inclusive).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from an array.
   * @param {Array} arr
   * @returns {*}
   */
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /**
   * Shuffles an array in-place using Fisher-Yates (deterministic).
   * Returns the array for chaining.
   * @param {Array} arr
   * @returns {Array}
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Picks `count` unique elements from an array.
   * @param {Array} arr
   * @param {number} count
   * @returns {Array}
   */
  sample(arr, count) {
    const copy = [...arr];
    this.shuffle(copy);
    return copy.slice(0, count);
  }
}

module.exports = SeededRandom;
