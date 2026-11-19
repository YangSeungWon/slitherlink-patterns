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

  let G, board, W, H, layer, panel, msg, btnShow, solution = null, current = null, lastKey = '';

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
    buildPanel();
    setInterval(watch, 400);
  }

  // ------------------------------------------------------------ 판 읽기

  function readState() {
    const cs = G.currentState, st = new Array(board.N).fill(-1);
    const conv = (v) => (v === 1 ? 1 : v === 2 ? 0 : -1);
    for (let r = 0; r <= H; r++) for (let c = 0; c < W; c++) st[board.h(r, c)] = conv(cs.cellHorizontalStatus[r][c]);
    for (let r = 0; r < H; r++) for (let c = 0; c <= W; c++) st[board.v(r, c)] = conv(cs.cellVerticalStatus[r][c]);
    return st;
  }

  function watch() {
    if (!G.currentState) return;
    const key = readState().join(',');
    if (key !== lastKey) {
      if (lastKey) { clear(); say(''); }
      lastKey = key;
    }
  }

  function getSolution() {
    if (!solution) solution = LoopEngine.solve(board) || 'none';
    return solution === 'none' ? null : solution;
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
  }

  function clear() { if (layer) layer.textContent = ''; current = null; btnShow.disabled = true; }

  function markCells(cells) {
    for (const [r, c] of cells) {
      const el = G.dom.task[r][c][0];
      box('lh-cell', px(el, 'left'), px(el, 'top'), px(el, 'width'), px(el, 'height'));
    }
  }

  function markVerts(verts) {
    for (const [r, c] of verts) { const [x, y] = vertexXY(r, c); box('lh-vert', x - 9, y - 9, 18, 18); }
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

  // ------------------------------------------------------------ 동작

  function hintClick() {
    clear();
    const st = readState();
    say('계산 중…');
    setTimeout(() => {
      const sol = getSolution();
      if (sol) {
        const wrong = st.map((v, e) => (v !== -1 && v !== sol[e] ? e : -1)).filter(e => e >= 0);
        if (wrong.length) { say(`틀린 표시가 ${wrong.length}개 있다. 먼저 [실수 확인]으로 찾아서 고친다.`); return; }
        if (st.every((v, e) => (sol[e] === 1) === (v === 1))) { say('다 풀었다.'); return; }
      }
      const h = LoopEngine.nextHint(board, st);
      if (!h) { say('지금 판에서 찾을 수 있는 힌트가 없다.'); return; }
      current = h;
      markCells(h.cells); markVerts(h.verts);
      if (!h.cells.length && !h.verts.length) markEdges(h.edges.slice(0, 1), 'lh-where');
      say(`<b>${h.name}</b><br>노란 곳을 본다. <a href="${SITE}#${ANCHOR[h.id] || ''}" target="_blank" rel="noopener">설명</a>`);
      btnShow.disabled = false;
    }, 10);
  }

  function showClick() {
    if (!current) return;
    markEdges(current.edges, 'lh-new');
    say(`<b>${current.name}</b><br>${current.text} <a href="${SITE}#${ANCHOR[current.id] || ''}" target="_blank" rel="noopener">설명</a>`);
    btnShow.disabled = true;
  }

  function checkClick() {
    clear();
    say('계산 중…');
    setTimeout(() => {
      const sol = getSolution();
      if (!sol) { say('정답을 계산하지 못했다.'); return; }
      const st = readState();
      const wrong = [];
      st.forEach((v, e) => { if (v !== -1 && v !== sol[e]) wrong.push([e, v]); });
      if (!wrong.length) { say('틀린 표시 없음.'); return; }
      markEdges(wrong, 'lh-wrong');
      say(`틀린 표시 ${wrong.length}개. 보라색으로 표시했다.`);
    }, 10);
  }

  // ------------------------------------------------------------ 패널

  function say(html) { msg.innerHTML = html; }

  function buildPanel() {
    const css = document.createElement('style');
    css.textContent = `
.lh-layer{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:1000}
.lh-layer>div{position:absolute;pointer-events:none;box-sizing:border-box}
.lh-cell{background:rgba(255,204,0,.35);outline:2px solid #e3b000}
.lh-vert{border:2px solid #e3b000;border-radius:50%;background:rgba(255,204,0,.3)}
.lh-on.lh-new{background:#d1452b;border-radius:2px}
.lh-x.lh-new{color:#d1452b}
.lh-on.lh-where{background:#e3b000;border-radius:2px}
.lh-x.lh-where{color:#e3b000}
.lh-on.lh-wrong{background:#8b3fd1;outline:3px solid rgba(139,63,209,.35)}
.lh-x.lh-wrong{color:#8b3fd1}
.lh-x{font:bold 18px/16px sans-serif;text-align:center}
#lh-panel{position:fixed;right:12px;bottom:12px;z-index:2147483000;width:220px;background:#fbfbf8;color:#1d1d1b;border:1px solid #cfcfc8;border-radius:6px;font:13px/1.5 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#lh-panel .lh-head{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #e3e3dc;font-weight:600;cursor:pointer;user-select:none}
#lh-panel .lh-body{padding:8px 10px 10px}
#lh-panel.lh-min .lh-body{display:none}
#lh-panel.lh-min .lh-head{border-bottom:0}
#lh-panel button{font:inherit;padding:3px 9px;margin:0 4px 4px 0;border:1px solid #bdbdb5;border-radius:4px;background:#fff;color:inherit;cursor:pointer}
#lh-panel button:disabled{opacity:.4;cursor:default}
#lh-panel .lh-msg{min-height:20px;margin-top:4px;word-break:keep-all}
#lh-panel a{color:inherit}
`;
    document.head.appendChild(css);
    panel = document.createElement('div');
    panel.id = 'lh-panel';
    panel.innerHTML = `<div class="lh-head"><span>패턴 힌트</span><span class="lh-tog">–</span></div>
<div class="lh-body"><button data-a="hint">힌트</button><button data-a="show" disabled>보여주기</button><button data-a="check">실수 확인</button><button data-a="clear">지우기</button>
<div class="lh-msg"></div></div>`;
    document.body.appendChild(panel);
    msg = panel.querySelector('.lh-msg');
    btnShow = panel.querySelector('[data-a=show]');
    panel.querySelector('[data-a=hint]').onclick = hintClick;
    btnShow.onclick = showClick;
    panel.querySelector('[data-a=check]').onclick = checkClick;
    panel.querySelector('[data-a=clear]').onclick = () => { clear(); say(''); };
    const head = panel.querySelector('.lh-head'), tog = panel.querySelector('.lh-tog');
    const setMin = (m) => { panel.classList.toggle('lh-min', m); tog.textContent = m ? '+' : '–'; try { localStorage.setItem('lh-min', m ? '1' : ''); } catch (e) {} };
    head.onclick = () => setMin(!panel.classList.contains('lh-min'));
    try { setMin(localStorage.getItem('lh-min') === '1'); } catch (e) {}
    // 패널 위 키 입력이 게임으로 새지 않게
    panel.addEventListener('keydown', (e) => e.stopPropagation());
  }

  let tries = 0;
  const t = setInterval(() => {
    if (ready()) { clearInterval(t); init(); }
    else if (++tries > 100) clearInterval(t);
  }, 200);
})();
