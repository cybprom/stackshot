# Spike URLs — Milestone 0

Deleted at teardown with the throwaway repo. Recorded here because a context
clear loses them and Camo URLs cannot be re-derived without re-reading the
rendered README HTML.

Production domain: https://stackshot-spike.vercel.app
Spike repo:        https://github.com/cybprom/stackshot-spike
Vercel project:    cybproms-projects/stackshot-spike (no Git integration until M2)

Downstream header: public, max-age=300  (s-maxage=86400 consumed at the edge)

## Camo URLs

Step 6 polls the two ttl-* entries. theme-* must never change bytes.

### theme-dark
https://camo.githubusercontent.com/37810e2273835dec330753a19aa9a56975ddbc45a6ce9eb61814463ae98d8743/68747470733a2f2f737461636b73686f742d7370696b652e76657263656c2e6170702f7370696b652f7468656d652f636172642d6461726b2e706e67

### theme-light
https://camo.githubusercontent.com/5688ac904c30c29c547d8b8c29f284a9d1f261a2eed8dc6df2ee799caaac873f/68747470733a2f2f737461636b73686f742d7370696b652e76657263656c2e6170702f7370696b652f7468656d652f636172642d6c696768742e706e67

### ttl-dark
https://camo.githubusercontent.com/465a2341d6363ac435aecd2524f7738ed2d6f94ab51490fbfc3e8e1ac47e6b20/68747470733a2f2f737461636b73686f742d7370696b652e76657263656c2e6170702f7370696b652f74746c2f636172642d6461726b2e706e67

### ttl-light
https://camo.githubusercontent.com/25175e4ae85c8271d797f0e5ccdce1a1b6cf686020d6f6646a54e9428001b7a5/68747470733a2f2f737461636b73686f742d7370696b652e76657263656c2e6170702f7370696b652f74746c2f636172642d6c696768742e706e67

## Baseline shas (crude renderer, satori 0.33.4 + resvg-js 2.6.2, 2x)
```
b022c1438c04eb22aa7f7f7ab526dc6ce2c629f52566ce5377eb0dcb09adb829  crude-dark-v1.png
b1e5ae26889e88b7dbece1c84b1be78253dd3eb5e754b4bbc1f5cba202360e84  crude-dark-v2.png
81f24637d56c909ee7220d67830f33ffad35587837a9c6975b75fe3c8addd7e3  crude-light-v1.png
929bf813598d729d2a4a5e9bdda04cd52a6dfa66efa150aa8a693452450e1c43  crude-light-v2.png
```
