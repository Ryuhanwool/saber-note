// 데모 HTML(docs/saber-note-demo.html)을 jsdom에서 실행해, 데모가 만든 선수·계산값을
// fixtures/demo-golden.json으로 저장한다. 1~3단계 이식 결과를 이 파일과 대조한다.
//
//   npm run golden        골든 파일 다시 만들기
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM, VirtualConsole } from 'jsdom'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DEMO_HTML = resolve(ROOT, 'docs/saber-note-demo.html')
export const GOLDEN_JSON = resolve(ROOT, 'fixtures/demo-golden.json')

// 데모의 전역 lexical 변수(const players, M, LG …)는 window 속성이 아니라서
// 페이지 안에서 eval로 직접 읽는다.
const COLLECT = `(() => {
  const plain = (o) => JSON.parse(JSON.stringify(o));
  const has = (v) => v !== null && v !== undefined;
  const metricKeys = Object.keys(M);
  const avgKeys = (pool) => metricKeys.filter((k) => pool.some((p) => has(p[k])));
  // 데모 lgAvg는 null만 거르고 undefined는 거르지 않아 NaN이 나는 지표가 있다(예: 지명타자의 fpct).
  // 데모 화면에서 쓰이지 않는 값이므로 골든에서는 빼고 목록만 남긴다.
  const avgOf = (type, pool) => {
    const out = {}, nan = [];
    avgKeys(pool).forEach((k) => { const v = lgAvg(type, k); Number.isFinite(v) ? (out[k] = v) : nan.push(k); });
    return [out, nan];
  };
  const [avgH, nanH] = avgOf('H', poolH), [avgP, nanP] = avgOf('P', poolP);
  return {
    constants: { seed: 20261017, W, WSCALE, LG_RPA, POSADJ, RUN_SB, RUN_CS, POSF, poolMinPA: 300 },
    league: plain(LG),
    pools: { H: poolH.map((p) => p.id), P: poolP.map((p) => p.id) },
    players: players.map(plain),
    metrics: Object.fromEntries(players.map((p) => [p.id, Object.fromEntries(
      metricKeys.filter((k) => p[k] !== undefined)
        .map((k) => [k, { fmt: fmt(k, p[k]), pctl: M[k].neutral ? null : pctl(p, k) }])
    )])),
    lgAvg: { H: avgH, P: avgP },
    demoQuirks: { lgAvgNaN: { H: nanH, P: nanP } },
    battedBalls: Object.fromEntries(H_.map((p) => [p.id, battedBalls(p)])),
  };
})()`

export type Golden = {
  constants: Record<string, unknown>
  league: Record<string, number>
  pools: { H: number[]; P: number[] }
  players: Array<Record<string, unknown> & { id: number; type: 'H' | 'P' }>
  metrics: Record<string, Record<string, { fmt: string; pctl: number | null }>>
  lgAvg: { H: Record<string, number>; P: Record<string, number> }
  demoQuirks: { lgAvgNaN: { H: string[]; P: string[] } }
  battedBalls: Record<string, Array<{ ev: number; la: number; hit: boolean }>>
}

// JSON.stringify는 NaN·Infinity를 조용히 null로 바꾸므로 미리 찾아서 실패시킨다.
function findNonFinite(v: unknown, path = '$'): string[] {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [path]
  if (Array.isArray(v)) return v.flatMap((x, i) => findNonFinite(x, `${path}[${i}]`))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => findNonFinite(x, `${path}.${k}`))
  return []
}

export function extractGolden(html = readFileSync(DEMO_HTML, 'utf8')): Golden {
  const errors: string[] = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (e) => errors.push(e.message))
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', virtualConsole })
  try {
    if (errors.length) throw new Error(`데모 스크립트 실행 오류:\n${errors.join('\n')}`)
    const raw = (dom.window as unknown as { eval(src: string): unknown }).eval(COLLECT)
    const bad = findNonFinite(raw)
    if (bad.length) throw new Error(`유한하지 않은 값: ${bad.slice(0, 10).join(', ')}`)
    return raw as Golden
  } finally {
    dom.window.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const golden = extractGolden()
  mkdirSync(dirname(GOLDEN_JSON), { recursive: true })
  writeFileSync(GOLDEN_JSON, JSON.stringify(golden, null, 1) + '\n')
  const h = golden.players.filter((p) => p.type === 'H').length
  console.log(`저장: ${GOLDEN_JSON} (타자 ${h}명, 투수 ${golden.players.length - h}명)`)
}
