# ShelfTrack (Shelfmark)

Workshop inventory app with built-in QR scanning to identify products on the floor, pick/receive stock, and track movements.

Built with React 19, TanStack Router/Start, Vite, Tailwind CSS v4, Zustand, and related tooling.

## Uploaded so far

**Top-level:** `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.project_id`, `startup.sh`, `AGENTS.md`

**Scripts:** `app-env-plugin.mjs`, `migration-plan.mjs`, `browser-guard.mjs`, `preview-thumbnail.mjs`, `migrate.mjs`, `with-app-env.mjs`, `write-atomic.mjs`, `install-page.html`, `grok-pwa-shared.d.mts`

**src/:**
- Entry: `router.tsx`, `styles.css`, `types/jsqr.d.ts`, `lib/utils.ts`
- Routes: `__root.tsx`, `_app.tsx`, `_app/index.tsx`, `_app/catalog.tsx`, `_app/scan.tsx`, `_app/activity.tsx`
- UI: `components/ui/{label,separator,badge,input,button,dialog,dropdown-menu}.tsx`
- Components: `stock-badge`, `product-mark`, `preview-host-bridge`
- Inventory: `lib/inventory/types.ts`, `lib/inventory/qr.ts`

## Still remaining
- Remaining scripts (browser-smoke, grok-pwa-plugin, preview, tests, etc.)
- `src/components/{app-shell,movement-list,product-form,product-qr,qr-scanner,stock-actions}.tsx`
- `src/lib/inventory/{store,seed}.ts` + auth/db/og helpers
- `src/routes/_app/catalog.$id.tsx`
- `server/`, `migrations/`, `public/`, `.grok/`, screenshots, `package-lock.json`

## Quick start

```bash
npm install
npm run dev
```

App name in UI: **Shelfmark**. Listen on `0.0.0.0:8080`.

Original full workspace: attached `grok-workspace.zip` in the chat.
