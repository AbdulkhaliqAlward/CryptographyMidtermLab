/**
 * Lab Generator — Chained Cryptographic Investigation (Anti-AI Hardened)
 *
 * Architecture & Obfuscation Layers:
 * 1. Chained plaintexts: Plaintext N provides the key/parameters for Case N+1.
 * 2. Complete NUM_WORDS: All numeric keys (1-25) mapped to English words.
 * 3. Null Cipher / Dummy Character Insertion: Every K-th character is random noise.
 * 4. Block Alternation: Every second 5-character group is reversed.
 * 5. Multi-format presentation: Decimal ASCII values, Binary streams, and Scrambled blocks.
 * 6. Student Identity Watermarking: Operation Codes derived deterministically from studentId.
 */

'use strict';

const archiver = require('archiver');
const SeededRandom = require('./seededRandom');
const ciphers = require('./ciphers');
const stego = require('./steganography');

/* ══════════════════════════════════════════════════════════
   NUMBER WORDS — Complete 1 to 25 mapping
   ══════════════════════════════════════════════════════════ */
const NUM_WORDS = {
  0: 'ZERO', 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
  6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
  11: 'ELEVEN', 12: 'TWELVE', 13: 'THIRTEEN', 14: 'FOURTEEN', 15: 'FIFTEEN',
  16: 'SIXTEEN', 17: 'SEVENTEEN', 18: 'EIGHTEEN', 19: 'NINETEEN', 20: 'TWENTY',
  21: 'TWENTY ONE', 22: 'TWENTY TWO', 23: 'TWENTY THREE', 24: 'TWENTY FOUR', 25: 'TWENTY FIVE',
  26: 'TWENTY SIX'
};

const NATO_PHONETIC = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU'];

const VALID_MULT_KEYS = ciphers.getValidMultiplicativeKeys().filter(k => k > 2);

/* ══════════════════════════════════════════════════════════
   PLAINTEXT TEMPLATES
   ══════════════════════════════════════════════════════════ */

const TPL_CASE01 = [
  'INCIDENT RESPONSE REPORT CLASSIFIED TRANSMISSION WE HAVE RECOVERED INTERCEPTED DATA FROM THE COMPROMISED RELAY THE FIRST RECOVERED VALUE NEEDED TO UNLOCK THE SECOND TRANSMISSION IS {{CLUE}} DOCUMENT ALL INTERMEDIATE COMPUTATIONS',
  'SYSTEM FORENSIC LOG CLUSTER DETECTED UNAUTHORIZED EXFILTRATION ON THE INTERNAL NETWORK SEGMENT A CRITICAL PARAMETER HAS BEEN EXTRACTED FOR STAGE TWO THE VALUE IS {{CLUE}} PROCEED WITH CAUTION AND LOG YOUR PROCESS',
  'SECURITY AUDIT CONFIRMS LATERAL MOVEMENT ACROSS STAGING SERVERS THE ADVERSARY LEFT LAYERED ENCRYPTED TRACES THE PRIMARY OPERATIONAL VALUE FOR THE SECOND RECORD IS {{CLUE}} VERIFY ALL HYPOTHESES THOROUGHLY',
];

const TPL_CASE02 = [
  'SECOND LAYER TRANSMISSION DECRYPTED SUCCESSFUL CONFIRMATION THE SUBSEQUENT FILE REQUIRES DUAL RECOVERED PARAMETERS WHERE THE FIRST VALUE IS {{CLUE_A}} AND THE SECOND VALUE IS {{CLUE_B}} PREPARE SYSTEM FOR STAGE THREE',
  'INTERMEDIATE LOG STREAM RECOVERED THE DUAL COMPONENT VALUES HAVE BEEN ISOLATED THE FIRST FACTOR EQUALS {{CLUE_A}} AND THE SECOND COMPONENT EQUALS {{CLUE_B}} APPLY BOTH PROPERLY TO PROCEED TO THE THIRD ARTIFACT',
  'TRANSMISSION RECONSTRUCTION COMPLETE THE ADVERSARY ROTATED PARAMETERS THE FIRST IDENTIFIED METRIC IS {{CLUE_A}} AND THE ASSOCIATED SHIFT IS {{CLUE_B}} PROCEED TO THE NEXT TARGET FILE',
];

