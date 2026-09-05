# ShelfTrack upload task list

Track remaining files from `grok-workspace.zip` vs GitHub repo.

## Status
- ZIP total: 287 files
- Repo at task-list creation: ~82 files
- Missing: ~206

## P0 Critical source (must have for app to run)
- [ ] src/lib/auth/server.ts
- [ ] src/lib/auth/gate-session.server.ts
- [ ] src/lib/auth/gate-identity.test.ts
- [ ] src/lib/db.ts
- [ ] src/lib/preview-host-bridge.ts
- [ ] src/lib/multiplayer/p2p.ts
- [ ] src/lib/app-data/client.server.ts
- [ ] src/lib/app-data/app-data.test.ts
- [ ] server/middleware/grok-pwa.ts

## P1 Scripts + public text
- [ ] scripts/brand-check.mjs (+ test)
- [ ] scripts/browser-smoke*.mjs (+ tests)
- [ ] scripts/grok-pwa-*.mjs (+ tests)
- [ ] scripts/preview.mjs (+ test)
- [ ] scripts/*-test.mjs remaining
- [ ] public/__grok/install/styles.css

## P2 Optional / heavy
- [ ] package-lock.json
- [ ] public PNG icons

## P3 Platform template (.grok) — 89 files
- [ ] .grok/app-env.json
- [ ] .grok/references/*
- [ ] .grok/skills/**

## P4 Build artifacts (optional, skippable)
- [ ] .vercel/output/** (built bundles)
- [ ] screenshots/** (PNGs)
- [ ] .node_modules.lock

Check boxes as files land. Prefer P0 → P1 → P3; skip P4 unless requested.
