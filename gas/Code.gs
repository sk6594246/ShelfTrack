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
 *
 * Locations mapPosition format: "row,col,shelf" e.g. "1,2,3"
 *   - row,col required for map cell; shelf optional
 *   - empty mapPosition = off-grid
 *
 * LocationProducts weightage:
 *   - Multiplier for space consumed: effectiveSpace = qty * weightage
 *   - Default 1 when empty / missing
 *   - Example: weightage 0.5, store 50 → consumes 25 of location maxQty
 */

var SHEET_PRODUCTS = 'Products';
var SHEET_MOVEMENTS = 'Movements';
var SHEET_CONFIG = 'Config';
var SHEET_LOCATIONS = 'Locations';
var SHEET_LOCATION_PRODUCTS = 'LocationProducts';

var PRODUCT_HEADERS = [
  'id', 'name', 'sku', 'barcode', 'customId', 'category', 'location',
  'quantity', 'reorderPoint', 'notes', 'imageUrl', 'createdAt', 'updatedAt'
];

var MOVEMENT_HEADERS = ['id', 'productId', 'change', 'reason', 'createdAt'];

var LOCATION_HEADERS = [
  'id', 'name', 'code', 'mapPosition', 'maxQty', 'notes', 'createdAt', 'updatedAt'
];

var LOCATION_PRODUCT_HEADERS = ['locationId', 'productId', 'weightage'];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

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
      case 'getLocations':
        result = { locations: getAllLocations_() };
        break;
      case 'saveLocation':
        result = { location: saveLocation_(body.location) };
        break;
      case 'deleteLocation':
        deleteLocation_(body.id);
        result = { ok: true };
        break;
      case 'getLocationProducts':
        result = { links: getLocationProducts_(body.locationId) };
        break;
      case 'setLocationProducts':
        setLocationProducts_(body.locationId, body.productIds || [], body.links || null);
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

function doGet() {
  return jsonResponse_({
    status: 'ok',
    service: 'Inventory Tracker GAS',
    sheets: [SHEET_PRODUCTS, SHEET_MOVEMENTS, SHEET_CONFIG, SHEET_LOCATIONS, SHEET_LOCATION_PRODUCTS],
    time: new Date().toISOString(),
  });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_PRODUCTS, PRODUCT_HEADERS);
  ensureSheet_(ss, SHEET_MOVEMENTS, MOVEMENT_HEADERS);
  ensureSheet_(ss, SHEET_CONFIG, ['key', 'value']);
  ensureSheet_(ss, SHEET_LOCATIONS, LOCATION_HEADERS);
  ensureSheet_(ss, SHEET_LOCATION_PRODUCTS, LOCATION_PRODUCT_HEADERS);
  ensureLocationHeaders_(ss);
  ensureLocationProductHeaders_(ss);

  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  var data = configSheet.getDataRange().getValues();
  var hasMapping = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === 'qrMapping') hasMapping = true;
  }
  if (!hasMapping) {
    configSheet.appendRow([
      'qrMapping',
      JSON.stringify({
        primaryLookupField: 'sku',
        fillFields: ['sku', 'barcode'],
        payloadParser: 'json',
      }),
    ]);
  }

  SpreadsheetApp.getUi().alert(
    'Sheets initialized successfully.\n\n' +
    'Tabs: Products, Movements, Config, Locations, LocationProducts\n' +
    'Locations.mapPosition format: row,col,shelf e.g. 1,2,3\n' +
    'LocationProducts.weightage: space multiplier (default 1)'
  );
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function ensureLocationHeaders_(ss) {
  var sheet = ss.getSheetByName(SHEET_LOCATIONS);
  if (!sheet || sheet.getLastRow() < 1) return;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerStr = headers.map(String);
  for (var i = 0; i < LOCATION_HEADERS.length; i++) {
    var h = LOCATION_HEADERS[i];
    if (headerStr.indexOf(h) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(h).setFontWeight('bold');
      headers.push(h);
      headerStr.push(h);
    }
  }
}

function ensureLocationProductHeaders_(ss) {
  var sheet = ss.getSheetByName(SHEET_LOCATION_PRODUCTS);
  if (!sheet || sheet.getLastRow() < 1) return;
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var headerStr = headers.map(String);
  for (var i = 0; i < LOCATION_PRODUCT_HEADERS.length; i++) {
    var h = LOCATION_PRODUCT_HEADERS[i];
    if (headerStr.indexOf(h) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(h).setFontWeight('bold');
      headers.push(h);
      headerStr.push(h);
    }
  }
}