const TPL_CASE03 = [
  'THIRD LAYER RECOVERED OPERATION IDENTIFIER {{OP_CODE}} CONFIRMED FOR ANALYST THE FOLLOWING FILE EXHIBITS A PROPERTY WHERE A CORE METRIC CONSISTS OF EXACTLY {{CLUE_LEN}} CHARACTERS USE THIS DETERMINATION TO UNCOVER THE KEYWORD',
  'INTERNAL RECORD THREE RETRIEVED OPERATION CODE {{OP_CODE}} RECORDED THE EVIDENCE SUGGESTS THE SUBSEQUENT CIPHER UTILIZES A PATTERN WITH LENGTH {{CLUE_LEN}} LETTERS APPLY STATISTICAL ANALYSIS ACCORDINGLY',
  'SECURITY CLEARANCE VERIFIED CODE {{OP_CODE}} THE SUBSEQUENT RECORD CONTAINS A METRIC STRUCTURE SPANNING EXACTLY {{CLUE_LEN}} CHARACTERS ISOLATE INDIVIDUAL POSITIONS TO RECONSTRUCT THE FULL PHRASE',
];

const TPL_CASE04_LONG = [
  'FOURTH ARTIFACT RECOVERED IN FULL THE ADVERSARY HAS APPLIED A DYNAMIC STREAM TO THE FINAL CIPHER FILE THE INITIAL SEED WORD IS {{CLUE_KW}} DECRYPT THE FIFTH RECORD AND THEN ANALYZE THE EVIDENCE IMAGE FILE INCLUDED IN YOUR DOSSIER FOR STEGANOGRAPHIC ARTIFACTS',
  'ADVANCED ANALYSIS COMPLETED THE DYNAMIC CIPHER STREAM REQUIRES AN INITIAL SEED THE RECOVERED SEED PHRASE IS {{CLUE_KW}} EXECUTE DECRYPTION ON CASE FIVE AND EXTRACT THE COVERT EVIDENCE CONCEALED IN THE ATTACHED IMAGE PIXELS',
];

const TPL_CASE05 = [
  'FINAL CIPHER LAYER TERMINATED SUCCESSFULLY THE ADVERSARY STORED THE ULTIMATE VERIFICATION DATA WITHIN THE EVIDENCE IMAGE FILE READ THE LEAST SIGNIFICANT BITS TO OBTAIN YOUR FINAL VERIFICATION TOKEN',
  'ALL CIPHER TRANSMISSIONS CLEARED THE LAST EVIDENCE RECORD IS EMBEDDED DIRECTLY IN THE ATTACHED IMAGE RECONSTRUCT THE HIDDEN BINARY PAYLOAD TO RETRIEVE YOUR UNIQUE COMPLETION TOKEN',
];

/* ══════════════════════════════════════════════════════════
   KEYWORDS
   ══════════════════════════════════════════════════════════ */
const VIG_KEYWORDS = {
  4: ['BYTE', 'LOCK', 'GATE', 'SALT', 'HASH', 'FLUX', 'MINE', 'DAWN', 'PEAK', 'GLOW'],
  5: ['PRISM', 'NEXUS', 'COMET', 'STORM', 'TRACE', 'GHOST', 'ORBIT', 'FLARE', 'QUAKE', 'SONIC'],
  6: ['CIPHER', 'FALCON', 'BEACON', 'SHIELD', 'VORTEX', 'MATRIX', 'CARBON', 'SUMMIT', 'NEBULA', 'ZENITH'],
  7: ['PHOTONS', 'ENCRYPT', 'QUANTUM', 'ORBITAL', 'KEYRING', 'FRACTAL', 'THERMAL', 'SYNTHET', 'NODEMAP', 'SPARTAN'],
};

const AUTOKEY_KEYWORDS = [
  'SUN', 'OAK', 'ICE', 'GEM', 'ORB', 'FOG', 'HEX', 'RIM', 'ARC', 'DEN',
  'ASH', 'ELM', 'DIG', 'BAY', 'BOW', 'DAM', 'FIN', 'HUB', 'JAR', 'KIT',
];

const MONO_CIPHERS = ['caesar', 'multiplicative', 'affine'];

/* ══════════════════════════════════════════════════════════
   ANTI-AI OBFUSCATION UTILITIES
   ══════════════════════════════════════════════════════════ */

