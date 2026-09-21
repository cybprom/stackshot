# Step 6 — Camo TTL measurement, raw log

Header in force: cache-control: public, max-age=300
Origin flipped v1 -> v2 at T0. Polling both ttl Camo URLs.
Summarised in GOTCHAS 008; decision in ADR-0013.

```
=== step 6 log, started 2026-09-21T04:14:47Z ===
-- phase 1: waiting for origin v2 --
2026-09-21T04:14:48Z  origin light sha=81f24637d56c x-vercel-cache=HIT
2026-09-21T04:14:54Z  origin light sha=81f24637d56c x-vercel-cache=HIT
2026-09-21T04:15:00Z  origin light sha=81f24637d56c x-vercel-cache=HIT
2026-09-21T04:15:05Z  origin light sha=81f24637d56c x-vercel-cache=HIT
2026-09-21T04:15:11Z  origin light sha=81f24637d56c x-vercel-cache=HIT
2026-09-21T04:15:19Z  origin light sha=929bf813598d x-vercel-cache=HIT
T0 = 2026-09-21T04:15:19Z  (origin serving v2)
-- phase 2: polling camo --
2026-09-21T04:15:20Z  t+0s  light  http=200 sha=81f24637d56c age=102 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960077-PAR
2026-09-21T04:15:21Z  t+0s  dark  http=200 sha=b022c1438c04 age=104 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960053-PAR
2026-09-21T04:16:21Z  t+62s  light  http=200 sha=81f24637d56c age=163 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960044-PAR
2026-09-21T04:16:22Z  t+62s  dark  http=200 sha=b022c1438c04 age=165 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960094-PAR
2026-09-21T04:17:23Z  t+123s  light  http=200 sha=81f24637d56c age=225 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960090-PAR
2026-09-21T04:17:24Z  t+123s  dark  http=200 sha=b022c1438c04 age=227 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960076-PAR
2026-09-21T04:18:24Z  t+185s  light  http=200 sha=81f24637d56c age=287 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960032-PAR
2026-09-21T04:18:25Z  t+185s  dark  http=200 sha=b022c1438c04 age=288 x-cache=HIT cc=[public, max-age=300] by=cache-par-lfpg1960097-PAR
2026-09-21T04:19:27Z  t+246s  light  http=200 sha=929bf813598d age=0 x-cache=MISS cc=[public, max-age=300] by=cache-par-lfpg1960035-PAR  *** V2 ***
2026-09-21T04:19:28Z  t+246s  dark  http=200 sha=b1e5ae26889e age=0 x-cache=MISS cc=[public, max-age=300] by=cache-par-lfpg1960076-PAR  *** V2 ***
```
