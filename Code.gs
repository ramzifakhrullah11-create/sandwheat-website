const SCRIPT_PROP = PropertiesService.getScriptProperties();
const DEFAULT_SPREADSHEET_ID = '1V_2nHsuVY6Z5dy5SK7HOSHo2VUO4WAiyJ3Kx-eHPawo';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_PREFIX = 'SW_SESSION_';

function getSpreadsheetId() {
  return SCRIPT_PROP.getProperty('SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;
}

function getConfiguredAdminEmail() {
  return (SCRIPT_PROP.getProperty('ADMIN_EMAIL') || '').trim();
}

function getConfiguredAdminPassword() {
  return SCRIPT_PROP.getProperty('ADMIN_PASSWORD') || '';
}

function jsonResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload || {}));
  output.setMimeType(ContentService.MimeType.JSON);
  if (statusCode && statusCode >= 200 && statusCode < 400) {
    return output;
  }
  return output;
}

function makeResponse(ok, data, message, extra) {
  const response = {
    ok: !!ok,
    data: data || null,
    message: message || '',
    timestamp: new Date().toISOString()
  };
  if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach(function (key) {
      response[key] = extra[key];
    });
  }
  return response;
}

function getRequestData(e) {
  const raw = (e && e.parameter) ? e.parameter : {};
  if (raw && raw.action) {
    return raw;
  }
  try {
    if (e && e.postData && e.postData.contents) {
      const parsed = JSON.parse(e.postData.contents);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    return {};
  }
  return {};
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function safeNumber(value, defaultValue) {
  const output = Number(value);
  return Number.isFinite(output) ? output : defaultValue;
}

function safeBoolean(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return defaultValue;
}

function getSheetByName(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureSheets() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());

  const productHeaders = ['id', 'name', 'category', 'description', 'image', 'price', 'active', 'available', 'status', 'created_at', 'updated_at'];
  const cmsHeaders = ['key', 'value', 'updated_at'];
  const ordersHeaders = ['order_id', 'customer_name', 'phone', 'whatsapp', 'address', 'items', 'total', 'status', 'created_at'];

  const productsSheet = getSheetByName(ss, 'Products');
  const cmsSheet = getSheetByName(ss, 'CMS_Settings');
  const ordersSheet = getSheetByName(ss, 'Orders');

  if (productsSheet.getLastRow() === 0) {
    productsSheet.appendRow(productHeaders);
  }
  if (cmsSheet.getLastRow() === 0) {
    cmsSheet.appendRow(cmsHeaders);
  }
  if (ordersSheet.getLastRow() === 0) {
    ordersSheet.appendRow(ordersHeaders);
  }

  return {
    ss,
    productsSheet,
    cmsSheet,
    ordersSheet
  };
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach(function (header, index) {
    obj[header] = row[index] !== undefined ? row[index] : '';
  });
  return obj;
}

function getProductsFromSheet() {
  const { productsSheet } = ensureSheets();
  const values = productsSheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0];
  const rows = values.slice(1);

  return rows
    .filter(function (row) {
      return row.some(function (cell) { return String(cell || '').trim() !== ''; });
    })
    .map(function (row) {
      const obj = rowToObject(headers, row);
      return {
        id: String(obj.id || '').trim(),
        name: String(obj.name || '').trim(),
        category: String(obj.category || '').trim(),
        description: String(obj.description || '').trim(),
        image: String(obj.image || '').trim(),
        price: safeNumber(obj.price, 0),
        active: safeBoolean(obj.active, true),
        available: safeBoolean(obj.available, true),
        status: String(obj.status || '').trim() || (safeBoolean(obj.active, true) ? 'active' : 'inactive'),
        created_at: obj.created_at || '',
        updated_at: obj.updated_at || ''
      };
    });
}

