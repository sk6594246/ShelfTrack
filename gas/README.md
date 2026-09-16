# Google Apps Script (GAS) Database Setup

This folder contains the backend that uses **Google Sheets as the database**.

## Architecture

```
React App  →  fetch POST  →  GAS Web App  →  Google Spreadsheet
                              (Code.gs)         ├── Products
                                                ├── Movements
                                                ├── Config
                                                ├── Locations
                                                └── LocationProducts
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
5. Return to the spreadsheet — you will now have tabs:
   - **Products**
   - **Movements**
   - **Config**
   - **Locations** (`mapPosition` = `row,col,shelf`)
   - **LocationProducts**

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
| qrMapping | JSON config |

### Locations
| id | name | code | mapPosition | notes | createdAt | updatedAt |

`mapPosition` = comma-separated **`row,col,shelf`** (1-based), e.g. `1,2,3` → grid R1C2 shelf 3.  
Empty or incomplete (missing row/col) = off-grid. Shelf-only can be `,,2`.

### LocationProducts
| locationId | productId |

Many-to-many: which products can be stored at a location.

After updating Code.gs: run **initializeSheets()** again (safe), then **Deploy → Manage deployments → Edit → New version**.

---

## API actions (POST body)

```json
{ "action": "getLocations" }
{ "action": "saveLocation", "location": { "id": "...", "name": "Shelf A1", "code": "A1", "mapPosition": "1,1,1" } }
{ "action": "deleteLocation", "id": "..." }
{ "action": "getLocationProducts" }
{ "action": "setLocationProducts", "locationId": "...", "productIds": ["..."] }
```

Plus existing product/movement/QR actions.
