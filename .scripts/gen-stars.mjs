// Генератор box-shadow — шрифт 4×5, вплотную, без blur
const COL_STEP = 6;
const ROW_STEP = 6;
const LETTER_GAP = 6; // межбуквенный промежуток

const X_START = 18;
const Y_START = 240;

const LETTERS = {
  'B': [
    [1,1,1,1],
    [1,0,0,1],
    [1,1,1,1],
    [1,0,0,1],
    [1,1,1,1],
  ],
  'o': [
    [0,1,1,0],
    [1,0,0,1],
    [1,0,0,1],
    [1,0,0,1],
    [0,1,1,0],
  ],
  'k': [
    [1,0,0,1],
    [1,0,1,0],
    [1,1,0,0],
    [1,0,1,0],
    [1,0,0,1],
  ],
  's': [
    [0,1,1,1],
    [1,0,0,0],
    [0,1,1,0],
    [0,0,0,1],
    [1,1,1,0],
  ],
  't': [
    [1,1,1,1],
    [0,0,1,0],
    [0,0,1,0],
    [0,0,1,0],
    [0,0,1,0],
  ],
  'r': [
    [1,1,1,0],
    [1,0,0,1],
    [1,0,0,0],
    [1,0,0,0],
    [1,0,0,0],
  ],
  'a': [
    [0,1,1,0],
    [1,0,0,1],
    [1,1,1,1],
    [1,0,0,1],
    [1,0,0,1],
  ],
};

const word = ['B','o','o','k','s','t','r','a','t','a'];
const COLS = 4;
const points = [];
let maxX = 0;

word.forEach((letter, letterIdx) => {
  const pattern = LETTERS[letter];
  if (!pattern) return;
  const offsetX = X_START + letterIdx * (COLS * COL_STEP + LETTER_GAP);
  pattern.forEach((row, rowIdx) => {
    row.forEach((col, colIdx) => {
      if (col) {
        const x = offsetX + colIdx * COL_STEP;
        const y = Y_START + rowIdx * ROW_STEP;
        points.push({ x, y });
        if (x > maxX) maxX = x;
      }
    });
  });
});

const totalWidth = maxX + 6 - X_START;
console.log(`Всего точек: ${points.length}`);
console.log(`X: ${X_START} → ${maxX + 6} (ширина ${totalWidth})`);

const half = Math.ceil(points.length / 2);
const before = points.slice(0, half);
const after = points.slice(half);

function fmt(arr) {
  return arr.map(p => `${p.x}px ${p.y}px`).join(',\n    ');
}

console.log('\n=== ::before (' + before.length + ' точек) ===');
console.log(fmt(before));
console.log('\n=== ::after (' + after.length + ' точек) ===');
console.log(fmt(after));
