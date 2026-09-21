# Cold render — raw measurements

Method: cache-busted requests so every one reaches the function
(x-vercel-cache: MISS). Summarised in GOTCHAS 020.

## Crude card, after ~25 minutes idle
```
idle-cold measurement, 2026-09-21T03:37:30Z, after ~25min idle
  run 1  total=1.508738s ttfb=0.987067s 200  MISS
  run 2  total=1.362588s ttfb=0.815337s 200  MISS
  run 3  total=1.521221s ttfb=0.859565s 200  MISS
```

## Crude card, immediately after a fresh deploy
```
run 1  total=2.093632s ttfb=1.622919s 200  MISS
run 2  total=1.565401s ttfb=1.404043s 200  MISS
run 3  total=1.288637s ttfb=1.036952s 200  MISS
```

## Real card, immediately after a fresh deploy (method-matched)
```
run 1  total=2.393648s ttfb=1.692544s 200  MISS
run 2  total=1.796910s ttfb=1.157862s 200  MISS
run 3  total=1.864254s ttfb=1.158203s 200  MISS
```
