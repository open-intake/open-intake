# 問ごとに、○でなかった回数と欠けた重大・重要の項目（判定役ごと）
import sys, collections; sys.argv = ['x']
exec(open('score.py', encoding='utf-8').read().split("for model in ('haiku', 'luna'):\n    print")[0])
for model in ('haiku', 'luna'):
    print(f'=== {model} ===')
    for cid in sorted(cases):
        row = []; bad = 0
        for judge in DIRS:
            if not all(res.get((model, judge, r)) for r in (1, 2, 3)): continue
            vs = [verdict(cid, res[(model, judge, r)][cid]) for r in (1, 2, 3)]
            bad += sum(v[0] != '○' for v in vs)
            miss = collections.Counter(k for v in vs for k in v[1])
            row.append(f"{judge[:2]}:{''.join(v[0] for v in vs)}{dict(miss) if miss else ''}")
        if bad: print(f'  {cid} ' + '  '.join(row))