function updateProductsSheet(products) {
  const { productsSheet } = ensureSheets();
  const values = productsSheet.getDataRange().getValues();
  const headers = values[0] || ['id', 'name', 'category', 'description', 'image', 'price', 'active', 'available', 'status', 'created_at', 'updated_at'];

  if (productsSheet.getLastRow() === 0) {
    productsSheet.appendRow(headers);
  }

  const target = [];
  target.push(headers);
  products.forEach(function (product) {
    target.push([
      String(product.id || '').trim(),
      String(product.name || '').trim(),
      String(product.category || '').trim(),
      String(product.description || '').trim(),
      String(product.image || '').trim(),
      safeNumber(product.price, 0),
      safeBoolean(product.active, true) ? 'TRUE' : 'FALSE',
      safeBoolean(product.available, true) ? 'TRUE' : 'FALSE',
      String(product.status || (safeBoolean(product.active, true) ? 'active' : 'inactive')).trim(),
      product.created_at || new Date().toISOString(),
      new Date().toISOString()
    ]);
  });

  const startRow = 2;
  const endRow = Math.max(startRow, startRow + target.length - 2);
  productsSheet.getRange(startRow, 1, Math.max(1, endRow - startRow + 1), headers.length).clear();
  if (target.length > 1) {
    productsSheet.getRange(1, 1, target.length, headers.length).setValues(target);
  }
}

function getCmsSettingsFromSheet() {
  const { cmsSheet } = ensureSheets();
  const values = cmsSheet.getDataRange().getValues();
  if (!values.length) return {};

  const rows = values.slice(1);
  const result = {};
  rows.forEach(function (row) {
    const key = String(row[0] || '').trim();
    const value = row[1] !== undefined ? row[1] : '';
    if (key) {
      result[key] = value;
    }
  });
  return result;
}

function saveSettingsToSheet(settingsObject) {
  const { cmsSheet } = ensureSheets();
  const existing = getCmsSettingsFromSheet();
  const now = new Date().toISOString();
  const keys = Object.keys(settingsObject || {});

  keys.forEach(function (key) {
    const value = settingsObject[key];
    const rowIndex = findRowByKey(cmsSheet, key);
    if (rowIndex) {
      cmsSheet.getRange(rowIndex, 2).setValue(value);
      cmsSheet.getRange(rowIndex, 3).setValue(now);
    } else {
      cmsSheet.appendRow([key, value, now]);
    }
    existing[key] = value;
  });

  return existing;
}

function findRowByKey(sheet, key) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][0] || '').trim() === String(key).trim()) {
      return i + 1;
    }
  }
  return null;
}

function createToken(email) {
  const token = Utilities.getUuid();
  const payload = {
    email: String(email || '').trim(),
    createdAt: Date.now()
  };
  SCRIPT_PROP.setProperty(SESSION_PREFIX + token, JSON.stringify(payload));
  return token;
}

function getSessionFromToken(token) {
  if (!token) return null;
  const raw = SCRIPT_PROP.getProperty(SESSION_PREFIX + token);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email) return null;
    const age = Date.now() - Number(parsed.createdAt || 0);
    if (age > SESSION_TTL_MS) {
      SCRIPT_PROP.deleteProperty(SESSION_PREFIX + token);
      return null;
    }
    return parsed;
  } catch (err) {
    SCRIPT_PROP.deleteProperty(SESSION_PREFIX + token);
    return null;
  }
}

function invalidateToken(token) {
  if (token) {
    SCRIPT_PROP.deleteProperty(SESSION_PREFIX + token);
  }
}

function requireAuth(requestData) {
  const token = String(requestData.token || requestData.sessionToken || '').trim();
  const session = getSessionFromToken(token);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

function parseBodyObject(data, fieldName) {
  const candidate = data && data[fieldName] ? data[fieldName] : data;
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Invalid ' + fieldName + ' payload');
  }
  return candidate;
}

function doLogin(data) {
  const email = String(data.email || '').trim();
  const password = String(data.password || '');
  const adminEmail = getConfiguredAdminEmail();
  const adminPassword = getConfiguredAdminPassword();

  if (!adminEmail || !adminPassword) {
    return makeResponse(false, null, 'Admin credentials not configured in Script Properties.', { code: 'CONFIG_MISSING' });
  }

  if (!email || !password) {
    return makeResponse(false, null, 'Email and password are required.', { code: 'INVALID_INPUT' });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return makeResponse(false, null, 'Invalid admin credentials.', { code: 'INVALID_CREDENTIALS' });
  }

  const token = createToken(email);
  return makeResponse(true, { token }, 'Login succeeded.', { token });
}

function doLogout(data) {
  const token = String(data.token || '').trim();
  invalidateToken(token);
  return makeResponse(true, null, 'Logout succeeded.');
}

function doCheckSession(data) {
  requireAuth(data);
  return makeResponse(true, { valid: true }, 'Session valid.');
}

function doGetProducts() {
  const products = getProductsFromSheet();
  return makeResponse(true, { products }, 'Products loaded.');
}

function doGetCmsSettings() {
  const settings = getCmsSettingsFromSheet();
  return makeResponse(true, { settings }, 'CMS settings loaded.');
}

