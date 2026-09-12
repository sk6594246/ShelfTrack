# Inventory Tracker (MVP)

A mobile-friendly Progressive Web App for inventory tracking with **configurable QR / barcode scanning**.

## Features

- **Dashboard** – totals, low-stock alerts, quick scan
- **Inventory list** – search + stock status filters
- **Product detail** – view, edit, adjust stock, history
- **QR / Barcode scanner**
  - Looks up existing products using a configurable primary field (SKU, barcode, custom ID, name)
  - If no match is found, opens the “Add Product” form with selected fields pre-filled
- **QR Field Mapping settings** – choose which field is used for lookup and which fields get pre-filled
- Data persists in `localStorage` (demo data is seeded on first load)

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- html5-qrcode (camera scanning)
- lucide-react (icons)

## Getting Started

```bash
cd inventory-tracker
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

> **Camera access** is required for the Scan screen. Use HTTPS or localhost. On mobile, grant camera permission when prompted.

## Project Structure

```
src/
├── components/
│   ├── layout/AppShell.tsx      # Responsive nav (bottom on mobile, sidebar on desktop)
│   ├── product/ProductCard.tsx
│   ├── scanner/QRScanner.tsx    # Camera + decode
│   └── ui/StatusBadge.tsx
├── hooks/
│   ├── useProducts.ts
│   └── useQRMapping.ts
├── lib/qr.ts                    # Interpret QR + apply mapping
├── pages/
│   ├── Dashboard.tsx
│   ├── Inventory.tsx
│   ├── Scan.tsx
│   ├── ProductDetail.tsx
│   ├── ProductForm.tsx          # Supports prefill from scan
│   └── settings/
│       ├── Settings.tsx
│       └── QRMapping.tsx        # Configurable field mapping UI
├── store/inventoryStore.ts      # localStorage persistence
└── types/inventory.ts
```

## Configurable QR Mapping

Go to **Settings → QR Field Mapping**.

1. **Primary lookup field** – the field used to search for an existing product.
2. **Fields to pre-fill** – when no product is found, these form fields receive the scanned value.
3. **Payload format**
   - **Plain text** – entire QR string is written into the selected fill fields.
   - **JSON** – expects an object like `{"sku":"ABC-123","name":"Widget"}`.

## Demo Data

On first load the app seeds 4 sample products so you can explore immediately.  
Use **Settings → Clear all data** to reset.

## Next Steps (beyond MVP)

- Backend sync / multi-device
- Image upload for products
- Print / generate QR labels
- Offline PWA (service worker)
- Categories & locations management
- Export CSV

---

## Database options

### Default: localStorage
No setup required. Data stays in the browser.

### Google Apps Script + Google Sheets
1. Follow the instructions in `gas/README.md`
2. Create `.env` with:
   ```
   VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID/exec
   ```
3. Restart `npm run dev`

When the env variable is set, all product / movement / QR-mapping data is stored in your Google Sheet. When it is empty, the app uses localStorage.

---

## Deploy to production (GitHub)

Full step-by-step instructions (push to GitHub → Vercel / Netlify / Cloudflare / GitHub Pages):

👉 See **[DEPLOY.md](./DEPLOY.md)**

Quick path:
1. Push the repo to GitHub
2. Import into [Vercel](https://vercel.com) (or Netlify)
3. Set env var `VITE_GAS_WEB_APP_URL` if using Google Sheets
4. Deploy
