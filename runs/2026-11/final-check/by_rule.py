# 問ごとの ○ の数（Haiku: Astra・Carbon、Luna: Carbon・Claude の 4×3 = 12判定）と、Carbon を除いた ○（6判定）
import sys; sys.argv = ['x']
exec(open('score.py', encoding='utf-8').read().split("for model in ('haiku', 'luna'):\n    print")[0])
combos = [('haiku', 'Astra'), ('haiku', 'Carbon'), ('luna', 'Carbon'), ('luna', 'Claude')]
for cid in sorted(cases):
    vs = {(m, j): ''.join(verdict(cid, res[(m, j, r)][cid])[0] for r in (1, 2, 3)) for m, j in combos}
    all_o = sum(v.count('○') for v in vs.values()); nc = sum(v.count('○') for (m, j), v in vs.items() if j != 'Carbon')
    print(f"{cid} {all_o:2d}/12 nonCarbon {nc}/6  {' '.join(vs.values())}  {' '.join(cases[cid]['rules'])}")
