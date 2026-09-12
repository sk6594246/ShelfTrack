/**
 * Inventory Tracker — Google Apps Script backend
 * Uses a Google Spreadsheet as the database.
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Extensions → Apps Script → paste this entire file
 * 3. Run initializeSheets() once from the editor (authorize when prompted)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone (or Anyone with Google account)
 * 5. Copy the Web App URL into the frontend .env as VITE_GAS_WEB_APP_URL
 */

const SHEET_PRODUCTS = 'Products';
const SHEET_MOVEMENTS = 'Movements';
const SHEET_CONFIG = 'Config';

const PRODUCT_HEADERS = [
  'id', 'name', 'sku', 'barcode', 'customId', 'category', 'location',
  'quantity', 'reorderPoint', 'notes', 'imageUrl', 'createdAt', 'updatedAt'
];

const MOVEMENT_HEADERS = ['id', 'productId', 'change', 'reason', 'createdAt'];

// ---------- Entry points ----------
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'getProducts':
        result = { products: getAllProducts_() };
        break;
      case 'getProduct':
        result = { product: getProductById_(body.id) };
        break;
      case 'saveProduct':
        result = { product: saveProduct_(body.product) };
        break;
      case 'deleteProduct':
        deleteProduct_(body.id);
        result = { ok: true };
        break;
      case 'getMovements':
        result = { movements: getMovements_(body.productId) };
        break;
      case 'adjustStock':
        result = { product: adjustStock_(body.productId, body.change, body.reason) };
        break;
      case 'getQRMapping':
        result = { config: getQRMapping_() };
        break;
      case 'saveQRMapping':
        saveQRMapping_(body.config);
        result = { ok: true };
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ error: err.message || String(err) });
  }
}

// Also allow GET for simple health checks
function doGet() {
  return jsonResponse_({
    status: 'ok',
    service: 'Inventory Tracker GAS',
    time: new Date().toISOString(),
  });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Initialization ----------
/**
 * Run this once from the Apps Script editor to create the required sheets + headers.
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_PRODUCTS, PRODUCT_HEADERS);
  ensureSheet_(ss, SHEET_MOVEMENTS, MOVEMENT_HEADERS);
  ensureSheet_(ss, SHEET_CONFIG, ['key', 'value']);

  // Default QR mapping
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  const data = configSheet.getDataRange().getValues();
  const hasMapping = data.some((row) => row[0] === 'qrMapping');
  if (!hasMapping) {
    configSheet.appendRow([
      'qrMapping',
      JSON.stringify({
        primaryLookupField: 'sku',
        fillFields: ['sku', 'barcode'],
        payloadParser: 'plain',
      }),
    ]);
  }

  SpreadsheetApp.getUi().alert('Sheets initialized successfully.');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// ---------- Products ----------
function getAllProducts_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => rowToProduct_(headers, row));
}

function getProductById_(id) {
  const products = getAllProducts_();
  return products.find((p) => p.id === id) || null;
}

function saveProduct_(incoming) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const now = new Date().toISOString();

  let id = incoming.id;
  let rowIndex = -1; // 1-based for sheet

  if (id) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(id)) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  if (rowIndex === -1) {
    // Create
    id = id || Utilities.getUuid();
    const product = {
      id: id,
      name: incoming.name || '',
      sku: incoming.sku || '',
      barcode: incoming.barcode || '',
      customId: incoming.customId || '',
      category: incoming.category || '',
      location: incoming.location || '',
      quantity: Number(incoming.quantity) || 0,
      reorderPoint: Number(incoming.reorderPoint) || 0,
      notes: incoming.notes || '',
      imageUrl: incoming.imageUrl || '',
      createdAt: now,
      updatedAt: now,
    };
    sheet.appendRow(productToRow_(headers, product));
    return product;
  }

  // Update
  const existing = rowToProduct_(headers, values[rowIndex - 1]);
  const product = {
    ...existing,
    name: incoming.name !== undefined ? incoming.name : existing.name,
    sku: incoming.sku !== undefined ? incoming.sku : existing.sku,
    barcode: incoming.barcode !== undefined ? incoming.barcode : existing.barcode,
    customId: incoming.customId !== undefined ? incoming.customId : existing.customId,
    category: incoming.category !== undefined ? incoming.category : existing.category,
    location: incoming.location !== undefined ? incoming.location : existing.location,
    quantity: incoming.quantity !== undefined ? Number(incoming.quantity) : existing.quantity,
    reorderPoint: incoming.reorderPoint !== undefined ? Number(incoming.reorderPoint) : existing.reorderPoint,
    notes: incoming.notes !== undefined ? incoming.notes : existing.notes,
    imageUrl: incoming.imageUrl !== undefined ? incoming.imageUrl : existing.imageUrl,
    updatedAt: now,
  };
  const row = productToRow_(headers, product);
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  return product;
}

function deleteProduct_(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const productSheet = ss.getSheetByName(SHEET_PRODUCTS);
  const values = productSheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      productSheet.deleteRow(i + 1);
      break;
    }
  }

  // Also delete related movements
  const movSheet = ss.getSheetByName(SHEET_MOVEMENTS);
  const movValues = movSheet.getDataRange().getValues();
  for (let i = movValues.length - 1; i >= 1; i--) {
    if (String(movValues[i][1]) === String(id)) {
      movSheet.deleteRow(i + 1);
    }
  }
}

function rowToProduct_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i];
  });
  obj.quantity = Number(obj.quantity) || 0;
  obj.reorderPoint = Number(obj.reorderPoint) || 0;
  // Normalize empty strings to undefined for optional fields
  ['barcode', 'customId', 'category', 'location', 'notes', 'imageUrl'].forEach((k) => {
    if (obj[k] === '') obj[k] = undefined;
  });
  return obj;
}

function productToRow_(headers, product) {
  return headers.map((h) => {
    const v = product[h];
    return v === undefined || v === null ? '' : v;
  });
}

// ---------- Movements ----------
function getMovements_(productId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MOVEMENTS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  let list = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    obj.change = Number(obj.change) || 0;
    return obj;
  });
  if (productId) {
    list = list.filter((m) => String(m.productId) === String(productId));
  }
  list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return list;
}

function adjustStock_(productId, change, reason) {
  const product = getProductById_(productId);
  if (!product) throw new Error('Product not found');

  const newQty = Math.max(0, Number(product.quantity) + Number(change));
  product.quantity = newQty;
  const saved = saveProduct_(product);

  const movSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MOVEMENTS);
  movSheet.appendRow([
    Utilities.getUuid(),
    productId,
    Number(change),
    reason || '',
    new Date().toISOString(),
  ]);

  return saved;
}

// ---------- QR Mapping Config ----------
function getQRMapping_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'qrMapping') {
      try {
        return JSON.parse(values[i][1]);
      } catch (e) {
        break;
      }
    }
  }
  return {
    primaryLookupField: 'sku',
    fillFields: ['sku', 'barcode'],
    payloadParser: 'plain',
  };
}

function saveQRMapping_(config) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  const values = sheet.getDataRange().getValues();
  const json = JSON.stringify(config);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === 'qrMapping') {
      sheet.getRange(i + 1, 2).setValue(json);
      return;
    }
  }
  sheet.appendRow(['qrMapping', json]);
}
