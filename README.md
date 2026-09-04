# ShelfTrack (Shelfmark)

Workshop inventory app with built-in QR scanning to identify products on the floor, pick/receive stock, and track movements.

Built with React 19, TanStack Router/Start, Vite, Tailwind CSS v4, Zustand, and related tooling.

## Uploaded so far (batches)

- Top-level: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.project_id`, `startup.sh`, `AGENTS.md`
- Scripts (partial): `app-env-plugin.mjs`, `migration-plan.mjs`, `browser-guard.mjs`, `preview-thumbnail.mjs`
- Core `src/`:
  - Entry: `router.tsx`, `styles.css`, `types/jsqr.d.ts`, `lib/utils.ts`
  - Routes: `__root.tsx`, `_app.tsx`, `_app/index.tsx` (floor), `_app/catalog.tsx`, `_app/scan.tsx`, `_app/activity.tsx`

Still remaining (next batches on request):
- Remaining scripts, `src/components/*`, `src/lib/*` (inventory, auth, db, etc.), `src/routes/_app/catalog.$id.tsx`, `server/`, `migrations/`, `public/`, `.grok/` skills/references, screenshots (binary), `package-lock.json`

## Quick start

```bash
npm install
npm run dev
```

App name in UI: **Shelfmark**. Listen on `0.0.0.0:8080`.

Original full workspace: attached `grok-workspace.zip` in the chat.
