# 슬리더링크 패턴

슬리더링크(Slitherlink) 풀이 패턴을 쉬운 것부터 그림으로 정리한 정적 페이지와, puzzle-loop.com에서 쓰는 힌트 확장 프로그램. https://loop.ysw.kr

## 페이지

`index.html`과 `loop-hint.zip`은 `build.py`가 만든다. 내용을 고치면 다시 실행한다.

```
python3 build.py
```

## 확장 프로그램 (`extension/`)

- `engine.js`: 힌트 엔진. 페이지에 정리한 패턴을 쉬운 순서로 판에 대 보고, 처음 들어맞는 것을 돌려준다. 실수 확인용 풀이기도 들어 있다.
- `content.js`: puzzle-loop.com 페이지 안에서 `Game.currentState`를 읽고 패널과 하이라이트를 그린다.
- `test.js`: 힌트만 따라가서 퍼즐이 끝까지 풀리는지, 힌트가 정답과 어긋나지 않는지 확인한다.

```
node extension/test.js                      # 내장 예제 하나
node extension/test.js 'task:W:H:md5'        # 페이지의 task, 크기, hashedSolution
```
