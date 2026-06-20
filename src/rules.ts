// 48 candidate rules over (x0,x1,x2) where xi ∈ {0..9}

export interface Rule {
  id: string;
  call: (x: [number, number, number]) => boolean;
  naturalLanguage: () => string;
}

const rules: Rule[] = [];

// EQ rules
for (let i = 0; i < 3; i++) {
  for (const v of [0, 2, 4, 6]) {
    const idx = i;
    const val = v;
    rules.push({
      id: `EQ_x${i}_${v}`,
      call: (x: [number, number, number]) => x[idx] === val,
      naturalLanguage: () => `x${idx + 1} equals ${val}`,
    });
  }
}

// EVEN rules
for (let i = 0; i < 3; i++) {
  const idx = i;
  rules.push({
    id: `EVEN_x${i}`,
    call: (x: [number, number, number]) => x[idx] % 2 === 0,
    naturalLanguage: () => `x${idx + 1} is even`,
  });
}

// ODD rules
for (let i = 0; i < 3; i++) {
  const idx = i;
  rules.push({
    id: `ODD_x${i}`,
    call: (x: [number, number, number]) => x[idx] % 2 === 1,
    naturalLanguage: () => `x${idx + 1} is odd`,
  });
}

// GT rules
for (let i = 0; i < 3; i++) {
  for (const v of [2, 4, 6, 8]) {
    const idx = i;
    const val = v;
    rules.push({
      id: `GT_x${i}_${v}`,
      call: (x: [number, number, number]) => x[idx] > val,
      naturalLanguage: () => `x${idx + 1} is greater than ${val}`,
    });
  }
}

// LT rules
for (let i = 0; i < 3; i++) {
  for (const v of [2, 4, 6, 8]) {
    const idx = i;
    const val = v;
    rules.push({
      id: `LT_x${i}_${v}`,
      call: (x: [number, number, number]) => x[idx] < val,
      naturalLanguage: () => `x${idx + 1} is less than ${val}`,
    });
  }
}

// ORDER rules
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i !== j) {
      const idx_i = i;
      const idx_j = j;
      rules.push({
        id: `ORDER_x${i}_x${j}`,
        call: (x: [number, number, number]) => x[idx_i] < x[idx_j],
        naturalLanguage: () => `x${idx_i + 1} is less than x${idx_j + 1}`,
      });
    }
  }
}

export const RULE_SPACE: Rule[] = rules;
export const RULE_BY_ID: Map<string, Rule> = new Map(rules.map(r => [r.id, r]));
export const DISTINCT_RULES: string[] = rules.map(r => r.id);

export const INPUT_SPACE: [number, number, number][] = [];
for (let x1 = 0; x1 <= 9; x1++) {
  for (let x2 = 0; x2 <= 9; x2++) {
    for (let x3 = 0; x3 <= 9; x3++) {
      INPUT_SPACE.push([x1, x2, x3]);
    }
  }
}
