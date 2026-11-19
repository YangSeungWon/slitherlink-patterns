// puzzle-loop.com 페이지 안(MAIN world)에서 돈다. engine.js가 먼저 로드되어 LoopEngine이 있다.
(function () {
  'use strict';
  const SITE = 'https://loop.ysw.kr/';
  const ANCHOR = {
    zero: 'zero', count: 'count', vertex: 'vertex',
    'corner-3': 'corner-3', 'corner-1': 'corner-1', 'corner-2': 'corner-2',
    'adj-33': 'adj-33', 'diag-33': 'diag-33', 'diag-323': 'diag-323',
    'c3-blocked': 'c3-blocked', 'c3-enter': 'c3-enter', 'c1-blocked': 'c1-blocked', 'c1-enter': 'c1-enter', 'c2-pass': 'c2-pass',
    'small-loop': 'small-loop', parity: 'parity', trial: 's6',
  };
  const MODES = [
    ['pattern', '패턴', '판에서 지금 쓸 수 있는 패턴 자리를 모두 번호로 표시한다.'],
    ['hint', '힌트', '가장 쉬운 다음 한 수를 찾아 어디를 볼지부터 알려 준다.'],
    ['step', '따라가기', '규칙을 한 단계씩 보여 준다. 보여 준 대로 그리면 다음 단계로 넘어간다.'],
    ['mistake', '실수', '힌트 없이, 틀린 선이나 x가 생기면 바로 표시한다.'],
    ['solve', '풀이', '한 수씩 두거나 끝까지 풀어 준다.'],
  ];
  const link = (id, text) => `<a href="${SITE}#${ANCHOR[id] || ''}" target="_blank" rel="noopener">${text}</a>`;

  let G, board, W, H, layer, panel, msg, actions, solution = null, lastKey = '';
  let mode = 'hint', current = null, revealAll = false, overlaySol = false, liveCheck = false;
  let plan = null, base = null, idx = 0;  // 따라가기: base 판에서 시작한 단계 목록

  function ready() {
    const g = window.Game;
    return g && g.dom && g.dom.cellsHorizontal && g.dom.cellsHorizontal[0] && g.dom.cellsHorizontal[0][0] &&
      g.dom.task && g.dom.task[0] && g.currentState && g.currentState.cellHorizontalStatus;
  }

  function init() {
    G = window.Game;
    H = G.dom.task.length; W = G.dom.task[0].length;
    const clues = [];
    for (let r = 0; r < H; r++) {
      clues.push([]);
      for (let c = 0; c < W; c++) {
        const t = G.dom.task[r][c].text().trim();
        clues[r].push(/^\d$/.test(t) ? +t : -1);
      }
    }
    board = new LoopEngine.Board(W, H, clues);
    layer = document.createElement('div');
    layer.className = 'lh-layer';
    G.dom.cellsHorizontal[0][0][0].parentNode.appendChild(layer);
    try { mode = localStorage.getItem('lh-mode') || 'hint'; } catch (e) {}
    if (!MODES.some(m => m[0] === mode)) mode = 'hint';
    buildPanel();
    setMode(mode);
    lastKey = readState().join(',');
    setInterval(watch, 400);
  }

  // ------------------------------------------------------------ 판 읽기, 쓰기

  function readState() {
    const cs = G.currentState, st = new Array(board.N).fill(-1);
    const conv = (v) => (v === 1 ? 1 : v === 2 ? 0 : -1);
    for (let r = 0; r <= H; r++) for (let c = 0; c < W; c++) st[board.h(r, c)] = conv(cs.cellHorizontalStatus[r][c]);
    for (let r = 0; r < H; r++) for (let c = 0; c <= W; c++) st[board.v(r, c)] = conv(cs.cellVerticalStatus[r][c]);
    return st;
  }

  // 게임 자체의 이동 처리로 넣는다: 되돌리기(Ctrl+Z)와 저장이 그대로 동작한다.
  function play(edges) {
    for (const val of [1, 0]) {
      const cells = edges.filter(([, v]) => v === val).map(([e]) => {
        const E = board.E[e];
        return { row: E.r, col: E.c, type: E.t === 'h' ? 'horizontal' : 'vertical' };
      });
      if (!cells.length) continue;
      G.initCurrentMove();
      G.currentMove.cellStatus = val === 1 ? 1 : 2;
      G.currentMove.cells = cells;
      G.applyCurrentMoveToState();
    }
    G.initCurrentMove();
    G.drawCurrentState();
    if (G.checkFinished) G.checkFinished();
  }

  function watch() {
    if (!G.currentState) return;
    // 다 풀면 사이트가 화면 일부를 다시 그린다. 떨어져 나갔으면 다시 붙인다.
    if (!panel.isConnected) document.body.appendChild(panel);
    if (!layer.isConnected && G.dom.cellsHorizontal[0][0][0].parentNode) G.dom.cellsHorizontal[0][0][0].parentNode.appendChild(layer);
    const key = readState().join(',');
    if (key === lastKey) return;
    lastKey = key;
    current = null;
    plan = null;
    refresh();
  }

  function getSolution() {
    if (!solution) solution = LoopEngine.solve(board) || 'none';
    return solution === 'none' ? null : solution;
  }

  function wrongEdges(st, sol) {
    const w = [];
    st.forEach((v, e) => { if (v !== -1 && v !== sol[e]) w.push([e, v]); });
    return w;
  }

  // ------------------------------------------------------------ 그리기

  const px = (el, k) => parseFloat(el.style[k]) || 0;

  function edgeEl(e) {
    const E = board.E[e];
    return (E.t === 'h' ? G.dom.cellsHorizontal : G.dom.cellsVertical)[E.r][E.c][0];
  }

  function vertexXY(r, c) {
    const lw = px(G.dom.cellsHorizontal[0][0][0], 'height');
    const el = G.dom.cellsHorizontal[r][Math.min(c, W - 1)][0];
    const x = c < W ? px(el, 'left') - lw / 2 : px(el, 'left') + px(el, 'width') + lw / 2;
    return [x, px(el, 'top') + lw / 2];
  }

  function box(cls, x, y, w, h, text) {
    const d = document.createElement('div');
    d.className = cls;
    Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    if (text) d.textContent = text;
    layer.appendChild(d);
    return d;
  }

  function clearMarks() { if (layer) layer.textContent = ''; }

  function markCells(cells, cls) {
    for (const [r, c] of cells) {
      const el = G.dom.task[r][c][0];
      box(cls || 'lh-cell', px(el, 'left'), px(el, 'top'), px(el, 'width'), px(el, 'height'));
    }
  }

  function markVerts(verts, cls) {
    for (const [r, c] of verts) { const [x, y] = vertexXY(r, c); box(cls || 'lh-vert', x - 9, y - 9, 18, 18); }
  }

  function markEdges(edges, cls) {
    for (const [e, v] of edges) {
      const el = edgeEl(e), E = board.E[e];
      const x = px(el, 'left'), y = px(el, 'top'), w = px(el, 'width'), h = px(el, 'height');
      if (v === 1) {
        if (E.t === 'h') box(cls + ' lh-on', x, y + h / 2 - 2, w, 4);
        else box(cls + ' lh-on', x + w / 2 - 2, y, 4, h);
      } else {
        box(cls + ' lh-x', x + w / 2 - 8, y + h / 2 - 8, 16, 16, '×');
      }
    }
  }

  function anchorXY(h) {
    if (h.cells.length) { const el = G.dom.task[h.cells[0][0]][h.cells[0][1]][0]; return [px(el, 'left'), px(el, 'top')]; }
    if (h.verts.length) return vertexXY(h.verts[0][0], h.verts[0][1]);
    const el = edgeEl(h.edges[0][0]); return [px(el, 'left'), px(el, 'top')];
  }

  // ------------------------------------------------------------ 모드별 화면

  function refresh() {
    clearMarks();
    if (overlaySol) { const sol = getSolution(); if (sol) markEdges(sol.map((v, e) => [e, v]).filter(([, v]) => v === 1), 'lh-ghost'); }
    if (mode === 'mistake') return showMistakes(true);
    if (mode === 'step') { if (liveCheck) liveWrong(); return showStep(); }
    if (liveCheck) liveWrong();
    if (mode === 'pattern') return showPatterns();
    if (mode === 'hint' || mode === 'solve') {
      if (current) drawHint(current, current.revealed);
      else say(mode === 'hint' ? '[힌트]를 누르면 다음 한 수를 찾는다.' : '[한 수]는 다음 한 수를 직접 둔다.');
    }
  }

  function showPatterns() {
    const st = readState();
    // 틀린 표시에서 나온 패턴은 엉뚱하니, 틀린 건 지운 셈 치고 찾는다.
    const sol = getSolution();
    let nWrong = 0;
    if (sol) st.forEach((v, e) => { if (v !== -1 && v !== sol[e]) { st[e] = -1; nWrong++; } });
    const used = new Map();
    const all = LoopEngine.allPatterns(board, st);
    if (!all.length) { say('지금 판에는 남은 패턴 자리가 없다. 남은 변 세기와 점 규칙으로 이어 간다.'); return; }
    const byName = new Map();
    all.forEach((h, i) => {
      markCells(h.cells, 'lh-cell lh-soft'); markVerts(h.verts, 'lh-vert lh-soft');
      if (revealAll) markEdges(h.edges, 'lh-new');
      const [x, y] = anchorXY(h);
      const k = x + ',' + y, n = used.get(k) || 0; used.set(k, n + 1);
      box('lh-tag', x - 10 + n * 15, y - 10, 14, 14, String(i + 1));
      if (!byName.has(h.id)) byName.set(h.id, { name: h.name, nums: [] });
      byName.get(h.id).nums.push(i + 1);
    });
    const rows = [...byName].map(([id, o]) => `<div>${o.nums.join(', ')} · ${link(id, o.name)}</div>`).join('');
    say(`패턴 자리 ${all.length}곳${nWrong && liveCheck ? ` <span style="color:#8b3fd1">(틀린 표시 ${nWrong}개는 빼고 봤다)</span>` : ''}${rows}`);
  }

  function showMistakes(quiet) {
    const st = readState();
    if (!st.some(v => v !== -1)) { say(quiet ? '선이나 x를 그리면 틀린 것만 바로 표시한다.' : '아직 그린 게 없다.'); return 0; }
    const sol = getSolution();
    if (!sol) { say('정답을 계산하지 못했다.'); return 0; }
    const wrong = wrongEdges(st, sol);
    markEdges(wrong, 'lh-wrong');
    if (wrong.length) say(`틀린 표시 ${wrong.length}개. 보라색으로 표시했다.`);
    else if (st.every((v, e) => (sol[e] === 1) === (v === 1))) say('다 풀었다.');
    else say('틀린 표시 없음.');
    return wrong.length;
  }

  // 다른 단계에서도 틀린 곳만 덧그린다. 메시지는 건드리지 않는다.
  function liveWrong() {
    const st = readState();
    if (!st.some(v => v !== -1)) return;
    const sol = getSolution(); if (!sol) return;
    markEdges(wrongEdges(st, sol), 'lh-wrong');
  }

  function drawHint(h, revealed) {
    markCells(h.cells); markVerts(h.verts);
    if (!h.cells.length && !h.verts.length && !revealed) markEdges(h.edges.slice(0, 1), 'lh-where');
    if (revealed) {
      markEdges(h.edges, 'lh-new');
      say(`<b>${h.name}</b><br>${h.text} ${link(h.id, '설명')}`);
    } else {
      say(`<b>${h.name}</b><br>노란 곳을 본다. ${link(h.id, '설명')}`);
    }
  }

  // ------------------------------------------------------------ 따라가기

  function startPlan() {
    const st = readState();
    plan = []; idx = 0; base = st;
    const sol = getSolution();
    if (sol) {
      const wrong = wrongEdges(st, sol);
      if (wrong.length) { plan.wrong = wrong; return; }
      if (st.every((v, e) => (sol[e] === 1) === (v === 1))) { plan.done = true; return; }
    }
  }

  // i번째 단계까지 계산해 둔다. 못 찾으면 false.
  function ensureStep(i) {
    while (plan.length <= i) {
      const sim = base.slice();
      for (const h of plan) for (const [e, v] of h.edges) sim[e] = v;
      if (!sim.includes(-1)) return false;
      const h = LoopEngine.nextHint(board, sim);
      if (!h) return false;
      plan.push(h);
    }
    return true;
  }

  function showStep() {
    if (!plan) startPlan();
    const btn = (a) => actions.querySelector(`[data-a=${a}]`);
    const setBtns = (prev, next, put) => { btn('prev').disabled = !prev; btn('next').disabled = !next; btn('put').disabled = !put; };
    if (plan.wrong) {
      markEdges(plan.wrong, 'lh-wrong');
      say(`틀린 표시가 ${plan.wrong.length}개 있다. 보라색을 고치면 이어서 간다.`);
      return setBtns(false, false, false);
    }
    if (plan.done || !ensureStep(idx)) {
      say(plan.done || (idx === 0 && !base.includes(-1)) ? '다 풀었다.' : idx === 0 ? '지금 판에서 찾을 수 있는 단계가 없다.' : '여기서 끝이다.');
      return setBtns(idx > 0, false, false);
    }
    for (let j = 0; j < idx; j++) markEdges(plan[j].edges, 'lh-done');
    const h = plan[idx];
    markCells(h.cells); markVerts(h.verts); markEdges(h.edges, 'lh-new');
    const where = idx ? `<span style="color:#d1452b">${idx}단계 뒤</span>` : '지금';
    say(`<b>${where} · ${h.name}</b><br>${h.text} ${link(h.id, '설명')}`);
    setBtns(idx > 0, true, true);
  }

  // 정답과 어긋난 게 있으면 힌트 대신 그걸 알린다.
  function findHint() {
    const st = readState();
    const sol = getSolution();
    if (sol) {
      const wrong = wrongEdges(st, sol);
      if (wrong.length) { clearMarks(); markEdges(wrong, 'lh-wrong'); say(`틀린 표시가 ${wrong.length}개 있다. 보라색을 먼저 고친다.`); return null; }
      if (st.every((v, e) => (sol[e] === 1) === (v === 1))) { say('다 풀었다.'); return null; }
    }
    const h = LoopEngine.nextHint(board, st);
    if (!h) say('지금 판에서 찾을 수 있는 힌트가 없다.');
    return h;
  }

  function busy(fn) { say('계산 중…'); setTimeout(fn, 10); }

  const ACTIONS = {
    pattern: [
      ['reveal', () => (revealAll ? '생기는 선 숨기기' : '생기는 선도 보기'), () => { revealAll = !revealAll; renderActions(); refresh(); }],
    ],
    hint: [
      ['hint', '힌트', () => busy(() => { current = findHint(); if (current) { current.revealed = false; refresh(); } })],
      ['show', '보여주기', () => { if (!current) return; current.revealed = true; refresh(); }],
      ['check', '실수 확인', () => busy(() => { current = null; refresh(); showMistakes(false); })],
    ],
    step: [
      ['prev', '◀', () => { if (idx > 0) { idx--; refresh(); } }],
      ['next', '▶', () => busy(() => { idx++; if (!ensureStep(idx)) idx--; refresh(); })],
      ['put', '여기까지 두기', () => busy(() => {
        const edges = []; for (let j = 0; j <= idx; j++) edges.push(...plan[j].edges);
        play(edges);  // 판이 바뀌면 watch가 새 판에서 다시 1단계부터 잡는다
      })],
    ],
    mistake: [],
    solve: [
      ['step', '한 수', () => busy(() => {
        const h = findHint(); if (!h) return;
        play(h.edges);
        lastKey = readState().join(',');
        current = h; h.revealed = true; refresh();
      })],
      ['all', '끝까지', () => {
        if (!confirm('정답을 판에 모두 그린다. 다 맞으면 사이트가 바로 "풀었다"로 기록하고 결과 화면으로 넘어간다. 계속할까?')) return;
        busy(() => {
          const sol = getSolution(); if (!sol) { say('정답을 계산하지 못했다.'); return; }
          const st = readState();
          const diff = [];
          sol.forEach((v, e) => { if (v === 1 ? st[e] !== 1 : st[e] === 1) diff.push([e, v]); });
          play(diff);
          lastKey = readState().join(',');
          current = null; refresh(); say('끝까지 그렸다.');
        });
      }],
      ['ghost', () => (overlaySol ? '정답 숨기기' : '정답 겹쳐 보기'), () => busy(() => { overlaySol = !overlaySol; renderActions(); refresh(); })],
    ],
  };

  function setMode(m) {
    panel.querySelector('.lh-live').style.display = m === 'mistake' ? 'none' : 'flex';
    mode = m; current = null; revealAll = false; plan = null;
    if (m !== 'solve') overlaySol = false;
    try { localStorage.setItem('lh-mode', m); } catch (e) {}
    panel.querySelectorAll('.lh-modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    panel.querySelector('.lh-desc').textContent = MODES.find(x => x[0] === m)[2];
    renderActions();
    if (m === 'pattern' || m === 'mistake' || m === 'step' || liveCheck) busy(refresh); else refresh();
  }

  function renderActions() {
    actions.textContent = '';
    for (const [id, label, fn] of ACTIONS[mode]) {
      const b = document.createElement('button');
      b.dataset.a = id;
      b.textContent = typeof label === 'function' ? label() : label;
      b.onclick = fn;
      actions.appendChild(b);
    }
    const c = document.createElement('button');
    c.textContent = '지우기';
    c.onclick = () => { current = null; overlaySol = false; revealAll = false; renderActions(); clearMarks(); say(''); };
    if (mode !== 'mistake' && mode !== 'step') actions.appendChild(c);
  }

  // ------------------------------------------------------------ 패널

  function say(html) { msg.innerHTML = html; }

  function buildPanel() {
    const css = document.createElement('style');
    css.textContent = `
.lh-layer{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:1000}
.lh-layer>div{position:absolute;pointer-events:none;box-sizing:border-box}
.lh-cell{background:rgba(255,204,0,.35);outline:2px solid #e3b000}
.lh-cell.lh-soft{background:rgba(255,204,0,.22);outline:1.5px solid #e3b000}
.lh-vert{border:2px solid #e3b000;border-radius:50%;background:rgba(255,204,0,.3)}
.lh-tag{background:#1d1d1b;color:#fff;font:600 9.5px/14px sans-serif;text-align:center;border-radius:3px;z-index:2}
.lh-on.lh-new{background:#d1452b;border-radius:2px}
.lh-x.lh-new{color:#d1452b}
.lh-on.lh-done{background:rgba(209,69,43,.38);border-radius:2px}
.lh-x.lh-done{color:rgba(209,69,43,.45)}
.lh-on.lh-where{background:#e3b000;border-radius:2px}
.lh-x.lh-where{color:#e3b000}
.lh-on.lh-wrong{background:#8b3fd1;outline:3px solid rgba(139,63,209,.35)}
.lh-x.lh-wrong{color:#8b3fd1}
.lh-on.lh-ghost{background:rgba(40,120,220,.45);border-radius:2px}
.lh-x{font:bold 18px/16px sans-serif;text-align:center}
#lh-panel{position:fixed;right:12px;bottom:12px;z-index:2147483000;width:256px;background:#fbfbf8;color:#1d1d1b;border:1px solid #cfcfc8;border-radius:6px;font:13px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#lh-panel,#lh-panel:focus,#lh-panel:focus-within{outline:none!important;border:1px solid #cfcfc8!important;box-shadow:0 1px 4px rgba(0,0,0,.08)!important}
#lh-panel .lh-head{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #e3e3dc;font-weight:600;cursor:pointer;user-select:none}
#lh-panel .lh-body{padding:8px 10px 10px}
#lh-panel.lh-min .lh-body{display:none}
#lh-panel.lh-min .lh-head{border-bottom:0}
#lh-panel button{font:inherit;padding:3px 9px;margin:0 4px 4px 0;border:1px solid #bdbdb5;border-radius:4px;background:#fff;color:inherit;cursor:pointer}
#lh-panel .lh-modes{display:flex;margin-bottom:6px}
#lh-panel .lh-modes button{flex:1 1 auto;margin:0;border-radius:0;border-left-width:0;padding:3px 0;font-size:12.5px;white-space:nowrap}
#lh-panel .lh-modes button:first-child{border-left-width:1px;border-radius:4px 0 0 4px}
#lh-panel .lh-modes button:last-child{border-radius:0 4px 4px 0}
#lh-panel .lh-modes button.on{background:#1d1d1b;color:#fff;border-color:#1d1d1b}
#lh-panel .lh-desc{color:#6b6b66;font-size:12px;margin-bottom:6px}
#lh-panel button.lh-live{display:flex;align-items:center;gap:6px;border:0;background:none;padding:2px 0;margin:0 0 4px;font-size:12.5px}
#lh-panel .lh-box{width:13px;height:13px;border:1.5px solid #8a8a83;border-radius:3px;flex:none;position:relative}
#lh-panel .lh-live[aria-pressed=true] .lh-box{background:#8b3fd1;border-color:#8b3fd1}
#lh-panel .lh-live[aria-pressed=true] .lh-box::after{content:"";position:absolute;left:3px;top:0;width:3px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
#lh-panel .lh-msg{min-height:20px;margin-top:2px;word-break:keep-all;max-height:180px;overflow:auto}
#lh-panel a{color:inherit}
`;
    document.head.appendChild(css);
    panel = document.createElement('div');
    panel.id = 'lh-panel';
    panel.innerHTML = `<div class="lh-head"><span>패턴 힌트</span><span class="lh-tog">–</span></div>
<div class="lh-body"><div class="lh-modes">${MODES.map(([m, l]) => `<button data-m="${m}">${l}</button>`).join('')}</div>
<div class="lh-desc"></div><div class="lh-actions"></div><button type="button" class="lh-live" aria-pressed="false"><span class="lh-box"></span>틀린 곳 바로 표시</button><div class="lh-msg"></div></div>`;
    document.body.appendChild(panel);
    msg = panel.querySelector('.lh-msg');
    actions = panel.querySelector('.lh-actions');
    panel.querySelectorAll('.lh-modes button').forEach(b => { b.onclick = () => setMode(b.dataset.m); });
    const live = panel.querySelector('.lh-live');
    try { liveCheck = localStorage.getItem('lh-live') === '1'; } catch (e) {}
    live.setAttribute('aria-pressed', String(liveCheck));
    live.onclick = () => { liveCheck = !liveCheck; live.setAttribute('aria-pressed', String(liveCheck)); try { localStorage.setItem('lh-live', liveCheck ? '1' : ''); } catch (e) {} busy(() => { refresh(); if (liveCheck && mode !== 'mistake') say(msg.innerHTML === '계산 중…' ? '' : msg.innerHTML); }); };
    const head = panel.querySelector('.lh-head'), tog = panel.querySelector('.lh-tog');
    const setMin = (m) => { panel.classList.toggle('lh-min', m); tog.textContent = m ? '+' : '–'; try { localStorage.setItem('lh-min', m ? '1' : ''); } catch (e) {} };
    head.onclick = () => setMin(!panel.classList.contains('lh-min'));
    try { setMin(localStorage.getItem('lh-min') === '1'); } catch (e) {}
    panel.addEventListener('keydown', (e) => e.stopPropagation());
  }

  let tries = 0;
  const t = setInterval(() => {
    if (ready()) { clearInterval(t); init(); }
    else if (++tries > 100) clearInterval(t);
  }, 200);
})();
