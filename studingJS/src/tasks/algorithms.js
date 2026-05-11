const { buildTask, pickVariant, preview, sampleNumbers, sampleIntervals, sampleText } = require('../engine/taskShared');

function buildAlgorithmsTask(difficulty, rng) {
  const create = (spec) => buildTask({
    category: 'algorithms',
    difficulty,
    ...spec
  });

  const gcd = (a, b) => {
    let left = Math.abs(a);
    let right = Math.abs(b);
    while (right !== 0) {
      const temp = left % right;
      left = right;
      right = temp;
    }
    return left;
  };
  const binarySearch = (values, target) => {
    let left = 0;
    let right = values.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (values[mid] === target) {
        return mid;
      }
      if (values[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return -1;
  };

  switch (difficulty) {
    case 'easy': {
      return pickVariant(rng, [
        () => {
          const a = rng.int(2, 40);
          const b = rng.int(2, 40);
          const expected = gcd(a, b);
          return create({
            title: 'НОД двух чисел',
            prompt: `Верни наибольший общий делитель чисел a = ${a} и b = ${b}.`,
            signature: 'solve(a, b)',
            starterBody: ['return a;'],
            solutionBody: [
              'let left = Math.abs(a);',
              'let right = Math.abs(b);',
              'while (right !== 0) {',
              '  const temp = left % right;',
              '  left = right;',
              '  right = temp;',
              '}',
              'return left;'
            ],
            hints: ['Используй алгоритм Евклида.', 'Пока остаток не ноль, повторяй деление с остатком.'],
            explanation: 'Это один из самых полезных базовых алгоритмов для практики циклов и арифметики.',
            tests: [
              { args: [a, b], expected },
              { args: [48, 18], expected: 6 }
            ],
            tags: ['gcd', 'euclid']
          });
        },
        () => {
          const values = Array.from({ length: 10 }, (_, index) => index * 2 + 1);
          const target = values[rng.int(0, values.length - 1)];
          const expected = binarySearch(values, target);
          return create({
            title: 'Бинарный поиск',
            prompt: `Дан отсортированный массив values = ${preview(values)} и target = ${target}. Верни индекс target или -1.`,
            signature: 'solve(values, target)',
            starterBody: ['return values.indexOf(target);'],
            solutionBody: [
              'let left = 0;',
              'let right = values.length - 1;',
              'while (left <= right) {',
              '  const mid = Math.floor((left + right) / 2);',
              '  if (values[mid] === target) {',
              '    return mid;',
              '  }',
              '  if (values[mid] < target) {',
              '    left = mid + 1;',
              '  } else {',
              '    right = mid - 1;',
              '  }',
              '}',
              'return -1;'
            ],
            hints: ['Держи два указателя - левый и правый.', 'Сравнивай target с серединой диапазона.'],
            explanation: 'Бинарный поиск работает только на отсортированном массиве и быстро сужает диапазон.',
            tests: [
              { args: [values, target], expected },
              { args: [[1, 3, 5, 7, 9], 7], expected: 3 },
              { args: [[1, 3, 5, 7, 9], 4], expected: -1 }
            ],
            tags: ['binary-search', 'search']
          });
        },
        () => {
          const text = sampleText(rng, rng.int(5, 9));
          const isPalindrome = text === text.split('').reverse().join('');
          return create({
            title: 'Палиндром',
            prompt: `Дана строка text = ${JSON.stringify(text)}. Проверь, является ли она палиндромом.`,
            signature: 'solve(text)',
            starterBody: ['return false;'],
            solutionBody: [
              'const normalized = text.toLowerCase();',
              'return normalized === normalized.split("").reverse().join("");'
            ],
            hints: ['Сравни строку с её обратной копией.', 'Можно привести текст к нижнему регистру.'],
            explanation: 'Проверка палиндрома - хорошая разминка на строки и массивы символов.',
            tests: [
              { args: [text], expected: isPalindrome },
              { args: ['level'], expected: true },
              { args: ['javascript'], expected: false }
            ],
            tags: ['string', 'palindrome']
          });
        }
      ])();
    }
    case 'medium': {
      return pickVariant(rng, [
        () => {
          const values = sampleNumbers(rng, rng.int(6, 9), 1, 20);
          const target = values[0] + values[values.length - 1];
          const expected = (() => {
            const map = new Map();
            for (let index = 0; index < values.length; index += 1) {
              const need = target - values[index];
              if (map.has(need)) {
                return [map.get(need), index];
              }
              map.set(values[index], index);
            }
            return [];
          })();
          return create({
            title: 'Two Sum',
            prompt: `Дан массив values = ${preview(values)} и target = ${target}. Верни индексы двух чисел, сумма которых равна target.`,
            signature: 'solve(values, target)',
            starterBody: ['return [];'],
            solutionBody: [
              'const seen = new Map();',
              'for (let index = 0; index < values.length; index += 1) {',
              '  const value = values[index];',
              '  const need = target - value;',
              '  if (seen.has(need)) {',
              '    return [seen.get(need), index];',
              '  }',
              '  if (!seen.has(value)) {',
              '    seen.set(value, index);',
              '  }',
              '}',
              'return [];'
            ],
            hints: ['Храни уже увиденные числа в `Map`.', 'Тогда для каждого значения можно быстро искать дополнение.'],
            explanation: 'Это один из самых известных приёмов с хэш-таблицей и дополнительной памятью.',
            tests: [
              { args: [values, target], expected },
              { args: [[2, 7, 11, 15], 9], expected: [0, 1] }
            ],
            tags: ['hash', 'pair']
          });
        },
        () => {
          const intervals = sampleIntervals(rng, rng.int(4, 6));
          const merged = intervals
            .slice()
            .sort((a, b) => a[0] - b[0] || a[1] - b[1])
            .reduce((result, interval) => {
              if (result.length === 0) {
                result.push(interval.slice());
                return result;
              }
              const last = result[result.length - 1];
              if (interval[0] <= last[1]) {
                last[1] = Math.max(last[1], interval[1]);
              } else {
                result.push(interval.slice());
              }
              return result;
            }, []);
          return create({
            title: 'Слияние интервалов',
            prompt: `Дан массив intervals = ${preview(intervals)}. Объедини пересекающиеся интервалы.`,
            signature: 'solve(intervals)',
            starterBody: ['return intervals;'],
            solutionBody: [
              'if (intervals.length === 0) {',
              '  return [];',
              '}',
              'const sorted = intervals.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);',
              'const result = [sorted[0].slice()];',
              'for (let index = 1; index < sorted.length; index += 1) {',
              '  const [start, end] = sorted[index];',
              '  const last = result[result.length - 1];',
              '  if (start <= last[1]) {',
              '    last[1] = Math.max(last[1], end);',
              '  } else {',
              '    result.push([start, end]);',
              '  }',
              '}',
              'return result;'
            ],
            hints: ['Сначала отсортируй интервалы по началу.', 'После сортировки объединять их намного проще.'],
            explanation: 'Это классическая задача на интервалы и аккуратную работу с границами.',
            tests: [
              { args: [intervals], expected: merged },
              { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] }
            ],
            tags: ['intervals', 'merge']
          });
        },
        () => {
          const text = sampleText(rng, rng.int(8, 12));
          const expected = (() => {
            const seen = new Map();
            let left = 0;
            let best = 0;
            for (let right = 0; right < text.length; right += 1) {
              const char = text[right];
              if (seen.has(char) && seen.get(char) >= left) {
                left = seen.get(char) + 1;
              }
              seen.set(char, right);
              best = Math.max(best, right - left + 1);
            }
            return best;
          })();
          return create({
            title: 'Длина уникальной подстроки',
            prompt: `Дана строка text = ${JSON.stringify(text)}. Верни длину самой длинной подстроки без повторяющихся символов.`,
            signature: 'solve(text)',
            starterBody: ['return text.length;'],
            solutionBody: [
              'const seen = new Map();',
              'let left = 0;',
              'let best = 0;',
              'for (let right = 0; right < text.length; right += 1) {',
              '  const char = text[right];',
              '  if (seen.has(char) && seen.get(char) >= left) {',
              '    left = seen.get(char) + 1;',
              '  }',
              '  seen.set(char, right);',
              '  best = Math.max(best, right - left + 1);',
              '}',
              'return best;'
            ],
            hints: ['Скользящее окно помогает держать подстроку без повторов.', 'Храни последний индекс каждого символа.'],
            explanation: 'Это отличный пример техники sliding window в строках.',
            tests: [
              { args: [text], expected },
              { args: ['abcabcbb'], expected: 3 },
              { args: ['bbbbb'], expected: 1 }
            ],
            tags: ['window', 'string']
          });
        }
      ])();
    }
    case 'hard': {
      return pickVariant(rng, [
        () => {
          const values = sampleNumbers(rng, rng.int(8, 12), -10, 15, true);
          const expected = values.reduce((bestValue, current, index) => {
            if (index === 0) {
              return { current, best: current };
            }
            const nextCurrent = Math.max(current, bestValue.current + current);
            return {
              current: nextCurrent,
              best: Math.max(bestValue.best, nextCurrent)
            };
          }, { current: values[0], best: values[0] }).best;
          return create({
            title: 'Максимальная сумма подмассива',
            prompt: `Дан массив values = ${preview(values)}. Верни максимальную сумму непрерывного подмассива.`,
            signature: 'solve(values)',
            starterBody: ['return values[0];'],
            solutionBody: [
              'let best = values[0];',
              'let current = values[0];',
              'for (let index = 1; index < values.length; index += 1) {',
              '  current = Math.max(values[index], current + values[index]);',
              '  best = Math.max(best, current);',
              '}',
              'return best;'
            ],
            hints: ['Идти нужно слева направо.', 'На каждом шаге держи текущий и глобальный максимум.'],
            explanation: 'Классический алгоритм Кадане отлично тренирует динамическое обновление состояния.',
            tests: [
              { args: [values], expected },
              { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 }
            ],
            tags: ['kadane', 'subarray']
          });
        },
        () => {
          const values = sampleNumbers(rng, rng.int(8, 12), 1, 6);
          const k = rng.int(2, 3);
          const counts = {};
          for (const value of values) {
            counts[value] = (counts[value] || 0) + 1;
          }
          const expected = Object.entries(counts)
            .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
            .slice(0, k)
            .map(([value]) => Number(value));
          return create({
            title: 'Топ-K частых элементов',
            prompt: `Дан массив values = ${preview(values)} и k = ${k}. Верни ${k} самых частых значений по убыванию частоты.`,
            signature: 'solve(values, k)',
            starterBody: ['return values.slice(0, k);'],
            solutionBody: [
              'const counts = new Map();',
              'for (const value of values) {',
              '  counts.set(value, (counts.get(value) || 0) + 1);',
              '}',
              'return Array.from(counts.entries())',
              '  .sort((a, b) => b[1] - a[1] || a[0] - b[0])',
              '  .slice(0, k)',
              '  .map(([value]) => value);'
            ],
            hints: ['Сначала посчитай частоты.', 'Потом отсортируй их по убыванию частоты.'],
            explanation: 'Частоты + сортировка - типичный паттерн для практики на хэш-таблицах.',
            tests: [
              { args: [values, k], expected },
              { args: [[1, 1, 2, 2, 2, 3, 3], 2], expected: [2, 1] }
            ],
            tags: ['frequency', 'sort']
          });
        },
        () => {
          const values = sampleNumbers(rng, rng.int(8, 12), 1, 5);
          const target = rng.int(3, 9);
          const expected = (() => {
            const counts = new Map([[0, 1]]);
            let running = 0;
            let total = 0;
            for (const value of values) {
              running += value;
              total += counts.get(running - target) || 0;
              counts.set(running, (counts.get(running) || 0) + 1);
            }
            return total;
          })();
          return create({
            title: 'Подмассивы с заданной суммой',
            prompt: `Дан массив values = ${preview(values)} и target = ${target}. Верни количество подмассивов, сумма которых равна target.`,
            signature: 'solve(values, target)',
            starterBody: ['return 0;'],
            solutionBody: [
              'const counts = new Map([[0, 1]]);',
              'let running = 0;',
              'let total = 0;',
              'for (const value of values) {',
              '  running += value;',
              '  total += counts.get(running - target) || 0;',
              '  counts.set(running, (counts.get(running) || 0) + 1);',
              '}',
              'return total;'
            ],
            hints: ['Используй префиксные суммы и частоты.', 'Это быстрее, чем перебор всех подмассивов.'],
            explanation: 'Эта задача очень полезна для тренировки сложных хэш-паттернов.',
            tests: [
              { args: [values, target], expected },
              { args: [[1, 1, 1], 2], expected: 2 }
            ],
            tags: ['prefix', 'hash']
          });
        }
      ])();
    }
    case 'expert': {
      return pickVariant(rng, [
        () => {
          const values = sampleNumbers(rng, rng.int(8, 12), 1, 20);
          const window = rng.int(2, Math.min(4, values.length - 1));
          const expected = [];
          for (let index = 0; index <= values.length - window; index += 1) {
            expected.push(Math.max(...values.slice(index, index + window)));
          }
          return create({
            title: 'Максимум в окне',
            prompt: `Дан массив values = ${preview(values)} и окно window = ${window}. Верни массив максимумов каждого окна.`,
            signature: 'solve(values, window)',
            starterBody: ['return values;'],
            solutionBody: [
              'const result = [];',
              'for (let index = 0; index <= values.length - window; index += 1) {',
              '  result.push(Math.max(...values.slice(index, index + window)));',
              '}',
              'return result;'
            ],
            hints: ['Сначала можно решить через `slice` и `Math.max`.', 'Потом уже подумать об оптимизации через deque.'],
            explanation: 'Это хороший мостик к более продвинутым задачам на sliding window.',
            tests: [
              { args: [values, window], expected },
              { args: [[1, 3, 2, 5, 4], 3], expected: [3, 5, 5] }
            ],
            tags: ['window', 'max']
          });
        },
        () => {
          const nodes = ['A', 'B', 'C', 'D', 'E'];
          const edges = [['A', 'C'], ['B', 'C'], ['C', 'D'], ['D', 'E']];
          const expected = ['A', 'B', 'C', 'D', 'E'];
          return create({
            title: 'Топологическая сортировка',
            prompt: `Даны узлы nodes = ${preview(nodes)} и рёбра edges = ${preview(edges)}. Верни один допустимый порядок обхода.`,
            signature: 'solve(nodes, edges)',
            starterBody: ['return nodes;'],
            solutionBody: [
              'const graph = new Map(nodes.map((node) => [node, []]));',
              'const indegree = new Map(nodes.map((node) => [node, 0]));',
              'for (const [from, to] of edges) {',
              '  graph.get(from).push(to);',
              '  indegree.set(to, (indegree.get(to) || 0) + 1);',
              '}',
              'const queue = nodes.filter((node) => indegree.get(node) === 0);',
              'const order = [];',
              'while (queue.length > 0) {',
              '  const node = queue.shift();',
              '  order.push(node);',
              '  for (const next of graph.get(node) || []) {',
              '    indegree.set(next, indegree.get(next) - 1);',
              '    if (indegree.get(next) === 0) {',
              '      queue.push(next);',
              '    }',
              '  }',
              '}',
              'return order;'
            ],
            hints: ['Сначала посчитай входящие рёбра.', 'Потом регулярно вынимай вершины с нулевой входящей степенью.'],
            explanation: 'Это уже графовый алгоритм на очереди и зависимостях.',
            tests: [
              { args: [nodes, edges], expected },
              { args: [['shop', 'cook', 'eat'], [['shop', 'cook'], ['cook', 'eat']]], expected: ['shop', 'cook', 'eat'] }
            ],
            tags: ['graph', 'topology']
          });
        },
        () => {
          const graph = {
            A: ['B', 'C'],
            B: ['D'],
            C: ['D', 'E'],
            D: ['F'],
            E: ['F'],
            F: []
          };
          const expected = 3;
          return create({
            title: 'Кратчайший путь',
            prompt: 'Дан ориентированный граф graph. Верни длину кратчайшего пути от A до F.',
            signature: 'solve(graph, start, end)',
            starterBody: ['return 0;'],
            solutionBody: [
              'const queue = [[start, 0]];',
              'const visited = new Set([start]);',
              'while (queue.length > 0) {',
              '  const [node, distance] = queue.shift();',
              '  if (node === end) {',
              '    return distance;',
              '  }',
              '  for (const next of graph[node] || []) {',
              '    if (!visited.has(next)) {',
              '      visited.add(next);',
              '      queue.push([next, distance + 1]);',
              '    }',
              '  }',
              '}',
              'return -1;'
            ],
            hints: ['Для не взвешенного графа лучше всего подходит BFS.', 'Храни в очереди и вершину, и текущую дистанцию.'],
            explanation: 'Такой поиск часто нужен в реальных задачах на путь между сущностями.',
            tests: [
              { args: [graph, 'A', 'F'], expected },
              { args: [{ A: ['B'], B: ['C'], C: [] }, 'A', 'C'], expected: 2 }
            ],
            tags: ['graph', 'bfs']
          });
        }
      ])();
    }
    default:
      return buildAlgorithmsTask('easy', rng);
  }
}

module.exports = {
  buildAlgorithmsTask
};
