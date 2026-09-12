# Google Apps Script (GAS) Database Setup

This folder contains the backend that uses **Google Sheets as the database**.

## Architecture

```
React App  →  fetch POST  →  GAS Web App  →  Google Spreadsheet
                              (Code.gs)         ├── Products
                                                ├── Movements
                                                └── Config
```

When `VITE_GAS_WEB_APP_URL` is set, the frontend uses GAS.  
When it is empty, the app falls back to browser `localStorage`.

---

## Step-by-step setup

### 1. Create a Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it e.g. **Inventory Tracker DB**

### 2. Open Apps Script
1. In the Sheet: **Extensions → Apps Script**
2. Delete any default code
3. Paste the entire contents of `Code.gs`
4. Save the project (name it e.g. Inventory API)

### 3. Initialize the sheets
1. In the Apps Script editor, select function `initializeSheets`
2. Click **Run**
3. Authorize the script when prompted (Review permissions → Allow)
4. You should see an alert “Sheets initialized successfully”
5. Return to the spreadsheet — you will now have three tabs:
   - **Products** (with headers)
   - **Movements** (with headers)
   - **Config** (with default QR mapping)

### 4. Deploy as Web App
1. In Apps Script: **Deploy → New deployment**
2. Type: **Web app**
3. Settings:
   - Description: `Inventory Tracker API`
   - Execute as: **Me**
   - Who has access: **Anyone** (or “Anyone with Google account” if you prefer)
4. Click **Deploy**
5. Copy the **Web app URL** (ends with `/exec`)

### 5. Connect the frontend
1. In the React project root, create a `.env` file:
   ```
   VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
2. Restart the dev server (`npm run dev`)
3. The app will now read/write to Google Sheets instead of localStorage

### 6. Redeploy after code changes
If you edit `Code.gs` later:
1. **Deploy → Manage deployments → Edit (pencil) → New version → Deploy**
2. The URL stays the same

---

## Sheet schema

### Products
| id | name | sku | barcode | customId | category | location | quantity | reorderPoint | notes | imageUrl | createdAt | updatedAt |

### Movements
| id | productId | change | reason | createdAt |

### Config
| key | value |
| qrMapping | `{"primaryLookupField":"sku","fillFields":["sku","barcode"],"payloadParser":"plain"}` |

---

## API actions (POST body)

```json
{ "action": "getProducts" }
{ "action": "getProduct", "id": "..." }
{ "action": "saveProduct", "product": { ... } }
{ "action": "deleteProduct", "id": "..." }
{ "action": "getMovements", "productId": "..." }
{ "action": "adjustStock", "productId": "...", "change": 5, "reason": "Received" }
{ "action": "getQRMapping" }
{ "action": "saveQRMapping", "config": { ... } }
```

All responses are JSON. Errors return `{ "error": "message" }`.

---

## Notes & limitations

- GAS has daily quotas (generous for small/medium inventory apps).
- Cold starts can add 1–3 seconds on the first request after idle.
- For production multi-user use, consider adding a simple shared secret or Google sign-in check.
- “Anyone” access means the URL is public — treat it like an unauthenticated API.
- Do not put secrets in the Sheet; the Web App URL is the access control.

---

## Switching back to localStorage

Remove or empty `VITE_GAS_WEB_APP_URL` in `.env` and restart the dev server.