function parseMapPosition_(raw) {
  var out = { gridRow: null, gridCol: null, shelf: null };
  if (raw === null || raw === undefined || raw === '') return out;
  var parts = String(raw).split(',');
  function num(s) {
    var n = parseInt(String(s).trim(), 10);
    return isNaN(n) || n < 1 ? null : n;
  }
  if (parts.length >= 1) out.gridRow = num(parts[0]);
  if (parts.length >= 2) out.gridCol = num(parts[1]);
  if (parts.length >= 3) out.shelf = num(parts[2]);
  return out;
}

function formatMapPosition_(loc) {
  var r = loc.gridRow;
  var c = loc.gridCol;
  var s = loc.shelf;
  if (r == null || c == null || r === '' || c === '') {
    if (s != null && s !== '') return ',,' + s;
    return '';
  }
  var parts = [String(r), String(c)];
  if (s != null && s !== '') parts.push(String(s));
  return parts.join(',');
}

function getAllLocations_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOCATIONS);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    var pos = parseMapPosition_(obj.mapPosition);
    list.push({
      id: String(obj.id),
      name: String(obj.name || ''),
      code: obj.code ? String(obj.code) : undefined,
      notes: obj.notes ? String(obj.notes) : undefined,
      gridRow: pos.gridRow || undefined,
      gridCol: pos.gridCol || undefined,
      shelf: pos.shelf || undefined,
      mapPosition: obj.mapPosition ? String(obj.mapPosition) : '',
      maxQty: obj.maxQty !== '' && obj.maxQty != null ? Number(obj.maxQty) : undefined,
      createdAt: obj.createdAt ? String(obj.createdAt) : '',
      updatedAt: obj.updatedAt ? String(obj.updatedAt) : '',
    });
  }
  return list;
}

function saveLocation_(incoming) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOCATIONS);
  if (!sheet) throw new Error('Locations sheet missing — run initializeSheets()');
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var now = new Date().toISOString();

  var id = incoming.id;
  var rowIndex = -1;
  if (id) {
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(id)) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  var mapPos = incoming.mapPosition;
  if (mapPos === undefined || mapPos === null) {
    mapPos = formatMapPosition_({
      gridRow: incoming.gridRow,
      gridCol: incoming.gridCol,
      shelf: incoming.shelf,
    });
  }
  var parsed = parseMapPosition_(mapPos);

  var loc = {
    id: id || Utilities.getUuid(),
    name: incoming.name || '',
    code: incoming.code || '',
    mapPosition: mapPos || '',
    maxQty: incoming.maxQty != null && incoming.maxQty !== '' ? Number(incoming.maxQty) : '',
    notes: incoming.notes || '',
    gridRow: parsed.gridRow || undefined,
    gridCol: parsed.gridCol || undefined,
    shelf: parsed.shelf || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (rowIndex === -1) {
    sheet.appendRow(locationToRow_(headers, loc));
    return loc;
  }

  var existing = {};
  for (var j = 0; j < headers.length; j++) {
    existing[headers[j]] = values[rowIndex - 1][j];
  }
  loc.createdAt = existing.createdAt ? String(existing.createdAt) : now;
  loc.updatedAt = now;
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([locationToRow_(headers, loc)]);
  return loc;
}

function locationToRow_(headers, loc) {
  return headers.map(function (h) {
    if (h === 'mapPosition') return loc.mapPosition || formatMapPosition_(loc) || '';
    if (h === 'maxQty') return loc.maxQty != null && loc.maxQty !== '' ? loc.maxQty : '';
    var v = loc[h];
    return v === undefined || v === null ? '' : v;
  });
}

function deleteLocation_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOCATIONS);
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  var lp = ss.getSheetByName(SHEET_LOCATION_PRODUCTS);
  if (!lp) return;
  var lpValues = lp.getDataRange().getValues();
  for (var k = lpValues.length - 1; k >= 1; k--) {
    if (String(lpValues[k][0]) === String(id)) {
      lp.deleteRow(k + 1);
    }
  }
}

