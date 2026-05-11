function hashString(input) {
  const text = String(input ?? '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seedInput) {
  let state = hashString(seedInput) || 0x12345678;

  function next() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    float() {
      return next();
    },
    int(min, max) {
      let left = Number(min);
      let right = Number(max);
      if (!Number.isFinite(left)) left = 0;
      if (!Number.isFinite(right)) right = 0;
      if (right < left) {
        [left, right] = [right, left];
      }
      return Math.floor(next() * (right - left + 1)) + left;
    },
    bool(chance = 0.5) {
      const threshold = Math.max(0, Math.min(1, Number(chance)));
      return next() < threshold;
    },
    pick(list) {
      if (!Array.isArray(list) || list.length === 0) {
        return undefined;
      }
      return list[Math.floor(next() * list.length)];
    },
    shuffle(list) {
      const copy = Array.isArray(list) ? list.slice() : [];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    },
    sample(list, count) {
      return this.shuffle(list).slice(0, Math.max(0, Number(count) || 0));
    },
    weighted(items) {
      const normalized = Array.isArray(items)
        ? items.map((item) => {
            if (item && typeof item === 'object') {
              return {
                value: Object.prototype.hasOwnProperty.call(item, 'value')
                  ? item.value
                  : Object.prototype.hasOwnProperty.call(item, 'item')
                    ? item.item
                    : item,
                weight: Math.max(0, Number(item.weight) || 0)
              };
            }
            return { value: item, weight: 1 };
          })
        : [];

      const total = normalized.reduce((acc, item) => acc + item.weight, 0);
      if (total <= 0) {
        return normalized.length > 0 ? normalized[0].value : undefined;
      }

      let cursor = next() * total;
      for (const item of normalized) {
        cursor -= item.weight;
        if (cursor <= 0) {
          return item.value;
        }
      }

      return normalized[normalized.length - 1]?.value;
    },
    fork(label) {
      return createRng(`${seedInput}:${label}:${state}`);
    }
  };
}

module.exports = {
  hashString,
  createRng
};
