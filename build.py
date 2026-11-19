"""index.html 생성기. 패턴 그림은 인라인 SVG로 미리 그려 넣는다.

    python3 build.py
"""

S = 34      # 칸 크기
P = 16      # 여백


def H(r, c):  # 점 r행의 c열~c+1열 가로선
    return ('h', r, c)


def V(r, c):  # 점 c열의 r행~r+1행 세로선
    return ('v', r, c)


def ends(e):
    k, r, c = e
    return ((r, c), (r, c + 1)) if k == 'h' else ((r, c), (r + 1, c))


def xy(p):
    r, c = p
    return P + c * S, P + r * S


def diagram(w, h, clues=None, L=(), X=(), nL=(), nX=(), wall='', shade=None, cut=None, cap=''):
    clues = clues or {}
    shade = shade or {}
    W, Hh = w * S + 2 * P, h * S + 2 * P
    o = [f'<svg viewBox="0 0 {W} {Hh}" width="{W}" height="{Hh}" role="img">']
    for (r, c), t in shade.items():
        x, y = xy((r, c))
        if t == '안':
            o.append(f'<rect class="in" x="{x}" y="{y}" width="{S}" height="{S}"/>')
        o.append(f'<text class="lab" x="{x + S / 2}" y="{y + S / 2}">{t}</text>')
    # 판 가장자리
    off = 7
    for side in wall:
        if side == 't': a, b = (P, P - off), (P + w * S, P - off)
        if side == 'b': a, b = (P, P + h * S + off), (P + w * S, P + h * S + off)
        if side == 'l': a, b = (P - off, P), (P - off, P + h * S)
        if side == 'r': a, b = (P + w * S + off, P), (P + w * S + off, P + h * S)
        o.append(f'<line class="wall" x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}"/>')
    if cut:
        r0, c0, r1, c1 = cut
        x0, y0 = xy((r0, c0)); x1, y1 = xy((r1, c1))
        o.append(f'<rect class="cut" x="{x0 - 4}" y="{y0 - 4}" width="{x1 - x0 + 8}" height="{y1 - y0 + 8}"/>')
    for cls, es in (('l', L), ('nl', nL)):
        for e in es:
            (a, b) = ends(e)
            (x1, y1), (x2, y2) = xy(a), xy(b)
            o.append(f'<line class="{cls}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
    for cls, es in (('x', X), ('nx', nX)):
        for e in es:
            (a, b) = ends(e)
            (x1, y1), (x2, y2) = xy(a), xy(b)
            mx, my, d = (x1 + x2) / 2, (y1 + y2) / 2, 4.5
            o.append(f'<path class="{cls}" d="M{mx - d} {my - d}L{mx + d} {my + d}M{mx - d} {my + d}L{mx + d} {my - d}"/>')
    for r in range(h + 1):
        for c in range(w + 1):
            x, y = xy((r, c))
            o.append(f'<circle class="dot" cx="{x}" cy="{y}" r="2.2"/>')
    for (r, c), n in clues.items():
        x, y = xy((r, c))
        o.append(f'<text class="num" x="{x + S / 2}" y="{y + S / 2}">{n}</text>')
    o.append('</svg>')
    svg = ''.join(o)
    if cap:
        return f'<figure>{svg}<figcaption>{cap}</figcaption></figure>'
    return f'<figure>{svg}</figure>'


# ---------------------------------------------------------------- 내용

sections = []


def section(title, intro=''):
    sections.append({'title': title, 'intro': intro, 'items': []})


def item(title, text, *figs):
    sections[-1]['items'].append((title, text, figs))


section('기본 규칙', '모든 패턴은 여기 있는 세 가지에서 나온다. 익숙해지면 손이 먼저 움직인다.')

item('0', '0 둘레의 네 변에는 선이 없다. 퍼즐을 열면 0부터 지운다.',
     diagram(3, 3, {(1, 1): 0}, nX=[H(1, 1), H(2, 1), V(1, 1), V(1, 2)]))

item('남은 변 세기',
     '숫자만큼 선이 이미 있으면 나머지는 x. 남은 변이 딱 숫자만큼이면 전부 선. '
     '패턴이라기보다 매 순간 하는 확인이다.',
     diagram(3, 3, {(1, 1): 3}, X=[H(1, 1)], nL=[H(2, 1), V(1, 1), V(1, 2)], cap='3인데 한 변이 x'),
     diagram(3, 3, {(1, 1): 1}, L=[V(1, 1)], nX=[H(1, 1), H(2, 1), V(1, 2)], cap='1인데 한 변이 선'))

item('점 규칙',
     '고리는 갈라지지도 끊기지도 않으므로, 모든 점에는 선이 0개 아니면 2개 붙는다.',
     diagram(2, 2, L=[V(0, 1), H(1, 1)], nX=[H(1, 0), V(1, 1)], cap='이미 2개 → 나머지 x'),
     diagram(2, 2, L=[V(0, 1)], X=[H(1, 0), V(1, 1)], nL=[H(1, 1)], cap='들어왔는데 출구가 하나'),
     diagram(2, 2, X=[V(0, 1), H(1, 0), V(1, 1)], nX=[H(1, 1)], cap='3개가 x → 마지막도 x'))

section('판의 모서리', '판 모서리의 점에는 변이 두 개뿐이라, 둘 다 쓰거나 둘 다 안 쓴다.')

item('모서리의 3', '모서리 바깥쪽 두 변이 선.',
     diagram(3, 3, {(0, 0): 3}, nL=[H(0, 0), V(0, 0)], wall='tl'))
item('모서리의 1', '모서리 바깥쪽 두 변은 x. 둘 다 쓰면 2가 되기 때문.',
     diagram(3, 3, {(0, 0): 1}, nX=[H(0, 0), V(0, 0)], wall='tl'))
item('모서리의 2',
     '모서리 칸 자체보다 한 칸씩 떨어진 가장자리 두 변이 선이 된다. '
     '2가 모서리를 감싸든, 안쪽 두 변을 쓰든 선은 이 두 자리를 지나가야 한다.',
     diagram(3, 3, {(0, 0): 2}, nL=[H(0, 1), V(1, 0)], wall='tl'))

section('숫자 조합', '두 숫자가 붙어 있을 때 바로 정해지는 것들. 판 전체를 한 번 훑으며 찾는다.')

item('0 옆의 3',
     '0과 닿은 변은 x이므로 3의 나머지 세 변이 선. '
     '그 선은 0 쪽으로 꺾을 수 없으니 바깥으로 한 칸 더 뻗는다.',
     diagram(3, 3, {(1, 0): 0, (1, 1): 3}, X=[H(1, 0), H(2, 0), V(1, 0), V(1, 1)],
             nL=[H(1, 1), H(2, 1), V(1, 2), V(0, 1), V(2, 1)]))

item('가로로 붙은 3-3',
     '평행한 세 변이 선. 가운데 선의 위아래 연장선은 x.',
     diagram(4, 3, {(1, 1): 3, (1, 2): 3}, nL=[V(1, 1), V(1, 2), V(1, 3)], nX=[V(0, 2), V(2, 2)]))

item('대각선 3-3',
     '서로 먼 쪽 모서리의 두 변씩이 선. 가까운 쪽 꼭짓점은 공유하므로 둘 다 감쌀 수 없다.',
     diagram(4, 4, {(1, 1): 3, (2, 2): 3}, nL=[H(1, 1), V(1, 1), H(3, 2), V(2, 3)]))

item('사이에 2가 낀 대각선 3-2-3',
     '대각선 사이에 2가 몇 개 끼어 있어도 결과는 대각선 3-3과 같다.',
     diagram(5, 5, {(1, 1): 3, (2, 2): 2, (3, 3): 3}, nL=[H(1, 1), V(1, 1), H(4, 3), V(3, 4)]))

section('꼭짓점 규칙',
        '숫자 칸의 한 꼭짓점에서, 칸 바깥으로 뻗은 변들의 상태를 보고 칸 안쪽을 정한다. '
        '중반 이후 대부분의 진도는 여기서 나온다.')

item('3: 바깥이 막힌 꼭짓점',
     '꼭짓점에서 밖으로 나갈 길이 모두 x면, 그 꼭짓점의 두 변은 같이 쓰거나 같이 안 쓴다. '
     '3은 안 쓸 수 없으니 둘 다 선. 판의 모서리 패턴도 이 경우다.',
     diagram(3, 3, {(1, 1): 3}, X=[V(0, 1), H(1, 0)], nL=[H(1, 1), V(1, 1)]))

item('3: 선이 들어오는 꼭짓점',
     '꼭짓점으로 선이 들어오면 그 꼭짓점에선 3의 변을 하나만 쓴다. '
     '그러면 반대편 두 변이 선이고, 들어온 선이 옆으로 새는 길은 x.',
     diagram(3, 3, {(1, 1): 3}, L=[V(0, 1)], nL=[H(2, 1), V(1, 2)], nX=[H(1, 0)]))

item('1: 바깥이 막힌 꼭짓점',
     '같이 쓰거나 같이 안 쓰는데, 1이 두 변을 쓸 수는 없으니 둘 다 x.',
     diagram(3, 3, {(1, 1): 1}, X=[V(0, 1), H(1, 0)], nX=[H(1, 1), V(1, 1)]))

item('1: 선이 들어오는 꼭짓점',
     '들어온 선이 다른 데로 빠질 수 없으면 1의 변 중 하나를 이 꼭짓점에서 쓴다. '
     '그러면 반대편 두 변은 x.',
     diagram(3, 3, {(1, 1): 1}, L=[V(0, 1)], X=[H(1, 0)], nX=[H(2, 1), V(1, 2)]))

item('2: 대각선으로 전달',
     '2의 한 꼭짓점에서 칸의 변을 정확히 하나 쓰면, 반대편 꼭짓점에서도 정확히 하나 쓴다. '
     '그 꼭짓점에서 선은 바깥으로 이어져야 하므로, 바깥 두 변 중 하나가 x면 다른 하나가 선. '
     '2가 대각선으로 이어져 있으면 이게 줄줄이 넘어간다.',
     diagram(3, 3, {(1, 1): 2}, L=[V(0, 1)], X=[H(1, 0), H(2, 2)], nL=[V(2, 2)]))

section('고리 전체를 보는 규칙', '숫자가 없는 빈 지대나 후반 마무리에서 쓴다.')

item('작은 고리 금지',
     '선의 두 끝이 한 변 차이로 마주 보고 있고 다른 곳에 선이 더 있다면, 그 변을 이으면 '
     '고리가 일찍 닫힌다. 그 변은 x. 빈 지대에서 평행선 두 줄이 같이 내려가는 것도 이 규칙 때문이다.',
     diagram(4, 3, L=[H(1, 1), V(1, 1), V(1, 2), H(3, 3)], nX=[H(2, 1)]))

item('경계 통과는 짝수',
     '판 위에 아무 영역이나 잡으면, 고리는 그 경계를 들어갔다 나오므로 짝수 번 지난다. '
     '점선 영역을 지나는 변이 하나만 남았을 때 홀짝으로 정한다. 판 모서리 쪽에서 특히 잘 통한다.',
     diagram(4, 4, L=[H(2, 0)], X=[H(2, 1), V(0, 2)], nL=[V(1, 2)], wall='tl', cut=(0, 0, 2, 2)))

item('안과 밖 칠하기',
     '칸을 고리의 안쪽과 바깥쪽으로 나눠 본다. 이웃한 두 칸의 색이 다르면 사이에 선, '
     '같으면 x. 판 밖은 바깥이다. 3은 이웃 넷 중 셋과 색이 다르고, 1은 하나와 다르다. '
     '막혔을 때 색으로 바꿔 생각하면 안 보이던 게 보인다.',
     diagram(3, 2, shade={(0, 0): '안', (0, 1): '안', (0, 2): '밖', (1, 0): '밖', (1, 1): '안'},
             nL=[V(0, 2), H(1, 0), V(1, 1)], nX=[V(0, 1), H(1, 1)]))

section('막혔을 때')

steps = [
    '0, 판 모서리, 붙어 있는 3을 먼저 처리한다.',
    '선 끝이 있는 점을 하나씩 따라가며 점 규칙을 적용한다.',
    '3과 1의 꼭짓점을 돌아가며 꼭짓점 규칙을 본다.',
    '2가 대각선으로 이어진 곳에서 전달 규칙을 본다.',
    '빈 지대에서는 작은 고리 금지와 짝수 통과를 본다.',
    '그래도 안 되면 한 변에 선을 그었다고 가정하고 몇 수 따라가 본다. 모순이 나오면 그 변은 x. '
    '연필로 따로 표시해 두면 되돌리기 쉽다.',
]

IDS = {
    '0': 'zero', '남은 변 세기': 'count', '점 규칙': 'vertex',
    '모서리의 3': 'corner-3', '모서리의 1': 'corner-1', '모서리의 2': 'corner-2',
    '0 옆의 3': 'zero-3', '가로로 붙은 3-3': 'adj-33', '대각선 3-3': 'diag-33', '사이에 2가 낀 대각선 3-2-3': 'diag-323',
    '3: 바깥이 막힌 꼭짓점': 'c3-blocked', '3: 선이 들어오는 꼭짓점': 'c3-enter',
    '1: 바깥이 막힌 꼭짓점': 'c1-blocked', '1: 선이 들어오는 꼭짓점': 'c1-enter', '2: 대각선으로 전달': 'c2-pass',
    '작은 고리 금지': 'small-loop', '경계 통과는 짝수': 'parity', '안과 밖 칠하기': 'color',
}

EXT_BODY = """
<div class="hero"><div><h1>힌트 확장 프로그램</h1><p>puzzle-loop.com 오른쪽 아래에 붙는 도우미. 얼마나 도와줄지는 직접 고른다.</p></div>
<a class="btn" href="loop-hint.zip">loop-hint.zip 받기</a></div>

<h2>도움 단계</h2>
<div class="demo">
<input type="radio" name="m" id="m1" checked><input type="radio" name="m" id="m2"><input type="radio" name="m" id="m3"><input type="radio" name="m" id="m4">
<div class="seg"><label for="m1">패턴</label><label for="m2">힌트</label><label for="m3">실수</label><label for="m4">풀이</label></div>
<div class="pane p1"><img src="img/mode-pattern.png" width="597" height="339" alt="패턴 단계 화면"><p>쓸 수 있는 패턴 자리에 번호. 답은 안 보인다.</p></div>
<div class="pane p2"><img src="img/mode-hint.png" width="597" height="339" alt="힌트 단계 화면"><p>다음 한 수. 볼 곳 먼저, 누르면 답.</p></div>
<div class="pane p3"><img src="img/mode-mistake.png" width="597" height="339" alt="실수 단계 화면"><p>힌트 없이 틀린 것만 보라색.</p></div>
<div class="pane p4"><img src="img/mode-solve.png" width="597" height="339" alt="풀이 단계 화면"><p>한 수씩 두기, 끝까지 풀기, 정답 겹쳐 보기.</p></div>
</div>

<div class="demo">
<input type="checkbox" id="lv">
<label class="tgl" for="lv"><span></span>틀린 곳 바로 표시</label>
<div class="pane off"><img src="img/mode-live-off.png" width="597" height="339" alt="틀린 곳 표시를 끈 화면"></div>
<div class="pane on"><img src="img/mode-live-on.png" width="597" height="339" alt="틀린 곳 표시를 켠 화면: 틀린 선과 x가 보라색"></div>
<p>어느 단계에서든 켤 수 있다.</p>
</div>

<h2>설치</h2>
<div class="steps">
<div class="step"><b>1</b><p><a href="loop-hint.zip">zip</a>을 받아 지우지 않을 폴더에 푼다</p></div>
<div class="step"><b>2</b><p><code>chrome://extensions</code>에서 개발자 모드를 켠다</p></div>
<div class="step"><b>3</b><p>압축해제된 확장 프로그램을 로드 → 푼 폴더</p></div>
</div>
<div class="mock" aria-hidden="true">
<div class="bar"><span>chrome://extensions</span></div>
<div class="row"><span class="t">확장 프로그램</span><span class="dev">개발자 모드 <i></i><b>2</b></span></div>
<div class="row"><span class="load">압축해제된 확장 프로그램을 로드<b>3</b></span><span class="ghost">확장 프로그램 압축</span><span class="ghost">업데이트</span></div>
<div class="card"><img src="extension/icon.png" width="28" height="28" alt=""><span>슬리더링크 패턴 힌트</span><span class="re">↻</span></div>
</div>
<p>업데이트는 같은 폴더에 덮어쓰고 ↻. Edge, Whale도 같다. Firefox는 <code>about:debugging</code> → 임시 부가 기능 로드 → zip.</p>
"""

# ---------------------------------------------------------------- HTML

CSS = """
:root{--bg:#fbfbf8;--ink:#1d1d1b;--mute:#6b6b66;--rule:#dcdcd5;--new:#d1452b;--x:#9a9a93;--wall:#c9c9c2;--in:#e9e6dc;}
@media (prefers-color-scheme:dark){:root{--bg:#191917;--ink:#e8e6df;--mute:#9a988f;--rule:#34332f;--new:#f07a5c;--x:#77756e;--wall:#4a4944;--in:#2e2c27;}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;word-break:keep-all}
main{max-width:760px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:26px;margin:0 0 6px;letter-spacing:-.01em}
h2{font-size:19px;margin:56px 0 4px;padding-top:12px;border-top:1px solid var(--rule)}
h2 span{color:var(--mute);font-weight:400;margin-right:8px}
h3{font-size:16px;margin:28px 0 2px}
p{margin:6px 0}
.mute{color:var(--mute)}
a{color:inherit}
nav{margin:20px 0 0;font-size:15px}
nav a{margin-right:14px;white-space:nowrap}
.legend{display:flex;flex-wrap:wrap;gap:6px 20px;margin:18px 0 0;font-size:14px;color:var(--mute)}
.legend svg{display:inline-block;vertical-align:middle;margin-right:6px}
.figs{display:flex;flex-wrap:wrap;gap:8px 24px;margin:10px 0 0}
figure{margin:0}
figcaption{font-size:13px;margin-top:2px}
svg{display:block;max-width:100%;height:auto}
.dot{fill:var(--ink)}
.num{fill:var(--ink);font-size:17px;font-weight:600;text-anchor:middle;dominant-baseline:central}
.lab{fill:var(--mute);font-size:12px;text-anchor:middle;dominant-baseline:central}
.in{fill:var(--in)}
.l{stroke:var(--ink);stroke-width:3.5;stroke-linecap:round}
.nl{stroke:var(--new);stroke-width:3.5;stroke-linecap:round}
.x{stroke:var(--x);stroke-width:1.6;fill:none}
.nx{stroke:var(--new);stroke-width:1.8;fill:none}
.wall{stroke:var(--wall);stroke-width:5}
.cut{fill:none;stroke:var(--mute);stroke-width:1.2;stroke-dasharray:4 3}
ol{padding-left:22px}
code{font-size:14px;background:var(--in);padding:1px 4px;border-radius:3px}
li{margin:4px 0}
footer{margin-top:64px;font-size:14px;color:var(--mute)}

.legend{color:var(--ink)}
footer{color:var(--ink)}
.over .grp{font-size:14px;font-weight:600;margin:18px 0 6px}
.over .grp a{text-decoration:none}
.hero{display:flex;justify-content:space-between;align-items:flex-end;gap:12px 24px;flex-wrap:wrap}
.hero h1{margin-bottom:4px}
.hero p{margin:0}
.demo{margin:14px 0 8px}
.demo>input{position:absolute;opacity:0;pointer-events:none}
.seg{display:inline-flex;border:1px solid var(--ink);border-radius:5px;overflow:hidden;margin-bottom:10px}
.seg label{padding:5px 18px;cursor:pointer;border-left:1px solid var(--ink);user-select:none}
.seg label:first-child{border-left:0}
#m1:checked~.seg label[for=m1],#m2:checked~.seg label[for=m2],#m3:checked~.seg label[for=m3],#m4:checked~.seg label[for=m4]{background:var(--ink);color:var(--bg)}
.demo .pane{display:none}
#m1:checked~.p1,#m2:checked~.p2,#m3:checked~.p3,#m4:checked~.p4{display:block}
#lv:not(:checked)~.off,#lv:checked~.on{display:block}
.demo img{display:block;max-width:100%;height:auto;border:1px solid var(--rule);border-radius:4px}
.demo .pane p,.demo>p{margin:8px 0 0}
.tgl{display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;margin-bottom:10px;font-weight:600}
.tgl span{width:34px;height:20px;border-radius:10px;background:var(--rule);position:relative;transition:background .15s}
.tgl span::after{content:"";position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s}
#lv:checked~.tgl span{background:#8b3fd1}
#lv:checked~.tgl span::after{left:17px}
#lv:focus-visible~.tgl,.demo>input:focus-visible+*{outline:2px solid var(--ink)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:14px 0}
.step{border:1px solid var(--rule);border-radius:5px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start}
.step b,.mock b{flex:none;width:22px;height:22px;border-radius:50%;background:var(--ink);color:var(--bg);font-size:13px;line-height:22px;text-align:center}
.step p{margin:0;font-size:15px;line-height:1.5}
.mock{border:1px solid var(--rule);border-radius:6px;overflow:hidden;font-size:13px;margin:6px 0 12px;background:var(--bg)}
.mock .bar{background:var(--in);padding:6px 10px}
.mock .bar span{background:var(--bg);border-radius:12px;padding:2px 12px;font-family:ui-monospace,monospace;font-size:12px}
.mock .row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--rule);flex-wrap:wrap}
.mock .t{font-weight:600;font-size:15px;margin-right:auto}
.mock .dev{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.mock .dev i{width:30px;height:16px;border-radius:8px;background:#1a73e8;position:relative}
.mock .dev i::after{content:"";position:absolute;right:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff}
.mock .load{display:inline-flex;align-items:center;gap:6px;border:2px solid var(--ink);border-radius:4px;padding:3px 6px 3px 10px;font-weight:600}
.mock .ghost{border:1px solid var(--rule);border-radius:4px;padding:4px 10px;color:var(--x)}
.mock .card{display:flex;align-items:center;gap:10px;margin:12px;padding:10px 12px;border:1px solid var(--rule);border-radius:6px;max-width:300px}
.mock .card .re{margin-left:auto;font-size:16px}

.top{border-bottom:1px solid var(--rule);background:var(--bg)}
.top div{max-width:760px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:4px 18px;flex-wrap:wrap}
.top .home{font-weight:700;text-decoration:none;padding:12px 0;margin-right:8px}
.top .tab{text-decoration:none;color:var(--mute);padding:12px 0;border-bottom:2px solid transparent;margin-bottom:-1px}
.top .tab.on{color:var(--ink);border-bottom-color:var(--ink)}
.top .tab:hover{color:var(--ink)}
.top .ext{margin-left:auto}
main{padding-top:32px}
.over{margin:20px 0 0}
.over h4{font-size:14px;font-weight:600;margin:18px 0 6px;color:var(--mute)}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.tile{display:block;text-decoration:none;border:1px solid var(--rule);border-radius:4px;padding:6px 6px 4px}
.tile:hover{border-color:var(--mute)}
.tile svg{height:68px;width:auto;margin:0 auto}
.tile span{display:block;font-size:12.5px;line-height:1.35;margin-top:4px}
.shot{max-width:100%;height:auto;border:1px solid var(--rule);border-radius:4px}
.btn{display:inline-block;padding:7px 14px;border:1px solid var(--ink);border-radius:4px;text-decoration:none;font-weight:600;margin-right:8px}
.dl{margin:14px 0}
table{border-collapse:collapse;margin:10px 0;width:100%}
th,td{text-align:left;vertical-align:top;padding:7px 10px 7px 0;border-top:1px solid var(--rule);font-size:15px}
th{white-space:nowrap;padding-right:16px}
h4 a{text-decoration:none}
"""


def legend_line(cls):
    return f'<svg width="28" height="12"><line class="{cls}" x1="3" y1="6" x2="25" y2="6"/></svg>'


def legend_x(cls):
    return f'<svg width="12" height="12"><path class="{cls}" d="M1.5 1.5L10.5 10.5M1.5 10.5L10.5 1.5"/></svg>'


TABS = [('index.html', './', '패턴 정리'), ('ext.html', 'ext.html', '힌트 확장 프로그램')]


def page(fname, title, desc, body):
    tabs = ''.join(f'<a class="tab{" on" if f == fname else ""}" href="{href}">{name}</a>' for f, href, name in TABS)
    return '\n'.join([
        '<!doctype html><html lang="ko"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        f'<title>{title}</title>',
        f'<meta name="description" content="{desc}">',
        '<link rel="icon" href="favicon.svg">',
        f'<style>{CSS}</style></head><body>',
        f'<header class="top"><div><a class="home" href="./">슬리더링크</a>{tabs}'
        '<a class="tab ext" href="https://github.com/YangSeungWon/slitherlink-patterns">GitHub</a></div></header>',
        '<main>', body,
        '<footer>연습은 <a href="https://www.puzzle-loop.com/">puzzle-loop.com</a>에서. 5x5부터 시작해 크기를 키우면 된다.</footer>',
        '</main></body></html>\n'])


def overview():
    out = ['<div class="over">']
    for i, s in enumerate(sections, 1):
        if not s['items']:
            out.append(f'<div class="grp"><a href="#s{i}">{s["title"]}</a></div>')
            continue
        out.append(f'<div class="grp"><a href="#s{i}">{s["title"]}</a></div><div class="tiles">')
        for t, _, figs in s['items']:
            svg = figs[0][figs[0].index('<svg'):figs[0].index('</svg>') + 6]
            out.append(f'<a class="tile" href="#{IDS[t]}">{svg}<span>{t}</span></a>')
        out.append('</div>')
    out.append('</div>')
    return ''.join(out)


def build_patterns():
    out = ['<h1>슬리더링크 패턴</h1>',
           '<p>숫자는 둘레의 선 개수. 점을 이어 고리 하나를 만든다. 위에서 아래로 갈수록 어렵다.</p>',
           '<div class="legend">',
           f'<span>{legend_line("l")}이미 있는 선</span>',
           f'<span>{legend_x("x")}이미 있는 x</span>',
           f'<span>{legend_line("nl")}그래서 생기는 선</span>',
           f'<span>{legend_x("nx")}그래서 생기는 x</span>',
           f'<span>{legend_line("wall")}판의 가장자리</span>',
           '</div>', overview()]
    for i, s in enumerate(sections, 1):
        out.append(f'<h2 id="s{i}">{s["title"]}</h2>')
        for t, txt, figs in s['items']:
            out.append(f'<h3 id="{IDS[t]}">{t}</h3><p>{txt}</p><div class="figs">{"".join(figs)}</div>')
    out.append('<ol>')
    out += [f'<li>{x}</li>' for x in steps]
    out.append('</ol>')
    return page('index.html', '슬리더링크 패턴', '슬리더링크(Slitherlink)를 풀 때 쓰는 패턴을 쉬운 것부터 그림으로 정리했다.', '\n'.join(out))


if __name__ == '__main__':
    with open('index.html', 'w') as f:
        f.write(build_patterns())
    with open('ext.html', 'w') as f:
        f.write(page('ext.html', '슬리더링크 힌트 확장', 'puzzle-loop.com에서 지금 판에 쓸 수 있는 패턴을 하나씩 짚어 주는 브라우저 확장 프로그램.', EXT_BODY))
    import zipfile
    with zipfile.ZipFile('loop-hint.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for name in ('manifest.json', 'engine.js', 'content.js', 'icon.png'):
            z.write(f'extension/{name}', name)
    print('index.html, ext.html, loop-hint.zip written')
