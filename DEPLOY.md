# Deployment Guide — Inventory Tracker

This app is a static Vite SPA. You can deploy it from **GitHub** to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

**Important:** The QR scanner needs **HTTPS** (all of the platforms below provide it automatically).

---

## Part 1 — Push the project to GitHub

### 1. Create a new repository
1. Go to [github.com/new](https://github.com/new)
2. Repository name: e.g. `inventory-tracker`
3. Visibility: Public or Private
4. **Do not** initialize with README / .gitignore / license (the project already has them)
5. Click **Create repository**

### 2. Push your local code
From the project root (`inventory-tracker/`):

```bash
git init
git add .
git commit -m "Initial commit — Inventory Tracker MVP with GAS support"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/inventory-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

> If the folder is already a git repo, skip `git init` and just add the remote + push.

### 3. (Optional) Add the GAS URL as a secret later
You will set `VITE_GAS_WEB_APP_URL` in the hosting platform’s environment variables (not in the repo).  
Never commit a real `.env` file with secrets.

---

## Part 2 — Deploy from GitHub

Choose **one** of the platforms below.

---

### Option A — Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New… → Project**.
3. Import the `inventory-tracker` repository.
4. Configure:
   | Setting | Value |
   |---------|-------|
   | Framework Preset | **Vite** |
   | Root Directory | `./` (or leave default) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |
5. **Environment Variables** (optional, for GAS database):
   - Key: `VITE_GAS_WEB_APP_URL`
   - Value: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`
6. Click **Deploy**.

After deploy you get a URL like:
`https://inventory-tracker-xxxx.vercel.app`

**Automatic deploys:** every push to `main` triggers a new production deploy. Pull requests get preview URLs.

**Custom domain:** Project → Settings → Domains.

---

### Option B — Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub.
2. **Add new site → Import an existing project**.
3. Choose the `inventory-tracker` repo.
4. Build settings:
   | Setting | Value |
   |---------|-------|
   | Build command | `npm run build` |
   | Publish directory | `dist` |
5. **Environment variables** (Site settings → Environment variables):
   - `VITE_GAS_WEB_APP_URL` = your GAS Web App URL
6. Deploy.

**SPA routing:** Netlify usually handles it. If deep links 404, add a `public/_redirects` file:

```
/*    /index.html   200
```

Or create `netlify.toml` in the project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### Option C — Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the repository.
3. Build settings:
   | Setting | Value |
   |---------|-------|
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. Add environment variable `VITE_GAS_WEB_APP_URL` if using GAS.
5. Save and Deploy.

---

### Option D — GitHub Pages

1. Install the deploy helper (one-time):

```bash
npm install -D gh-pages
```

2. Add a script to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "deploy": "npm run build && gh-pages -d dist"
}
```

3. Set the base path in `vite.config.ts` (required when the site is not at the domain root):

```ts
export default defineConfig({
  base: '/inventory-tracker/',   // ← must match your repo name
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

4. Deploy:

```bash
npm run deploy
```

5. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `/ (root)`

Site URL will be:
`https://YOUR_USERNAME.github.io/inventory-tracker/`

**Note:** For GitHub Pages, environment variables like `VITE_GAS_WEB_APP_URL` must be available at **build time**. You can:
- Put the URL in a `.env.production` file (only if the URL is not secret), or
- Use GitHub Actions to inject the secret during the build.

---

## Part 3 — Environment variable for GAS database

On **Vercel / Netlify / Cloudflare**:

1. Open the project’s **Environment Variables** / **Settings**.
2. Add:
   ```
   VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID/exec
   ```
3. Redeploy (or push a new commit) so the variable is baked into the build.

Vite only exposes variables that start with `VITE_` to the client, and they are embedded at **build time**.

---

## Part 4 — Post-deploy checklist

- [ ] Site loads over HTTPS
- [ ] Dashboard and Inventory show data (localStorage or GAS)
- [ ] Scan screen asks for camera permission on mobile
- [ ] Scanning an existing SKU opens the product
- [ ] Scanning an unknown code opens Add Product with prefilled fields
- [ ] Settings → QR Field Mapping works
- [ ] If using GAS: new products appear in the Google Sheet

---

## Quick reference

| Platform | Connect GitHub | Env vars UI | Auto-deploy on push | Free HTTPS |
|----------|----------------|-------------|---------------------|------------|
| Vercel | Yes | Yes | Yes | Yes |
| Netlify | Yes | Yes | Yes | Yes |
| Cloudflare Pages | Yes | Yes | Yes | Yes |
| GitHub Pages | Native | Via Actions | Via Actions | Yes |

**Recommended path for most users:**  
Push to GitHub → Import into **Vercel** → set `VITE_GAS_WEB_APP_URL` → Deploy.
