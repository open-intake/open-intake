# 最後の36問: 判定役ごとの重さつきの判定、合否の基準、判定役どうしの割れ
# 使い方: python score.py   （判定の JSON は judge-astra/・judge-carbon/・judge-claude/out/）
import json, re, os, sys, collections
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
cases = {c['id']: c for c in json.load(open(f'{HERE}/final36.json', encoding='utf-8'))['cases']}
CH = ('01-12', '13-24', '25-36')
DIRS = {'Astra': 'judge-astra', 'Carbon': 'judge-carbon', 'Claude': 'judge-claude'}
PAIRS = {'haiku': ('Astra', 'Carbon'), 'luna': ('Carbon', 'Claude')}
problems = []
def load(judge, model, r, c):
    p = f'{HERE}/{DIRS[judge]}/{model}-F{r}-{c}.json'
    if not os.path.exists(p): return None
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", open(p, encoding='utf-8').read().strip())
    js = json.loads(t)['cases']
    want = re.findall(r'^## (N\d+)', open(f'{HERE}/judge-in/in-{model}-F{r}-{c}.md', encoding='utf-8').read(), re.M)
    got = [j['id'] for j in js]
    if got != want: problems.append(f'{judge} {model}-F{r}-{c}: id {got} ≠ {want}')
    out = {}
    for j in js:
        cid = j['id']; cs = cases[cid]
        mi = sorted(x['id'] for x in j.get('must', [])); ni = sorted(x['id'] for x in j.get('mustNot', []))
        if mi != sorted(f'M{i+1}' for i in range(len(cs['must']))) or ni != sorted(f'N{i+1}' for i in range(len(cs['mustNot']))):
            problems.append(f'{judge} {model}-F{r} {cid}: 項目 {mi} {ni}')
        out[cid] = j
    return out
def verdict(cid, j):
    hit = [x['id'] for x in j.get('mustNot', []) if x.get('hit')]
    met = {x['id']: x.get('met') for x in j.get('must', [])}
    miss = [(f'M{i+1}', m['weight'][0]) for i, m in enumerate(cases[cid]['must']) if not met.get(f'M{i+1}')]
    w = [x[1] for x in miss]
    v = '×' if hit or 'c' in w else '△' if 'i' in w else '○'
    return v, [k for k, x in miss if x != 's'], hit
res = {}
for model in ('haiku', 'luna'):
    for judge in DIRS:
        for r in (1, 2, 3):
            J = {}
            for c in CH:
                d = load(judge, model, r, c)
                if d is None: J = None; break
                J.update(d)
            if J is not None: res[(model, judge, r)] = J
for model in ('haiku', 'luna'):
    print(f'=== {model} ===')
    for judge in DIRS:
        rows = [res.get((model, judge, r)) for r in (1, 2, 3)]
        if not all(rows): 
            if any(rows) or judge in PAIRS[model]: print(f'  {judge}: 揃っていない')
            continue
        cnt = [collections.Counter(verdict(k, v)[0] for k, v in J.items()) for J in rows]
        tot = sum(cnt, collections.Counter())
        ok = tot['×'] == 0 and tot['○'] >= 98 and all(c['○'] >= 31 for c in cnt)
        tag = '' if judge in PAIRS[model] else '（参考）'
        print(f"  {judge}{tag}: " + ' | '.join(f"F{r+1} ○{c['○']} △{c['△']} ×{c['×']}" for r, c in enumerate(cnt))
              + f"  計 ○{tot['○']}/108 ×{tot['×']}  → {'基準を満たす' if ok else '満たさない'}")
    a, b = PAIRS[model]
    if all(res.get((model, j, r)) for j in (a, b) for r in (1, 2, 3)):
        agree = 0; diffs = []
        for r in (1, 2, 3):
            for cid in sorted(cases):
                va = verdict(cid, res[(model, a, r)][cid]); vb = verdict(cid, res[(model, b, r)][cid])
                if va[0] == vb[0]: agree += 1
                else: diffs.append(f'    F{r} {cid}: {a}{va[0]}{va[1]}{va[2]} / {b}{vb[0]}{vb[1]}{vb[2]}')
        print(f'  {a} と {b} の判定の一致: {agree}/108。割れた問（作者が答えを読んで決める）:')
        print('\n'.join(diffs) or '    なし')
        for r in (1, 2, 3):
            for cid in sorted(cases):
                for j in (a, b):
                    v = verdict(cid, res[(model, j, r)][cid])
                    if v[0] == '×': print(f'  × F{r} {cid} {j}: {v[1]}{v[2]} {res[(model, j, r)][cid].get("note", "")}')
print('\n'.join(['== 形の問題 =='] + problems) if problems else '== 形の問題: なし ==')