/**
 * Calculates student-specific noise interval N (between 3 and 6)
 */
function getStudentNoiseInterval(studentId) {
  const sum = studentId.split('').reduce((acc, c) => acc + (parseInt(c, 10) || 0), 0);
  return (sum % 4) + 3;
}

/**
 * Inserts random dummy uppercase letters every `interval` characters
 */
function injectNoise(text, interval, rng) {
  const clean = text.replace(/[^A-Z]/g, '');
  let result = '';
  let counter = 0;
  for (let i = 0; i < clean.length; i++) {
    result += clean[i];
    counter++;
    if (counter === interval - 1) {
      const dummyChar = String.fromCharCode(65 + rng.nextInt(0, 25));
      result += dummyChar;
      counter = 0;
    }
  }
  return result;
}

/**
 * Reverses every second 5-character block
 */
function scrambleBlocks(text) {
  const clean = text.replace(/[^A-Z]/g, '');
  const blocks = [];
  for (let i = 0; i < clean.length; i += 5) {
    blocks.push(clean.substring(i, i + 5));
  }
  for (let b = 1; b < blocks.length; b += 2) {
    blocks[b] = blocks[b].split('').reverse().join('');
  }
  return blocks.join('');
}

/**
 * Converts text into decimal format (A=00, B=01, ..., Z=25)
 */
function toDecimalFormat(text) {
  const clean = text.replace(/[^A-Z]/g, '');
  const nums = [];
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 65;
    nums.push(String(code).padStart(2, '0'));
  }
  const lines = [];
  for (let i = 0; i < nums.length; i += 15) {
    lines.push(nums.slice(i, i + 15).join(' '));
  }
  return lines.join('\n');
}

/**
 * Converts text into 5-bit binary format per letter
 */
function toBinaryFormat(text) {
  const clean = text.replace(/[^A-Z]/g, '');
  const bins = [];
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 65;
    bins.push(code.toString(2).padStart(5, '0'));
  }
  const lines = [];
  for (let i = 0; i < bins.length; i += 10) {
    lines.push(bins.slice(i, i + 10).join(' '));
  }
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════
   MAIN GENERATOR
   ══════════════════════════════════════════════════════════ */