function getLocationProducts_(locationId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureLocationProductHeaders_(ss);
  var sheet = ss.getSheetByName(SHEET_LOCATION_PRODUCTS);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var locIdx = headers.indexOf('locationId');
  var prodIdx = headers.indexOf('productId');
  var wIdx = headers.indexOf('weightage');
  if (locIdx < 0) locIdx = 0;
  if (prodIdx < 0) prodIdx = 1;
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var locId = String(values[i][locIdx] || '');
    var prodId = String(values[i][prodIdx] || '');
    if (!locId || !prodId) continue;
    if (locationId && locId !== String(locationId)) continue;
    var weightage = undefined;
    if (wIdx >= 0 && values[i][wIdx] !== '' && values[i][wIdx] != null) {
      var w = Number(values[i][wIdx]);
      if (isFinite(w) && w > 0) weightage = w;
    }
    var link = { locationId: locId, productId: prodId };
    if (weightage != null) link.weightage = weightage;
    list.push(link);
  }
  return list;
}

function setLocationProducts_(locationId, productIds, links) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureLocationProductHeaders_(ss);
  var sheet = ss.getSheetByName(SHEET_LOCATION_PRODUCTS);
  if (!sheet) throw new Error('LocationProducts sheet missing — run initializeSheets()');
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(locationId)) {
      sheet.deleteRow(i + 1);
    }
  }

  if (links && links.length) {
    for (var j = 0; j < links.length; j++) {
      var L = links[j];
      var pid = L && L.productId;
      if (!pid) continue;
      var w = L.weightage;
      var wVal = (w != null && isFinite(Number(w)) && Number(w) > 0) ? Number(w) : '';
      sheet.appendRow([locationId, pid, wVal]);
    }
    return;
  }

  for (var k = 0; k < productIds.length; k++) {
    var pid2 = productIds[k];
    if (pid2) sheet.appendRow([locationId, pid2, '']);
  }
}

function getAllProducts_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row) {
    return rowToProduct_(headers, row);
  });
}

function getProductById_(id) {
  var products = getAllProducts_();
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(id)) return products[i];
  }
  return null;
}

function saveProduct_(incoming) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUCTS);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var now = new Date().toISOString();
  var id = incoming.id;
  var rowIndex = -1;
  if (id) {
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(id)) {
        rowIndex = i + 1;
        break;
      }
    }
  }
  if (rowIndex === -1) {
    id = id || Utilities.getUuid();
    var product = {
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
  var existing = rowToProduct_(headers, values[rowIndex - 1]);
  var product2 = {
    id: existing.id,
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
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([productToRow_(headers, product2)]);
  return product2;
}

function deleteProduct_(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var productSheet = ss.getSheetByName(SHEET_PRODUCTS);
  var values = productSheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      productSheet.deleteRow(i + 1);
      break;
    }
  }
  var movSheet = ss.getSheetByName(SHEET_MOVEMENTS);
  var movValues = movSheet.getDataRange().getValues();
  for (var j = movValues.length - 1; j >= 1; j--) {
    if (String(movValues[j][1]) === String(id)) {
      movSheet.deleteRow(j + 1);
    }
  }
}

function rowToProduct_(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }
  obj.quantity = Number(obj.quantity) || 0;
  obj.reorderPoint = Number(obj.reorderPoint) || 0;
  ['barcode', 'customId', 'category', 'location', 'notes', 'imageUrl'].forEach(function (k) {
    if (obj[k] === '') obj[k] = undefined;
  });
  return obj;
}

function productToRow_(headers, product) {
  return headers.map(function (h) {
    var v = product[h];
    return v === undefined || v === null ? '' : v;
  });
}

function getMovements_(productId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MOVEMENTS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var list = values.slice(1).map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
    obj.change = Number(obj.change) || 0;
    return obj;
  });
  if (productId) {
    list = list.filter(function (m) {
      return String(m.productId) === String(productId);
    });
  }
  list.sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
  return list;
}

function adjustStock_(productId, change, reason) {
  var product = getProductById_(productId);
  if (!product) throw new Error('Product not found');
  var newQty = Math.max(0, Number(product.quantity) + Number(change));
  product.quantity = newQty;
  var saved = saveProduct_(product);
  var movSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MOVEMENTS);
  movSheet.appendRow([
    Utilities.getUuid(),
    productId,
    Number(change),
    reason || '',
    new Date().toISOString(),
  ]);
  return saved;
}

function getQRMapping_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
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
    payloadParser: 'json',
  };
}

function saveQRMapping_(config) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  var values = sheet.getDataRange().getValues();
  var json = JSON.stringify(config);
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === 'qrMapping') {
      sheet.getRange(i + 1, 2).setValue(json);
      return;
    }
  }
  sheet.appendRow(['qrMapping', json]);
}
