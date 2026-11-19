// 슬리더링크 힌트 엔진. 브라우저(전역 LoopEngine)와 node(require) 양쪽에서 쓴다.
// 변 상태: -1 모름, 1 선, 0 x
(function (root) {
  'use strict';

  function Board(W, H, clues) {
    // clues[r][c]: 숫자 또는 -1
    this.W = W; this.H = H; this.clues = clues;
    const E = this.E = [];
    this.hIdx = []; this.vIdx = [];
    for (let r = 0; r <= H; r++) { this.hIdx.push([]); for (let c = 0; c < W; c++) { this.hIdx[r].push(E.length); E.push({ t: 'h', r, c }); } }
    for (let r = 0; r < H; r++) { this.vIdx.push([]); for (let c = 0; c <= W; c++) { this.vIdx[r].push(E.length); E.push({ t: 'v', r, c }); } }
    this.N = E.length;
    for (const e of E) e.ends = e.t === 'h' ? [[e.r, e.c], [e.r, e.c + 1]] : [[e.r, e.c], [e.r + 1, e.c]];
  }
  Board.prototype.h = function (r, c) { return r >= 0 && r <= this.H && c >= 0 && c < this.W ? this.hIdx[r][c] : -1; };
  Board.prototype.v = function (r, c) { return r >= 0 && r < this.H && c >= 0 && c <= this.W ? this.vIdx[r][c] : -1; };
  Board.prototype.clue = function (r, c) { return r >= 0 && r < this.H && c >= 0 && c < this.W ? this.clues[r][c] : -1; };
  Board.prototype.cellEdges = function (r, c) { return [this.h(r, c), this.h(r + 1, c), this.v(r, c), this.v(r, c + 1)]; };
  Board.prototype.vertEdges = function (r, c) {
    return [this.h(r, c - 1), this.h(r, c), this.v(r - 1, c), this.v(r, c)].filter(e => e >= 0);
  };
  // 칸 (r,c)의 꼭짓점 (vr,vc)에서: 칸 안쪽 두 변, 바깥 변들, 반대편 두 변, 반대 꼭짓점
  Board.prototype.corner = function (r, c, dr, dc) {
    const vr = r + dr, vc = c + dc;
    const inner = [this.h(vr, c), this.v(r, vc)];
    const outer = this.vertEdges(vr, vc).filter(e => !inner.includes(e));
    const opp = [this.h(r + 1 - dr, c), this.v(r, c + 1 - dc)];
    return { vr, vc, inner, outer, opp, ovr: r + 1 - dr, ovc: c + 1 - dc };
  };

  // ---------------------------------------------------------------- 규칙
  // 각 규칙은 (b, st) => 힌트 또는 null. 힌트 = { id, name, text, cells, verts, edges:[[e,val]] }
  // edges에는 지금 모르는 변만 넣는다.

  function hint(st, id, name, text, set, extra) {
    const edges = [];
    for (const [e, v] of set) if (e >= 0 && st[e] === -1 && !edges.some(x => x[0] === e)) edges.push([e, v]);
    if (!edges.length) return null;
    return Object.assign({ id, name, text, cells: [], verts: [], edges }, extra || {});
  }

  const cellName = (r, c) => `(${r + 1},${c + 1})`;

  function ruleZero(b, st, acc) {
    for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) if (b.clue(r, c) === 0) {
      const h = hint(st, 'zero', '0', `${cellName(r, c)}의 0 둘레에는 선이 없다.`, b.cellEdges(r, c).map(e => [e, 0]), { cells: [[r, c]] });
      if (h) { if (acc) acc.push(h); else return h; }
    }
    return null;
  }

  function ruleBoardCorner(b, st, acc) {
    const W = b.W, H = b.H;
    if (W < 2 || H < 2) return null;
    const cs = [
      [0, 0, [b.h(0, 0), b.v(0, 0)], [b.h(0, 1), b.v(1, 0)]],
      [0, W - 1, [b.h(0, W - 1), b.v(0, W)], [b.h(0, W - 2), b.v(1, W)]],
      [H - 1, 0, [b.h(H, 0), b.v(H - 1, 0)], [b.h(H, 1), b.v(H - 2, 0)]],
      [H - 1, W - 1, [b.h(H, W - 1), b.v(H - 1, W)], [b.h(H, W - 2), b.v(H - 2, W)]],
    ];
    for (const [r, c, outer, two] of cs) {
      const n = b.clue(r, c); let h = null;
      if (n === 3) h = hint(st, 'corner-3', '모서리의 3', `판 모서리의 3: 바깥쪽 두 변이 선.`, outer.map(e => [e, 1]));
      if (n === 1) h = hint(st, 'corner-1', '모서리의 1', `판 모서리의 1: 바깥쪽 두 변은 x.`, outer.map(e => [e, 0]));
      if (n === 2) h = hint(st, 'corner-2', '모서리의 2', `판 모서리의 2: 한 칸씩 떨어진 가장자리 두 변이 선.`, two.map(e => [e, 1]));
      if (h) { h.cells = [[r, c]]; if (acc) acc.push(h); else return h; }
    }
    return null;
  }

  function rule33(b, st, acc) {
    for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) {
      if (b.clue(r, c) !== 3) continue;
      if (b.clue(r, c + 1) === 3) {
        const h = hint(st, 'adj-33', '가로로 붙은 3-3', `${cellName(r, c)}와 ${cellName(r, c + 1)}의 3-3: 평행한 세 변이 선, 가운데 선의 위아래 연장선은 x.`,
          [[b.v(r, c), 1], [b.v(r, c + 1), 1], [b.v(r, c + 2), 1], [b.v(r - 1, c + 1), 0], [b.v(r + 1, c + 1), 0]], { cells: [[r, c], [r, c + 1]] });
        if (h) { if (acc) acc.push(h); else return h; }
      }
      if (b.clue(r + 1, c) === 3) {
        const h = hint(st, 'adj-33', '세로로 붙은 3-3', `${cellName(r, c)}와 ${cellName(r + 1, c)}의 3-3: 평행한 세 변이 선, 가운데 선의 양옆 연장선은 x.`,
          [[b.h(r, c), 1], [b.h(r + 1, c), 1], [b.h(r + 2, c), 1], [b.h(r + 1, c - 1), 0], [b.h(r + 1, c + 1), 0]], { cells: [[r, c], [r + 1, c]] });
        if (h) { if (acc) acc.push(h); else return h; }
      }
      for (const dc of [1, -1]) {
        let k = 1;
        while (b.clue(r + k, c + dc * k) === 2) k++;
        if (b.clue(r + k, c + dc * k) !== 3) continue;
        const r2 = r + k, c2 = c + dc * k;
        const set = dc === 1
          ? [[b.h(r, c), 1], [b.v(r, c), 1], [b.h(r2 + 1, c2), 1], [b.v(r2, c2 + 1), 1]]
          : [[b.h(r, c), 1], [b.v(r, c + 1), 1], [b.h(r2 + 1, c2), 1], [b.v(r2, c2), 1]];
        const cells = []; for (let i = 0; i <= k; i++) cells.push([r + i, c + dc * i]);
        const name = k === 1 ? '대각선 3-3' : '대각선 3-2-3';
        const h = hint(st, k === 1 ? 'diag-33' : 'diag-323', name,
          `${cellName(r, c)}와 ${cellName(r2, c2)}의 ${name}: 서로 먼 쪽 모서리의 두 변씩이 선.`, set, { cells });
        if (h) { if (acc) acc.push(h); else return h; }
      }
    }
    return null;
  }

  function ruleCount(b, st) {
    for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) {
      const n = b.clue(r, c); if (n < 0) continue;
      const es = b.cellEdges(r, c);
      const on = es.filter(e => st[e] === 1).length, un = es.filter(e => st[e] === -1);
      if (!un.length) continue;
      if (on === n) return hint(st, 'count', '남은 변 세기', `${cellName(r, c)}의 ${n}은 선이 이미 ${n}개. 나머지는 x.`, un.map(e => [e, 0]), { cells: [[r, c]] });
      if (on + un.length === n) return hint(st, 'count', '남은 변 세기', `${cellName(r, c)}의 ${n}은 남은 변이 딱 ${un.length}개라 전부 선.`, un.map(e => [e, 1]), { cells: [[r, c]] });
    }
    return null;
  }

  function ruleVertex(b, st) {
    for (let r = 0; r <= b.H; r++) for (let c = 0; c <= b.W; c++) {
      const es = b.vertEdges(r, c);
      const on = es.filter(e => st[e] === 1).length, un = es.filter(e => st[e] === -1);
      if (!un.length) continue;
      let h = null;
      if (on === 2) h = hint(st, 'vertex', '점 규칙', '이 점에는 선이 이미 2개. 나머지는 x.', un.map(e => [e, 0]));
      else if (on === 1 && un.length === 1) h = hint(st, 'vertex', '점 규칙', '선이 들어왔는데 나갈 곳이 하나뿐.', [[un[0], 1]]);
      else if (on === 0 && un.length === 1) h = hint(st, 'vertex', '점 규칙', '이 점에서 쓸 수 있는 변이 하나뿐이라 선이 지나갈 수 없다.', [[un[0], 0]]);
      if (h) { h.verts = [[r, c]]; return h; }
    }
    return null;
  }

  function ruleCorner(b, st, acc) {
    for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) {
      const n = b.clue(r, c); if (n < 1 || n > 3) continue;
      for (const dr of [0, 1]) for (const dc of [0, 1]) {
        const k = b.corner(r, c, dr, dc);
        const oon = k.outer.filter(e => st[e] === 1).length;
        const ooff = k.outer.filter(e => st[e] === 0).length;
        const allOff = ooff === k.outer.length;
        let h = null;
        if (allOff && n === 3) h = hint(st, 'c3-blocked', '3: 바깥이 막힌 꼭짓점', `${cellName(r, c)}의 3: 이 꼭짓점에서 밖으로 나갈 길이 없으니 두 변 모두 선.`, k.inner.map(e => [e, 1]));
        if (allOff && n === 1) h = hint(st, 'c1-blocked', '1: 바깥이 막힌 꼭짓점', `${cellName(r, c)}의 1: 이 꼭짓점에서 밖으로 나갈 길이 없으니 두 변 모두 x.`, k.inner.map(e => [e, 0]));
        if (!h && oon === 1 && n === 3)
          h = hint(st, 'c3-enter', '3: 선이 들어오는 꼭짓점', `${cellName(r, c)}의 3: 꼭짓점으로 선이 들어온다. 반대편 두 변이 선이고, 옆으로 새는 길은 x.`,
            k.opp.map(e => [e, 1]).concat(k.outer.filter(e => st[e] !== 1).map(e => [e, 0])));
        if (!h && oon === 1 && ooff === k.outer.length - 1) {
          if (n === 1) h = hint(st, 'c1-enter', '1: 선이 들어오는 꼭짓점', `${cellName(r, c)}의 1: 들어온 선이 1의 변을 써야 하므로 반대편 두 변은 x.`, k.opp.map(e => [e, 0]));
          if (n === 2) {
            const o2 = b.vertEdges(k.ovr, k.ovc).filter(e => !k.opp.includes(e));
            const on2 = o2.filter(e => st[e] === 1).length, off2 = o2.filter(e => st[e] === 0).length;
            const un2 = o2.filter(e => st[e] === -1);
            if (un2.length && on2 === 0 && off2 === o2.length - 1)
              h = hint(st, 'c2-pass', '2: 대각선으로 전달', `${cellName(r, c)}의 2: 반대편 꼭짓점에서 선이 밖으로 나가야 한다.`, [[un2[0], 1]]);
            else if (un2.length && on2 === 1)
              h = hint(st, 'c2-pass', '2: 대각선으로 전달', `${cellName(r, c)}의 2: 반대편 꼭짓점에서 선은 이미 밖으로 나가 있으니, 바깥 다른 변은 x.`, un2.map(e => [e, 0]));
          }
        }
        if (h) { h.cells = [[r, c]]; h.verts = [[k.vr, k.vc]]; if (acc) acc.push(h); else return h; }
      }
    }
    return null;
  }

  // 선 조각들: 각 점 -> 조각 id, 끝점
  function segments(b, st) {
    const adj = new Map(); const key = (p) => p[0] * 1000 + p[1];
    let total = 0;
    for (let i = 0; i < b.N; i++) if (st[i] === 1) {
      total++;
      const [a, c] = b.E[i].ends.map(key);
      if (!adj.has(a)) adj.set(a, []); if (!adj.has(c)) adj.set(c, []);
      adj.get(a).push(c); adj.get(c).push(a);
    }
    const comp = new Map(); const size = new Map();
    for (const s of adj.keys()) {
      if (comp.has(s)) continue;
      const stack = [s]; comp.set(s, s); let n = 0;
      while (stack.length) { const x = stack.pop(); n += adj.get(x).length; for (const y of adj.get(x)) if (!comp.has(y)) { comp.set(y, s); stack.push(y); } }
      size.set(s, n / 2);
    }
    return { adj, comp, size, total, key };
  }

  function ruleLoop(b, st, acc) {
    const g = segments(b, st);
    for (let i = 0; i < b.N; i++) {
      if (st[i] !== -1) continue;
      const [a, c] = b.E[i].ends.map(g.key);
      if (!g.comp.has(a) || !g.comp.has(c) || g.comp.get(a) !== g.comp.get(c)) continue;
      if (g.adj.get(a).length !== 1 || g.adj.get(c).length !== 1) continue;
      if (g.size.get(g.comp.get(a)) >= g.total) continue;
      {
        const h = hint(st, 'small-loop', '작은 고리 금지', '이 변을 이으면 고리가 일찍 닫힌다. 다른 곳에 선이 남아 있으니 x.', [[i, 0]], { verts: [b.E[i].ends[0], b.E[i].ends[1]] });
        if (h) { if (acc) acc.push(h); else return h; }
      }
    }
    return null;
  }

  function ruleParity(b, st) {
    const lines = [];
    for (let r = 0; r < b.H; r++) lines.push({ es: b.vIdx[r], cells: Array.from({ length: b.W }, (_, c) => [r, c]), what: `${r + 1}행` });
    for (let c = 0; c < b.W; c++) lines.push({ es: b.hIdx.map(row => row[c]), cells: Array.from({ length: b.H }, (_, r) => [r, c]), what: `${c + 1}열` });
    for (const L of lines) {
      const un = L.es.filter(e => st[e] === -1);
      if (un.length !== 1) continue;
      const on = L.es.filter(e => st[e] === 1).length;
      return hint(st, 'parity', '경계 통과는 짝수', `${L.what}을 가로지르는 선은 짝수 개여야 한다. 남은 한 변으로 홀짝을 맞춘다.`, [[un[0], on % 2]], { cells: L.cells });
    }
    return null;
  }

  // 기본 규칙만으로 끝까지 전파. 모순이면 false.
  function propagate(b, st, withLoop) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) {
        const n = b.clue(r, c); if (n < 0) continue;
        const es = b.cellEdges(r, c);
        let on = 0; const un = [];
        for (const e of es) { if (st[e] === 1) on++; else if (st[e] === -1) un.push(e); }
        if (on > n || on + un.length < n) return false;
        if (!un.length) continue;
        if (on === n) { for (const e of un) st[e] = 0; changed = true; }
        else if (on + un.length === n) { for (const e of un) st[e] = 1; changed = true; }
      }
      for (let r = 0; r <= b.H; r++) for (let c = 0; c <= b.W; c++) {
        const es = b.vertEdges(r, c);
        let on = 0; const un = [];
        for (const e of es) { if (st[e] === 1) on++; else if (st[e] === -1) un.push(e); }
        if (on > 2 || (on === 1 && !un.length)) return false;
        if (!un.length) continue;
        if (on === 2 || (on === 0 && un.length === 1)) { for (const e of un) st[e] = 0; changed = true; }
        else if (on === 1 && un.length === 1) { st[un[0]] = 1; changed = true; }
      }
      if (!changed) {
        for (const rule of [ruleCorner, rule33]) {
          const h = rule(b, st);
          if (h) { for (const [e, v] of h.edges) st[e] = v; changed = true; break; }
        }
      }
      if (!changed && withLoop) {
        if (closedLoopEarly(b, st)) return false;
        const h = ruleLoop(b, st);
        if (h) { for (const [e, v] of h.edges) st[e] = v; changed = true; }
      }
    }
    return withLoop ? !closedLoopEarly(b, st) : true;
  }

  function closedLoopEarly(b, st) {
    const g = segments(b, st);
    const seen = new Set();
    for (const s of g.adj.keys()) {
      const id = g.comp.get(s); if (seen.has(id)) continue; seen.add(id);
      let cyc = true;
      for (const [p, q] of g.comp) if (q === id && g.adj.get(p).length !== 2) { cyc = false; break; }
      if (cyc && g.size.get(id) < g.total) return true;
    }
    return false;
  }

  function ruleTrial(b, st) {
    for (let i = 0; i < b.N; i++) {
      if (st[i] !== -1) continue;
      for (const v of [1, 0]) {
        const s2 = st.slice(); s2[i] = v;
        if (!propagate(b, s2, true)) {
          const what = v ? '선을 그으면' : 'x를 치면';
          return hint(st, 'trial', '가정해 보기', `이 변에 ${what} 몇 수 안에 모순이 생긴다. 그러니 반대.`, [[i, 1 - v]], { verts: [b.E[i].ends[0], b.E[i].ends[1]] });
        }
      }
    }
    return null;
  }

  const RULES = [ruleZero, ruleBoardCorner, rule33, ruleCount, ruleVertex, ruleCorner, ruleLoop, ruleParity, ruleTrial];

  // 패턴 모드: 기본 규칙(세기, 점)을 뺀 이름 붙은 패턴의 모든 자리
  function allPatterns(b, st) {
    const acc = [];
    for (const rule of [ruleZero, ruleBoardCorner, rule33, ruleCorner, ruleLoop]) rule(b, st, acc);
    return acc;
  }

  function nextHint(b, st) {
    for (const rule of RULES) { const h = rule(b, st); if (h) return h; }
    return null;
  }

  // 전체 풀이 (실수 확인용). 해가 없으면 null.
  function solve(b, deadline) {
    deadline = deadline || Date.now() + 15000;
    const st = new Array(b.N).fill(-1);
    if (!propagate(b, st, true)) return null;
    // 사람 규칙으로 갈 수 있는 데까지 먼저 간다 (대부분 여기서 끝난다)
    for (;;) {
      if (Date.now() > deadline) break;
      const h = nextHint(b, st);
      if (!h) break;
      for (const [e, v] of h.edges) st[e] = v;
      if (!propagate(b, st, true)) return null;
    }
    let found = null;
    function rec(s) {
      if (found || Date.now() > deadline) return;
      let pick = -1, best = 99;
      for (let r = 0; r < b.H && best > 1; r++) for (let c = 0; c < b.W; c++) {
        if (b.clue(r, c) < 0) continue;
        const un = b.cellEdges(r, c).filter(e => s[e] === -1);
        if (un.length && un.length < best) { best = un.length; pick = un[0]; }
      }
      if (pick < 0) {
        for (let r = 0; r <= b.H && pick < 0; r++) for (let c = 0; c <= b.W; c++) {
          const es = b.vertEdges(r, c);
          if (es.some(e => s[e] === 1)) { const u = es.find(e => s[e] === -1); if (u !== undefined) { pick = u; break; } }
        }
      }
      if (pick < 0) pick = s.indexOf(-1);
      if (pick < 0) {
        const g = segments(b, s);
        const ids = new Set(g.comp.values());
        if (ids.size === 1) found = s;
        return;
      }
      for (const v of [1, 0]) {
        const s2 = s.slice(); s2[pick] = v;
        if (propagate(b, s2, true)) rec(s2);
        if (found) return;
      }
    }
    rec(st);
    return found;
  }

  const api = { Board, nextHint, allPatterns, solve, propagate, RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LoopEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