function generateLab(studentName, studentId) {
  const seed = 'MIDTERM-CRYPTO-2026-' + studentId;
  const rng = new SeededRandom(seed);

  // Final token & Operation Code
  const tokenHex = rng.nextInt(0x1000, 0xFFFF).toString(16).toUpperCase();
  const nameHash = computeNameCode(studentName, rng);
  const finalToken = 'MID26-' + tokenHex + '-' + nameHash;

  const opWord1 = rng.pick(NATO_PHONETIC);
  const opWord2 = rng.pick(NATO_PHONETIC);
  const opCode = opWord1 + ' ' + opWord2;

  // Student specific noise parameter
  const noiseInterval = getStudentNoiseInterval(studentId);

  // Shuffle monoalphabetic order for cases 1-3
  const monoOrder = [...MONO_CIPHERS];
  rng.shuffle(monoOrder);

  // Polyalphabetic swap
  const swapPolyAlpha = rng.next() > 0.5;
  const case04Type = swapPolyAlpha ? 'autokey' : 'vigenere';
  const case05Type = swapPolyAlpha ? 'vigenere' : 'autokey';

  // Generate keys
  const caesarShift = rng.nextInt(4, 22);
  const multKey = rng.pick(VALID_MULT_KEYS);
  const affineA = rng.pick(VALID_MULT_KEYS.filter(k => k !== multKey));
  const affineB = rng.nextInt(1, 24);
  const vigKeyLen = rng.pick([4, 5, 6, 7]);
  const vigKeyword = rng.pick(VIG_KEYWORDS[vigKeyLen]);
  const autoKeyword = rng.pick(AUTOKEY_KEYWORDS);

  const keyMap = {
    caesar: { shift: caesarShift },
    multiplicative: { key: multKey },
    affine: { a: affineA, b: affineB },
    vigenere: { keyword: vigKeyword },
    autokey: { keyword: autoKeyword },
  };

  // Case 01
  const case01Cipher = monoOrder[0];
  const case02Cipher = monoOrder[1];
  const case03Cipher = monoOrder[2];

  const case02ClueValue = getCipherSingleKey(case02Cipher, keyMap);
  const case01Plaintext = fillTemplate(rng.pick(TPL_CASE01), {
    CLUE: NUM_WORDS[case02ClueValue] || String(case02ClueValue)
  });

  // Case 02
  const case03Params = getCipherDualParams(case03Cipher, keyMap);
  const case02Plaintext = fillTemplate(rng.pick(TPL_CASE02), {
    CLUE_A: NUM_WORDS[case03Params.a] || String(case03Params.a),
    CLUE_B: NUM_WORDS[case03Params.b] || String(case03Params.b),
  });

  // Case 03
  const case04Keyword = case04Type === 'vigenere' ? vigKeyword : autoKeyword;
  const case04KeyLen = case04Keyword.length;
  const case03Plaintext = fillTemplate(rng.pick(TPL_CASE03), {
    OP_CODE: opCode,
    CLUE_LEN: NUM_WORDS[case04KeyLen] || numToWord(case04KeyLen),
  });

  // Case 04 & 05
  const case05Keyword = case05Type === 'autokey' ? autoKeyword : vigKeyword;
  const case04Plaintext = fillTemplate(rng.pick(TPL_CASE04_LONG), { CLUE_KW: case05Keyword });
  const case05Plaintext = rng.pick(TPL_CASE05);

  const rawCases = [
    { num: 1, cipher: case01Cipher, plaintext: case01Plaintext },
    { num: 2, cipher: case02Cipher, plaintext: case02Plaintext },
    { num: 3, cipher: case03Cipher, plaintext: case03Plaintext },
    { num: 4, cipher: case04Type, plaintext: case04Plaintext },
    { num: 5, cipher: case05Type, plaintext: case05Plaintext },
  ];

  const cases = [];
  const answerCases = [];

  for (const c of rawCases) {
    const rawCiphertext = encryptWithCipher(c.cipher, c.plaintext, keyMap);
    
    // Obfuscation Layer Application
    let formattedCT = '';
    if (c.num === 1) {
      // Case 1: Standard encrypted text with block alternating scramble
      const scrambled = scrambleBlocks(rawCiphertext);
      formattedCT = formatCiphertext(scrambled);
    } else if (c.num === 2) {
      // Case 2: Injected noise letters + block scramble
      const withNoise = injectNoise(rawCiphertext, noiseInterval, rng);
      const scrambled = scrambleBlocks(withNoise);
      formattedCT = formatCiphertext(scrambled);
    } else if (c.num === 3) {
      // Case 3: Injected noise letters
      const withNoise = injectNoise(rawCiphertext, noiseInterval, rng);
      formattedCT = formatCiphertext(withNoise);
    } else if (c.num === 4) {
      // Case 4: Decimal numeric stream representation (00-25)
      formattedCT = toDecimalFormat(rawCiphertext);
    } else if (c.num === 5) {
      // Case 5: 5-bit binary block stream
      formattedCT = toBinaryFormat(rawCiphertext);
    }

    cases.push({
      caseNum: c.num,
      cipherType: c.cipher,
      ciphertext: formattedCT,
    });

    answerCases.push({
      caseNum: c.num,
      cipherType: c.cipher,
      key: describeKey(c.cipher, keyMap),
      plaintext: c.plaintext,
      ciphertext: formattedCT,
    });
  }

  // Steganography
  const stegoMsg = 'INVESTIGATION COMPLETE. VERIFICATION TOKEN: ' + finalToken + ' | ANALYST: ' + studentName.toUpperCase();
  const basePng = stego.loadBaseImage(rng);
  const stegoBuffer = stego.embedMessage(basePng, stegoMsg);

  // README
  const readme = generateReadme(studentName, studentId, noiseInterval);

  // ZIP
  const zipPromise = createZip(studentId, cases, stegoBuffer, readme);

  const answerKey = {
    studentName,
    studentId,
    finalToken,
    opCode,
    noiseInterval,
    cases: answerCases,
    stegoMessage: stegoMsg,
    cipherOrder: rawCases.map(c => c.cipher),
  };

  return { zipBuffer: zipPromise, answerKey };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function computeNameCode(name, rng) {
  const hash = SeededRandom.hashString(name.toUpperCase());
  return (hash % 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function fillTemplate(tpl, replacements) {
  let result = tpl;
  for (const [key, val] of Object.entries(replacements)) {
    result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val);
  }
  return result;
}

function numToWord(n) {
  return NUM_WORDS[n] || String(n);
}

function getCipherSingleKey(cipher, keyMap) {
  switch (cipher) {
    case 'caesar': return keyMap.caesar.shift;
    case 'multiplicative': return keyMap.multiplicative.key;
    case 'affine': return keyMap.affine.a;
    default: return 0;
  }
}

function getCipherDualParams(cipher, keyMap) {
  switch (cipher) {
    case 'affine': return { a: keyMap.affine.a, b: keyMap.affine.b };
    case 'caesar': return { a: 1, b: keyMap.caesar.shift };
    case 'multiplicative': return { a: keyMap.multiplicative.key, b: 0 }; // Affine(a, 0) mod 26, shift = ZERO
    default: return { a: 1, b: 1 };
  }
}

function encryptWithCipher(cipher, plaintext, keyMap) {
  switch (cipher) {
    case 'caesar': return ciphers.caesarEncrypt(plaintext, keyMap.caesar.shift);
    case 'multiplicative': return ciphers.multiplicativeEncrypt(plaintext, keyMap.multiplicative.key);
    case 'affine': return ciphers.affineEncrypt(plaintext, keyMap.affine.a, keyMap.affine.b);
    case 'vigenere': return ciphers.vigenereEncrypt(plaintext, keyMap.vigenere.keyword);
    case 'autokey': return ciphers.autokeyEncrypt(plaintext, keyMap.autokey.keyword);
    default: return plaintext;
  }
}

function describeKey(cipher, keyMap) {
  switch (cipher) {
    case 'caesar': return 'shift = ' + keyMap.caesar.shift;
    case 'multiplicative': return 'key = ' + keyMap.multiplicative.key;
    case 'affine': return 'a = ' + keyMap.affine.a + ', b = ' + keyMap.affine.b;
    case 'vigenere': return 'keyword = "' + keyMap.vigenere.keyword + '" (length ' + keyMap.vigenere.keyword.length + ')';
    case 'autokey': return 'keyword = "' + keyMap.autokey.keyword + '"';
    default: return '';
  }
}

function formatCiphertext(text) {
  const clean = text.replace(/[^A-Z]/g, '');
  const groups = [];
  for (let i = 0; i < clean.length; i += 5) groups.push(clean.substring(i, i + 5));
  const lines = [];
  for (let i = 0; i < groups.length; i += 10) lines.push(groups.slice(i, i + 10).join(' '));
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════
   README GENERATOR
   ══════════════════════════════════════════════════════════ */

function generateReadme(studentName, studentId) {
  return `# Midterm Practical Lab — Cryptographic Investigation

**Analyst:** ${studentName}  
**Student ID:** ${studentId}  
**Issue Date:** ${new Date().toISOString().split('T')[0]}  

---

## Scenario & Intelligence Brief

You are acting as a Cryptanalyst investigating an adversary communication network. Five intercepted transmissions and one suspicious image artifact have been recovered from a compromised relay.

The recovered transmissions are **chained**: the plaintext recovered from each case contains critical intelligence and parameters needed to unlock the subsequent layer.

### Transmission Observations
The adversary utilized layered cryptographic algorithms alongside custom data formatting, transport noise, and structural obfuscation to disguise message statistics. You must carefully inspect the raw transmission formats, clean any transport irregularities, identify the underlying cipher families, and recover the keys and plaintexts.

---

## Intercept Dossier

| File | Description |
|---|---|
| \`case_01.txt\` | Intercepted Transmission 01 |
| \`case_02.txt\` | Intercepted Transmission 02 |
| \`case_03.txt\` | Intercepted Transmission 03 |
| \`case_04.txt\` | Intercepted Transmission 04 |
| \`case_05.txt\` | Intercepted Transmission 05 |
| \`evidence.png\` | Recovered Image Artifact |

---

## Investigation Workflow

1. **Case 01:** Inspect the transmission structure. Clean any transport anomalies, identify the cipher family, and recover the key and the embedded parameter for Case 02.
2. **Case 02:** Use the parameter from Case 01 to assist decryption. Inspect the stream for transport noise and recover the parameters for Case 03.
3. **Case 03:** Decrypt using the parameters from Case 02. Note your student-specific **Operation Code** embedded in the plaintext and recover the metric for Case 04.
4. **Case 04:** Convert the numerical representation into characters, perform polyalphabetic frequency analysis, and recover the keyword phrase for Case 05.
5. **Case 05:** Decode the binary representation to text, decrypt using the keyword phrase, and follow the instructions to proceed to the image analysis.
6. **Steganography Analysis:** Inspect \`evidence.png\`. Extract the bit-level hidden payload to recover your **Final Verification Token**.

---

## Deliverables & Submission Guidelines

Submit a single archive named \`MIDTERM_${studentId}.zip\` containing:

\`\`\`text
MIDTERM_${studentId}/
├── report.pdf             (Final comprehensive PDF report with screenshots)
├── code/
│   ├── case_01.py         (Clean, documented Python analysis code for each case)
│   ├── case_02.py
│   ├── case_03.py
│   ├── case_04.py
│   ├── case_05.py
│   └── stego_extract.py   (Bit extraction code for evidence.png)
└── evidence/
    └── (Screenshots, frequency distribution plots, and terminal logs)
\`\`\`

---

## Report Requirements (PDF)

Your submitted **PDF Report** must include screenshots and detailed step-by-step documentation:
1. **Mathematical Derivations & Code Execution:** Show terminal outputs with your code recovering each key.
2. **Hypothesis Testing:** For each case, state at least one failed hypothesis and why it was rejected.
3. **Operation Code & Plaintexts:** Document your recovered plaintexts, keys, and your student Operation Code.
4. **Steganography Methodology:** Bit-level diagram and screenshot of your payload extraction script.

---

## Concept Questions (To Answer in Report)

### Q1. Key Space Analysis
- Calculate the exact key space for Caesar, Multiplicative, Affine, Vigenere (length $L$), and Autokey.
- Explain why key space magnitude alone is insufficient for modern computational security.

### Q2. Modular Arithmetic Requirements
- Explain why $\\gcd(a, 26) = 1$ is mandatory in modular multiplication. What happens mathematically when $\\gcd(a, 26) \\neq 1$? Provide a numerical counterexample.
- Calculate the modular multiplicative inverse of one key you recovered, showing the Extended Euclidean step-by-step.

### Q3. Polyalphabetic & Stream Properties
- Detail the Kasiski Examination procedure. Why does standard Vigenere produce repetitive patterns while Autokey mitigates them?
- What are the mathematical limitations of Autokey against known-plaintext attacks?

### Q4. Diffusion & Confusion Evaluation
- Take the recovered plaintext of Case 01 or 02. Modify a single character and re-encrypt with your key.
- Measure the percentage of changed ciphertext characters. What does this demonstrate regarding the Diffusion property in classical ciphers?

---

## Oral Defense Preparation
You must be ready to explain and reproduce your work during the live examination:
- How you reversed the block scramble and detected noise frequencies.
- How you computed modular inverses and resolved cipher systems.
- How the LSB 32-bit header was parsed to terminate bit extraction.
`;
}

/* ══════════════════════════════════════════════════════════
   ZIP CREATION
   ══════════════════════════════════════════════════════════ */

function createZip(studentId, cases, stegoBuffer, readme) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', function (c) { chunks.push(c); });
    archive.on('end', function () { resolve(Buffer.concat(chunks)); });
    archive.on('error', function (e) { reject(e); });

    const dir = 'MIDTERM_LAB_' + studentId;
    archive.append(readme, { name: dir + '/README.md' });

    for (const c of cases) {
      const header = 'CASE ' + String(c.caseNum).padStart(2, '0');
      const sep = '='.repeat(50);
      const body = [
        header, sep, '',
        'The following ciphertext stream was intercepted.',
        'Apply forensic analysis to reconstruct the transmission.',
        '', '-'.repeat(50), '',
        c.ciphertext,
        '', '-'.repeat(50),
      ].join('\n');
      archive.append(body, { name: dir + '/case_' + String(c.caseNum).padStart(2, '0') + '.txt' });
    }

    archive.append(stegoBuffer, { name: dir + '/evidence.png' });
    archive.finalize();
  });
}

module.exports = { generateLab };

/* ══════════════════════════════════════════════════════════
   ZIP CREATION
   ══════════════════════════════════════════════════════════ */


