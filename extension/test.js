// node extension/test.js  — 엔진이 힌트만 따라가서 퍼즐을 끝까지 푸는지, 힌트가 정답과 어긋나지 않는지 확인
const { Board, nextHint, solve } = require('./engine.js');
const crypto = require('crypto');

function parse(task, W, H) {
  const flat = [];
  for (const ch of task) {
    if (/\d/.test(ch)) flat.push(+ch);
    else for (let i = 0; i < ch.charCodeAt(0) - 96; i++) flat.push(-1);
  }
  const clues = [];
  for (let r = 0; r < H; r++) clues.push(flat.slice(r * W, r * W + W));
  return clues;
}

const cases = [
  ['a23a2b3e32c03g3c22a2d3c3a22c1e3a223d3133b1a2f32b31b3a2d3c3', 10, 10, 'cc42b7a18c723c9614372ab65e467a5b'],
];
for (const extra of process.argv.slice(2)) { const [t, w, h, m] = extra.split(':'); cases.push([t, +w, +h, m || null]); }

for (const [task, W, H, md5] of cases) {
  const b = new Board(W, H, parse(task, W, H));
  const t0 = Date.now();
  const sol = solve(b);
  console.log(`${W}x${H} solve ${sol ? 'ok' : 'FAIL'} ${Date.now() - t0}ms`);
  if (md5 && sol) {
    let s = '';
    for (let r = 0; r <= H; r++) for (let c = 0; c < W; c++) s += sol[b.h(r, c)] === 1 ? 'y' : 'n';
    for (let r = 0; r < H; r++) for (let c = 0; c <= W; c++) s += sol[b.v(r, c)] === 1 ? 'y' : 'n';
    console.log('  hash', crypto.createHash('md5').update(task + s).digest('hex') === md5 ? 'match' : 'MISMATCH');
  }
  const st = new Array(b.N).fill(-1);
  const used = {};
  let steps = 0;
  while (st.includes(-1)) {
    const h = nextHint(b, st);
    if (!h) { console.log('  stuck'); break; }
    for (const [e, v] of h.edges) {
      if (sol && sol[e] !== v) { console.log('  WRONG hint', h.id, e, v); process.exit(1); }
      st[e] = v;
    }
    used[h.id] = (used[h.id] || 0) + 1; steps++;
  }
  console.log(`  ${steps} hints`, JSON.stringify(used));
}
// 힌트 한 번 계산 시간 (최악)
if (process.env.TIMING) {
  const [task, W, H] = cases[cases.length - 1];
  const b = new Board(W, H, parse(task, W, H));
  const st = new Array(b.N).fill(-1);
  let worst = 0;
  while (st.includes(-1)) { const t = Date.now(); const h = nextHint(b, st); worst = Math.max(worst, Date.now() - t); if (!h) break; for (const [e, v] of h.edges) st[e] = v; }
  console.log('  worst hint ms', worst);
}
