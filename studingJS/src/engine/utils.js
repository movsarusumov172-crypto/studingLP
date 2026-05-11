const { inspect } = require('node:util');

const FIRST_NAMES = [
  'Ada', 'Mila', 'Nina', 'Oleg', 'Leo', 'Sara', 'Ilya', 'Zoe', 'Maks', 'Lina',
  'Vera', 'Pavel', 'Rita', 'Artem', 'Noah', 'Iris', 'Dina', 'Roman'
];

const WORD_POOL = [
  'alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector',
  'lumen', 'mint', 'orbit', 'cinder', 'azure', 'pixel', 'vivid', 'spark',
  'drift', 'tide', 'echo', 'frost', 'ember', 'quartz'
];

const CITY_POOL = [
  'Berlin', 'Tokyo', 'Oslo', 'Lisbon', 'Prague', 'Riga', 'Milan', 'Helsinki',
  'Athens', 'Seoul', 'Rome', 'Paris', 'Madrid', 'Dublin'
];

const EMAIL_DOMAINS = ['example.com', 'mail.dev', 'train.local', 'code.run'];

function cloneJson(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fall through to JSON clone.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function preview(value) {
  return inspect(value, {
    depth: 2,
    maxArrayLength: 8,
    breakLength: 90,
    compact: true
  }).replace(/\n/g, ' ');
}

function quote(value) {
  return JSON.stringify(value);
}

function capitalize(value) {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sum(list) {
  return Array.isArray(list) ? list.reduce((acc, item) => acc + Number(item || 0), 0) : 0;
}

function unique(list) {
  return Array.from(new Set(Array.isArray(list) ? list : []));
}

function sampleWord(rng) {
  return rng.pick(WORD_POOL);
}

function sampleName(rng) {
  return rng.pick(FIRST_NAMES);
}

function sampleCity(rng) {
  return rng.pick(CITY_POOL);
}

function sampleEmail(rng, name) {
  const local = String(name || sampleName(rng)).toLowerCase();
  return `${local}.${rng.pick(['dev', 'js', 'code', 'lab'])}@${rng.pick(EMAIL_DOMAINS)}`;
}

function sampleNumbers(rng, count, min = 0, max = 50, allowNegative = false) {
  return Array.from({ length: Math.max(0, Number(count) || 0) }, () => {
    const value = rng.int(min, max);
    if (allowNegative && rng.bool(0.35)) {
      return -value;
    }
    return value;
  });
}

function sampleWords(rng, count) {
  return Array.from({ length: Math.max(0, Number(count) || 0) }, () => sampleWord(rng));
}

function samplePersons(rng, count) {
  const used = new Set();
  return Array.from({ length: Math.max(0, Number(count) || 0) }, () => {
    let name = sampleName(rng);
    while (used.has(name)) {
      name = sampleName(rng);
    }
    used.add(name);
    return {
      name,
      score: rng.int(40, 100),
      city: sampleCity(rng)
    };
  });
}

function sampleIntervals(rng, count) {
  const intervals = [];
  let current = rng.int(0, 5);
  for (let index = 0; index < Math.max(0, Number(count) || 0); index += 1) {
    const start = current + rng.int(0, 4);
    const end = start + rng.int(1, 5);
    intervals.push([start, end]);
    current = start;
  }
  return intervals;
}

function sampleText(rng, length) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let index = 0; index < Math.max(0, Number(length) || 0); index += 1) {
    result += alphabet[rng.int(0, alphabet.length - 1)];
  }
  return result;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  cloneJson,
  preview,
  quote,
  capitalize,
  sum,
  unique,
  sampleWord,
  sampleName,
  sampleCity,
  sampleEmail,
  sampleNumbers,
  sampleWords,
  samplePersons,
  sampleIntervals,
  sampleText,
  isPlainObject
};