function doSaveSettings(data) {
  const payload = parseBodyObject(data, 'settings');
  const normalized = {};
  Object.keys(payload).forEach(function (key) {
    const value = payload[key];
    if (key === 'showMenu' || key === 'showAbout' || key === 'showContact') {
      normalized[key] = !!value;
    } else if (key === 'revision') {
      normalized[key] = safeNumber(value, 0);
    } else if (key === 'primaryColor' || key === 'secondaryColor' || key === 'accentColor') {
      normalized[key] = String(value || '').trim();
    } else {
      normalized[key] = stripHtml(String(value !== undefined ? value : ''));
    }
  });

  const updated = saveSettingsToSheet(normalized);
  return makeResponse(true, { settings: updated }, 'Settings saved successfully.', { revision: safeNumber(updated.revision || 0, 0) });
}

function doSaveProduct(data) {
  const payload = parseBodyObject(data, 'product');
  if (!payload.name || !String(payload.name).trim()) {
    return makeResponse(false, null, 'Product name is required.', { code: 'INVALID_INPUT' });
  }

  const now = new Date().toISOString();
  const product = {
    id: String(payload.id || Utilities.getUuid()).trim(),
    name: stripHtml(String(payload.name || '')),
    category: stripHtml(String(payload.category || 'Umum')),
    description: stripHtml(String(payload.description || '')),
    image: String(payload.image || '').trim(),
    price: safeNumber(payload.price, 0),
    active: safeBoolean(payload.active, true),
    available: safeBoolean(payload.available, true),
    status: String(payload.status || (safeBoolean(payload.active, true) ? 'active' : 'inactive')).trim(),
    created_at: payload.created_at || now,
    updated_at: now
  };

  const products = getProductsFromSheet();
  const index = products.findIndex(function (item) {
    return String(item.id) === String(product.id);
  });

  if (index >= 0) {
    products[index] = { ...products[index], ...product };
  } else {
    products.push(product);
  }

  updateProductsSheet(products);
  return makeResponse(true, { product }, 'Product saved successfully.');
}

function doDeleteProduct(data) {
  const productId = String(data.id || '').trim();
  if (!productId) {
    return makeResponse(false, null, 'Product id is required.', { code: 'INVALID_INPUT' });
  }

  const products = getProductsFromSheet();
  const filtered = products.filter(function (product) {
    return String(product.id) !== String(productId);
  });

  updateProductsSheet(filtered);
  return makeResponse(true, { deletedId: productId }, 'Product deleted successfully.');
}

function doAction(action, data) {
  switch (action) {
    case 'login':
      return doLogin(data || {});
    case 'logout':
      return doLogout(data || {});
    case 'checkSession':
      requireAuth(data || {});
      return doCheckSession(data || {});
    case 'cmsSettings':
      requireAuth(data || {});
      return doGetCmsSettings();
    case 'products':
      requireAuth(data || {});
      return doGetProducts();
    case 'saveSettings':
      requireAuth(data || {});
      return doSaveSettings(data || {});
    case 'saveProduct':
      requireAuth(data || {});
      return doSaveProduct(data || {});
    case 'deleteProduct':
      requireAuth(data || {});
      return doDeleteProduct(data || {});
    default:
      return makeResponse(false, null, 'Unknown action: ' + action, { code: 'UNKNOWN_ACTION' });
  }
}

function doGet(e) {
  const request = getRequestData(e);
  const action = String(request.action || 'cmsSettings').trim();
  const payload = request;

  try {
    const response = doAction(action, payload);
    return jsonResponse(response);
  } catch (err) {
    const message = String(err && err.message ? err.message : 'Request failed');
    return jsonResponse(makeResponse(false, null, message, { code: 'REQUEST_ERROR' }));
  }
}

function doPost(e) {
  const request = getRequestData(e);
  const action = String(request.action || '').trim();

  try {
    if (!action) {
      return jsonResponse(makeResponse(false, null, 'Action is required.', { code: 'MISSING_ACTION' }));
    }

    const response = doAction(action, request);
    return jsonResponse(response);
  } catch (err) {
    const message = String(err && err.message ? err.message : 'Request failed');
    return jsonResponse(makeResponse(false, null, message, { code: 'REQUEST_ERROR' }));
  }
}

function initApp() {
  ensureSheets();
}

function onOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SANDWHEAT').addItem('Initialize sheets', 'initApp').addToUi();
}
