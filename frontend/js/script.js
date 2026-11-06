// ==========================================================
// ShopEase - E-Commerce Store Frontend Logic
// Robust API Client, Product Catalog, Cart, Auth & Orders
// ==========================================================

const CART_STORAGE_KEY = 'shopease_cart';
const AUTH_TOKEN_KEY = 'shopease_token';
const AUTH_USER_KEY = 'shopease_user';

// Helper: Format price as INR currency
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Helper: Escape HTML strings for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ==========================================================
// Unified, Resilient API Client & Mock Engine (Live Server Support)
// ==========================================================

const API_BASE_STORAGE_KEY = 'shopease_active_api_base';
const LOCAL_PRODUCTS_KEY = 'shopease_mock_products';
const LOCAL_USERS_KEY = 'shopease_mock_users';
const LOCAL_ORDERS_KEY = 'shopease_mock_orders';

// Helper: Determine if current environment is a local developer machine
function isLocalEnvironment() {
  if (typeof window === 'undefined' || !window.location) return true;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || window.location.protocol === 'file:';
}

// ==========================================================
// Standalone / Live Server Local Database Handlers
// ==========================================================

function getLocalProducts() {
  try {
    const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  const defaultList = (typeof window !== 'undefined' && Array.isArray(window.SHOPEASE_MOCK_PRODUCTS))
    ? window.SHOPEASE_MOCK_PRODUCTS
    : [];

  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(defaultList));
  } catch (e) {}

  return defaultList;
}

function saveLocalProducts(products) {
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {}
}

function getLocalUsers() {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

function getLocalOrders() {
  try {
    const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalOrders(orders) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {}
}

// Standalone Mock API Engine to fulfill requests seamlessly under Live Server
async function handleLocalMockApi(endpoint, options = {}) {
  await new Promise((r) => setTimeout(r, 40));

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = cleanEndpoint.split('?');
  const urlParams = new URLSearchParams(queryString || '');

  // 1. GET /products or /products?search=...
  if (method === 'GET' && path === '/products') {
    let products = getLocalProducts();
    const search = urlParams.get('search') || urlParams.get('q') || '';
    if (search && search.trim()) {
      const qLower = search.trim().toLowerCase();
      products = products.filter((p) => p && (
        (p.name && p.name.toLowerCase().includes(qLower)) ||
        (p.category && p.category.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower))
      ));
    }
    const category = urlParams.get('category');
    if (category && category !== 'All') {
      products = products.filter((p) => p && p.category && p.category.toLowerCase() === category.toLowerCase());
    }
    return {
      ok: true,
      status: 200,
      data: products,
      isNetworkError: false,
      isAborted: false
    };
  }

  // 2. GET /products/:id
  if (method === 'GET' && path.startsWith('/products/')) {
    const idStr = path.replace('/products/', '').trim();
    const id = parseInt(idStr, 10);
    const products = getLocalProducts();
    const product = products.find((p) => p.id === id || String(p.id) === idStr);
    if (product) {
      return {
        ok: true,
        status: 200,
        data: product,
        isNetworkError: false,
        isAborted: false
      };
    }
    return {
      ok: false,
      status: 404,
      message: 'Product not found',
      isNetworkError: false,
      isAborted: false
    };
  }

  // 3. POST /auth/register
  if (method === 'POST' && path === '/auth/register') {
    let body = {};
    try { body = JSON.parse(options.body || '{}'); } catch (e) {}
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return { ok: false, status: 400, message: 'Please provide name, email, and password.' };
    }
    const users = getLocalUsers();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.find((u) => u.email === normalizedEmail)) {
      return { ok: false, status: 400, message: 'User already exists with this email address' };
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveLocalUsers(users);
    return {
      ok: true,
      status: 201,
      message: 'Registration successful! Redirecting to login...',
      data: {
        token: 'mock_jwt_' + Date.now(),
        user: { name: newUser.name, email: newUser.email }
      }
    };
  }

  // 4. POST /auth/login
  if (method === 'POST' && path === '/auth/login') {
    let body = {};
    try { body = JSON.parse(options.body || '{}'); } catch (e) {}
    const { email, password } = body;
    if (!email || !password) {
      return { ok: false, status: 400, message: 'Please enter both email and password.' };
    }
    const normalizedEmail = email.trim().toLowerCase();
    const users = getLocalUsers();
    let user = users.find((u) => u.email === normalizedEmail);

    if (user) {
      if (user.password && user.password !== password) {
        return { ok: false, status: 401, message: 'Invalid email or password.' };
      }
    } else {
      // Auto-create customer user for demo convenience
      const rawName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
      const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      user = {
        id: 'usr_' + Date.now(),
        name: displayName || 'Customer',
        email: normalizedEmail,
        password,
        role: 'customer',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveLocalUsers(users);
    }

    return {
      ok: true,
      status: 200,
      message: 'Login successful',
      data: {
        token: 'mock_jwt_' + Date.now(),
        user: { name: user.name, email: user.email }
      }
    };
  }

  // 5. POST /orders
  if (method === 'POST' && path === '/orders') {
    let body = {};
    try { body = JSON.parse(options.body || '{}'); } catch (e) {}
    const { items, shippingAddress, phone } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, status: 400, message: 'Your order must contain at least one item.' };
    }

    const authUser = getAuthUser();
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const orderId = 'ORD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);

    const newOrder = {
      id: orderId,
      userEmail: authUser ? authUser.email : 'customer@shopease.com',
      userName: authUser ? authUser.name : (shippingAddress ? shippingAddress.fullName : 'Customer'),
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        quantity: Number(i.quantity),
        image: i.image
      })),
      shippingAddress: shippingAddress || {},
      phone: phone || '',
      totalAmount,
      status: 'Placed',
      createdAt: new Date().toISOString()
    };

    const orders = getLocalOrders();
    orders.unshift(newOrder);
    saveLocalOrders(orders);

    // Decrement stock in local products
    const products = getLocalProducts();
    items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.id);
      if (p && typeof p.stock === 'number') {
        p.stock = Math.max(0, p.stock - (Number(item.quantity) || 1));
      }
    });
    saveLocalProducts(products);

    return {
      ok: true,
      status: 201,
      message: 'Order created successfully',
      data: { order: newOrder }
    };
  }

  // 6. GET /orders
  if (method === 'GET' && path === '/orders') {
    const authUser = getAuthUser();
    const allOrders = getLocalOrders();
    const userOrders = authUser
      ? allOrders.filter((o) => !o.userEmail || o.userEmail.toLowerCase() === authUser.email.toLowerCase())
      : allOrders;

    return {
      ok: true,
      status: 200,
      data: userOrders,
      isNetworkError: false,
      isAborted: false
    };
  }

  // 7. GET /orders/:id
  if (method === 'GET' && path.startsWith('/orders/')) {
    const orderId = path.replace('/orders/', '').trim();
    const allOrders = getLocalOrders();
    const order = allOrders.find((o) => String(o.id) === String(orderId));
    if (order) {
      return {
        ok: true,
        status: 200,
        data: order,
        isNetworkError: false,
        isAborted: false
      };
    }
    return {
      ok: false,
      status: 404,
      message: 'Order not found',
      isNetworkError: false,
      isAborted: false
    };
  }

  // 8. Health / Test check
  if (path.includes('/health') || path.includes('/test')) {
    return {
      ok: true,
      status: 200,
      data: {
        status: 'healthy',
        mode: 'standalone',
        message: 'ShopEase Standalone Engine Active'
      }
    };
  }

  return {
    ok: false,
    status: 404,
    message: 'Endpoint not found',
    isNetworkError: false
  };
}

// Discover candidate base URLs based on configuration, current location, and deployment environment
function getApiBaseCandidates() {
  const candidates = [];
  const isBrowser = typeof window !== 'undefined' && window.location;
  const isFile = isBrowser && window.location.protocol === 'file:';
  const isLocal = isLocalEnvironment();

  // 1. Explicit public backend URL configured via window.SHOPEASE_CONFIG (from js/config.js)
  if (typeof window !== 'undefined' && window.SHOPEASE_CONFIG && typeof window.SHOPEASE_CONFIG.API_BASE_URL === 'string') {
    const configured = window.SHOPEASE_CONFIG.API_BASE_URL.trim();
    if (configured && (configured.startsWith('http://') || configured.startsWith('https://') || configured.startsWith('/'))) {
      candidates.push(configured.replace(/\/+$/, ''));
    }
  }

  // 2. Check for manual runtime override in localStorage
  try {
    const runtimeOverride = localStorage.getItem('shopease_custom_api_url');
    if (runtimeOverride && typeof runtimeOverride === 'string' && (runtimeOverride.startsWith('http://') || runtimeOverride.startsWith('https://'))) {
      const cleanOverride = runtimeOverride.trim().replace(/\/+$/, '');
      if (isLocal || (!cleanOverride.includes('localhost') && !cleanOverride.includes('127.0.0.1'))) {
        candidates.push(cleanOverride);
      }
    }
  } catch (e) {}

  // 3. Previously verified active base URL stored in sessionStorage
  try {
    const savedBase = sessionStorage.getItem(API_BASE_STORAGE_KEY);
    if (savedBase && typeof savedBase === 'string' && (savedBase.startsWith('http') || savedBase.startsWith('/'))) {
      const cleanSaved = savedBase.trim().replace(/\/+$/, '');
      if (isLocal || (!cleanSaved.includes('localhost') && !cleanSaved.includes('127.0.0.1'))) {
        candidates.push(cleanSaved);
      }
    }
  } catch (e) {}

  // 4. Same-origin or hosting environment detection
  if (isBrowser && !isFile) {
    const loc = window.location;
    if (!isLocal) {
      candidates.push(`${loc.origin}/api`);
    } else {
      if (loc.port === '3000' || loc.port === '') {
        candidates.push(`${loc.origin}/api`);
      } else {
        candidates.push(`${loc.protocol}//${loc.hostname}:3000/api`);
      }
    }
  }

  // 5. Local loopback candidates
  if (isLocal) {
    candidates.push('http://127.0.0.1:3000/api');
    candidates.push('http://localhost:3000/api');
  }

  return [...new Set(candidates)];
}

let activeApiBaseUrl = null;
let backendAvailability = 'unknown'; // 'unknown' | 'online' | 'offline'

// Fast probe to detect if Node/Express server is active on port 3000
async function probeBackendAvailable() {
  if (backendAvailability !== 'unknown') return backendAvailability === 'online';
  const isFile = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  if (isFile) {
    backendAvailability = 'offline';
    return false;
  }

  try {
    const probeCtrl = new AbortController();
    const timer = setTimeout(() => probeCtrl.abort(), 400);
    const host = window.location.hostname || '127.0.0.1';
    const res = await fetch(`http://${host}:3000/api/health`, {
      method: 'GET',
      signal: probeCtrl.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      backendAvailability = 'online';
      activeApiBaseUrl = `http://${host}:3000/api`;
      return true;
    }
  } catch (e) {}

  backendAvailability = 'offline';
  return false;
}

// Core API fetch with candidate fallbacks, timeout, and seamless Live Server Standalone fallback
async function apiFetch(endpoint, options = {}, retriesRemaining = 1) {
  const isFile = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  const isLocal = isLocalEnvironment();

  // If local file protocol or known offline backend, immediately use Standalone Mock API Engine
  if (isFile || backendAvailability === 'offline') {
    return handleLocalMockApi(endpoint, options);
  }

  // If on Live Server (port !== 3000), do a fast probe on first call
  if (isLocal && typeof window !== 'undefined' && window.location && window.location.port !== '3000' && window.location.port !== '') {
    if (backendAvailability === 'unknown') {
      const isOnline = await probeBackendAvailable();
      if (!isOnline) {
        return handleLocalMockApi(endpoint, options);
      }
    }
  }

  const timeoutMs = options.timeoutMs || (activeApiBaseUrl ? 4000 : 2500);
  const externalSignal = options.signal;
  const cleanOptions = { ...options };
  delete cleanOptions.timeoutMs;
  delete cleanOptions.signal;

  const candidates = activeApiBaseUrl
    ? [activeApiBaseUrl, ...getApiBaseCandidates().filter((c) => c !== activeApiBaseUrl)]
    : getApiBaseCandidates();

  let lastError = null;

  for (const base of candidates) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${base}${cleanEndpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        return { ok: false, isAborted: true, isNetworkError: false, error: new Error('Request aborted') };
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const response = await fetch(url, { ...cleanOptions, signal: controller.signal });
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      activeApiBaseUrl = base;
      backendAvailability = 'online';
      try {
        sessionStorage.setItem(API_BASE_STORAGE_KEY, base);
      } catch (e) {}

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          data,
          isNetworkError: false,
          isAborted: false
        };
      }

      const isClientError = response.status >= 400 && response.status < 500;
      const serverMsg = (data && data.message) ? data.message : `HTTP ${response.status}`;

      if (!isClientError && retriesRemaining > 0) {
        await new Promise((r) => setTimeout(r, 300));
        return apiFetch(endpoint, { ...options, signal: externalSignal }, retriesRemaining - 1);
      }

      return {
        ok: false,
        status: response.status,
        data,
        message: serverMsg,
        isNetworkError: false,
        isAborted: false,
        error: new Error(serverMsg)
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }

      if (externalSignal && externalSignal.aborted) {
        return { ok: false, isAborted: true, isNetworkError: false, error: err };
      }

      lastError = err;
    }
  }

  // If backend network request failed and we are running in local environment (Live Server):
  // Seamlessly fall back to Standalone Mock API Engine
  if (isLocal) {
    backendAvailability = 'offline';
    return handleLocalMockApi(endpoint, options);
  }

  return {
    ok: false,
    status: 0,
    data: null,
    message: lastError ? lastError.message : 'Unable to connect to the server.',
    isNetworkError: true,
    isFileProtocol: isFile,
    isAborted: false,
    error: lastError
  };
}

// Unified Helper: Render Server Offline / Connection Error Card
function renderServerOfflineCard(containerEl, retryCallback, options = {}) {
  if (!containerEl) return;
  const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  const customMessage = options.message || '';
  const backLink = options.showBackLink ? `<a href="index.html" class="btn btn-secondary">Back to Products</a>` : '';

  if (isFileProtocol) {
    containerEl.innerHTML = `
      <div class="api-error-card server-offline-card">
        <div class="error-icon" style="font-size: 2.2rem; margin-bottom: 8px;">🌐</div>
        <h3 style="margin-bottom: 8px; color: #b91c1c; font-size: 1.25rem;">Browser Security Notice (Local File System)</h3>
        <p style="margin-bottom: 12px; color: var(--text-secondary);">
          You opened ShopEase directly from your local file system (<code>file:///</code>). Modern web browsers restrict API requests from local file paths due to cross-origin security policies.
        </p>
        <div style="background: #f1f5f9; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px 16px; margin: 12px 0 16px 0; text-align: left; font-size: 0.9rem;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 6px;">How to access ShopEase:</strong>
          <p style="margin: 0; color: var(--text-secondary); line-height: 1.5;">
            Please open the application using its public hosting URL in your web browser.
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="retry-offline-btn">Retry Connection</button>
          ${backLink}
        </div>
      </div>
    `;
  } else {
    containerEl.innerHTML = `
      <div class="api-error-card server-offline-card">
        <div class="error-icon" style="font-size: 2.2rem; margin-bottom: 8px;">☁️</div>
        <h3 style="margin-bottom: 8px; color: #b91c1c; font-size: 1.25rem;">Unable to Connect to Server</h3>
        <p style="margin-bottom: 12px; color: var(--text-secondary);">${escapeHtml(customMessage || 'The ShopEase backend service is currently offline or unreachable.')}</p>
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; margin: 12px 0 16px 0; text-align: left; font-size: 0.9rem;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">Connection Status:</strong>
          <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">
            If the backend is hosted on a free cloud tier (such as Render), it spins down after periods of inactivity and may take 30–60 seconds to wake up. Please click below to reconnect.
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="retry-offline-btn" style="padding: 10px 24px;">Retry Connection</button>
          ${backLink}
        </div>
      </div>
    `;
  }

  const retryBtn = containerEl.querySelector('#retry-offline-btn');
  if (retryBtn && typeof retryCallback === 'function') {
    retryBtn.addEventListener('click', retryCallback);
  }
}

// ==========================================================
// LocalStorage Cart Utilities
// ==========================================================

function getCart() {
  try {
    const rawData = localStorage.getItem(CART_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (err) {
    console.error('Failed to read cart from localStorage:', err);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error('Failed to save cart to localStorage:', err);
  }
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const totalCount = cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  const cartNavLinks = document.querySelectorAll('#nav-cart-link');
  cartNavLinks.forEach((link) => {
    link.textContent = `Cart (${totalCount})`;
  });
}

function addToCart(product, quantityToAdd) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === product.id);
  const numericPrice = typeof product.price === 'number'
    ? product.price
    : parseInt(String(product.price).replace(/[^0-9]/g, ''), 10);

  if (existingItem) {
    existingItem.quantity += quantityToAdd;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: numericPrice,
      image: product.image,
      quantity: quantityToAdd
    });
  }

  saveCart(cart);
}

// ==========================================================
// Product Catalog & Search (index.html)
// ==========================================================

let activeProductsAbortController = null;

async function renderProducts(searchQuery = '', isRetry = false) {
  const productsContainer = document.getElementById('products-grid');
  if (!productsContainer) return;

  const countContainer = document.getElementById('search-results-count');
  const clearBtn = document.getElementById('search-clear-btn');
  const searchInput = document.getElementById('product-search-input') || document.getElementById('search-input');

  const trimmedQuery = String(searchQuery).trim();
  if (clearBtn) {
    clearBtn.style.display = trimmedQuery ? 'inline-flex' : 'none';
  }

  // Cancel prior in-flight product fetch if user is typing or navigating
  if (activeProductsAbortController) {
    activeProductsAbortController.abort();
  }
  activeProductsAbortController = new AbortController();
  const currentSignal = activeProductsAbortController.signal;

  // Loading state
  productsContainer.innerHTML = `
    <div class="loading-state">
      <p>Loading products...</p>
    </div>
  `;

  const queryParam = trimmedQuery ? `?search=${encodeURIComponent(trimmedQuery)}` : '';
  const result = await apiFetch(`/products${queryParam}`, { signal: currentSignal });

  // If this fetch was superseded or cancelled, silently exit without modifying UI
  if (result.isAborted) {
    return;
  }

  // Handle Backend Network / Connection Failure
  if (result.isNetworkError) {
    if (countContainer) countContainer.style.display = 'none';
    renderServerOfflineCard(productsContainer, () => renderProducts(searchQuery, true));
    return;
  }

  // Handle HTTP error (e.g. 503 database reconnecting or 500)
  if (!result.ok) {
    if (countContainer) countContainer.style.display = 'none';
    const msg = result.message || 'Unable to load products at this time.';
    productsContainer.innerHTML = `
      <div class="api-error-card">
        <p style="margin-bottom: 16px;">${escapeHtml(msg)}</p>
        <button type="button" class="btn btn-secondary" id="retry-products-btn">Retry</button>
      </div>
    `;
    const retryBtn = productsContainer.querySelector('#retry-products-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        renderProducts(searchQuery, true);
      });
    }
    return;
  }

  let products = Array.isArray(result.data) ? result.data : [];
  productsContainer.innerHTML = '';

  // Guarantee case-insensitive, partial-name or category matching across the complete product collection
  if (trimmedQuery) {
    const qLower = trimmedQuery.toLowerCase();
    products = products.filter((p) => p && (
      (p.name && p.name.toLowerCase().includes(qLower)) ||
      (p.category && p.category.toLowerCase().includes(qLower))
    ));
  }

  // Display total number of matching products
  if (countContainer) {
    countContainer.style.display = 'block';
    if (trimmedQuery) {
      if (products.length === 0) {
        countContainer.innerHTML = `0 products found for "<strong>${escapeHtml(trimmedQuery)}</strong>". No products found. Try another search.`;
      } else {
        countContainer.innerHTML = `Showing <strong>${products.length}</strong> matching product${products.length === 1 ? '' : 's'} for "<strong>${escapeHtml(trimmedQuery)}</strong>"`;
      }
    } else {
      countContainer.innerHTML = `Showing all <strong>${products.length}</strong> products`;
    }
  }

  // If no products match
  if (products.length === 0) {
    if (trimmedQuery) {
      productsContainer.innerHTML = `
        <div class="no-products-card" id="no-products-message">
          <div class="no-products-icon">🔍</div>
          <h2 class="no-products-title">No products found. Try another search.</h2>
          <p class="no-products-subtitle">We couldn't find any products matching "<strong>${escapeHtml(trimmedQuery)}</strong>".</p>
          <button type="button" class="btn btn-secondary" id="reset-search-btn">View All Products</button>
        </div>
      `;
      const resetBtn = productsContainer.querySelector('#reset-search-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          renderProducts('');
        });
      }
    } else {
      productsContainer.innerHTML = `
        <div class="api-error-card">
          <p>No products available at this time.</p>
        </div>
      `;
    }
    return;
  }

  // Display EVERY matching product in the grid
  products.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';

    card.innerHTML = `
      <div class="product-image-container">
        <img 
          src="${product.image}" 
          alt="${product.name}" 
          class="product-image"
          loading="lazy"
          onerror="this.onerror=null; this.src='https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(product.name)}';"
        />
        <span class="product-category-tag">${product.category}</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-description">${product.shortDescription || product.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <a href="product-details.html?id=${product.id}" class="btn btn-details">View Details</a>
        </div>
      </div>
    `;

    productsContainer.appendChild(card);
  });
}

function initProductSearch() {
  const searchForm = document.getElementById('product-search-form') || document.getElementById('search-form');
  const searchInput = document.getElementById('product-search-input') || document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  if (!searchInput) return;

  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('search') || urlParams.get('q') || '';
  if (initialQuery && !searchInput.value) {
    searchInput.value = initialQuery;
  }

  if (searchInput.dataset.initialized === 'true') {
    return;
  }
  searchInput.dataset.initialized = 'true';

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value;
      renderProducts(query);
    });
  }

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    if (clearBtn) {
      clearBtn.style.display = query.trim() ? 'inline-flex' : 'none';
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderProducts(query);
    }, 250);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      renderProducts('');
    });
  }
}

// ==========================================================
// Product Details Page (product-details.html)
// ==========================================================

async function renderProductDetails() {
  const container = document.getElementById('product-details-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const rawId = urlParams.get('id');
  const productId = parseInt(rawId, 10);

  if (isNaN(productId)) {
    container.innerHTML = `
      <div class="not-found-card">
        <div class="not-found-icon">⚠️</div>
        <h2 class="not-found-title">Product not found</h2>
        <p class="not-found-text">The product you requested does not exist or has an invalid ID.</p>
        <a href="index.html" class="btn btn-secondary">Back to Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <p>Loading product details...</p>
    </div>
  `;

  const result = await apiFetch(`/products/${productId}`);

  if (result.isAborted) return;

  if (result.isNetworkError) {
    renderServerOfflineCard(container, renderProductDetails, { showBackLink: true });
    return;
  }

  if (result.status === 404) {
    container.innerHTML = `
      <div class="not-found-card">
        <div class="not-found-icon">⚠️</div>
        <h2 class="not-found-title">Product not found</h2>
        <p class="not-found-text">The product you requested does not exist.</p>
        <a href="index.html" class="btn btn-secondary">Back to Products</a>
      </div>
    `;
    return;
  }

  if (!result.ok) {
    container.innerHTML = `
      <div class="api-error-card">
        <p style="margin-bottom: 16px;">${escapeHtml(result.message || 'Unable to load product details.')}</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="retry-details-btn">Retry</button>
          <a href="index.html" class="btn btn-secondary">Back to Products</a>
        </div>
      </div>
    `;
    const retryBtn = container.querySelector('#retry-details-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', renderProductDetails);
    }
    return;
  }

  const product = result.data;

  container.innerHTML = `
    <div class="details-card">
      <div class="details-image-wrapper">
        <img 
          src="${product.image}" 
          alt="${product.name}" 
          class="details-image"
          onerror="this.onerror=null; this.src='https://placehold.co/600x400/2563eb/ffffff?text=${encodeURIComponent(product.name)}';"
        />
      </div>

      <div class="details-content">
        <h1 class="details-title">${product.name}</h1>
        <p class="details-category">Category: <span>${product.category}</span></p>
        <p class="details-meta" style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-secondary);">
          <span style="color: #f59e0b; font-weight: 700;">★ ${product.rating || 4.5}</span> / 5
          <span style="margin: 0 8px; color: var(--border-color);">•</span>
          <span style="color: #166534; font-weight: 600;">In Stock: ${product.stock || 25} units available</span>
        </p>
        <p class="details-price">${formatCurrency(product.price)}</p>
        <p class="details-description">${product.description || product.shortDescription}</p>

        <!-- Quantity Selector -->
        <div class="quantity-section">
          <label class="quantity-label">Quantity:</label>
          <div class="quantity-controls">
            <button type="button" class="qty-btn" id="qty-decrease" aria-label="Decrease quantity">−</button>
            <span class="qty-value" id="qty-value">1</span>
            <button type="button" class="qty-btn" id="qty-increase" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="details-actions">
          <button type="button" class="btn btn-primary" id="add-to-cart-btn">Add to Cart</button>
          <a href="index.html" class="btn btn-secondary">Back to Products</a>
        </div>

        <!-- Success Message -->
        <div class="cart-notice" id="cart-notice" style="display: none;">
          Product added to cart successfully!
        </div>
      </div>
    </div>
  `;

  let selectedQty = 1;
  const qtyValueEl = container.querySelector('#qty-value') || document.getElementById('qty-value');
  const qtyDecreaseBtn = container.querySelector('#qty-decrease') || document.getElementById('qty-decrease');
  const qtyIncreaseBtn = container.querySelector('#qty-increase') || document.getElementById('qty-increase');

  if (qtyDecreaseBtn) {
    qtyDecreaseBtn.addEventListener('click', () => {
      if (selectedQty > 1) {
        selectedQty -= 1;
        if (qtyValueEl) qtyValueEl.textContent = selectedQty;
      }
    });
  }

  if (qtyIncreaseBtn) {
    qtyIncreaseBtn.addEventListener('click', () => {
      selectedQty += 1;
      if (qtyValueEl) qtyValueEl.textContent = selectedQty;
    });
  }

  const addToCartBtn = container.querySelector('#add-to-cart-btn') || document.getElementById('add-to-cart-btn');
  const cartNoticeEl = container.querySelector('#cart-notice') || document.getElementById('cart-notice');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      addToCart(product, selectedQty);

      if (cartNoticeEl) {
        cartNoticeEl.textContent = 'Product added to cart successfully!';
        cartNoticeEl.style.display = 'block';

        setTimeout(() => {
          cartNoticeEl.style.display = 'none';
        }, 3000);
      }
    });
  }
}

// ==========================================================
// Shopping Cart Page (cart.html)
// ==========================================================

function renderCart() {
  const cartContainer = document.getElementById('cart-container');
  if (!cartContainer) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart-card">
        <div class="empty-cart-icon">🛒</div>
        <h2 class="empty-cart-title">Your cart is empty.</h2>
        <p class="empty-cart-text">Looks like you haven't added any items to your shopping cart yet.</p>
        <a href="index.html" class="btn btn-primary">Continue Shopping</a>
      </div>
    `;
    return;
  }

  const totalItems = cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  let itemsHtml = '';
  cart.forEach((item) => {
    const itemSubtotal = item.price * item.quantity;
    itemsHtml += `
      <div class="cart-item-row" data-id="${item.id}">
        <div class="cart-col-product">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="cart-item-img"
            onerror="this.onerror=null; this.src='https://placehold.co/100x100/2563eb/ffffff?text=${encodeURIComponent(item.name)}';"
          />
          <div class="cart-item-meta">
            <h4 class="cart-item-name">${item.name}</h4>
            <span class="cart-item-unit-price">${formatCurrency(item.price)}</span>
          </div>
        </div>

        <div class="cart-col-price">
          ${formatCurrency(item.price)}
        </div>

        <div class="cart-col-quantity">
          <div class="cart-qty-controls">
            <button type="button" class="cart-qty-btn cart-qty-dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button type="button" class="cart-qty-btn cart-qty-inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div class="cart-col-subtotal">
          ${formatCurrency(itemSubtotal)}
        </div>

        <div class="cart-col-action">
          <button type="button" class="btn-remove" data-id="${item.id}" title="Remove item">Remove</button>
        </div>
      </div>
    `;
  });

  cartContainer.innerHTML = `
    <div class="cart-layout">
      <div class="cart-table-wrapper">
        <div class="cart-table-header">
          <span class="header-product">Product</span>
          <span class="header-price">Price</span>
          <span class="header-quantity">Quantity</span>
          <span class="header-subtotal">Subtotal</span>
          <span class="header-action">Action</span>
        </div>
        <div class="cart-items-list">
          ${itemsHtml}
        </div>
      </div>

      <div class="cart-summary-card">
        <h3 class="summary-title">Cart Summary</h3>
        <div class="summary-line">
          <span>Total Items:</span>
          <strong>${totalItems}</strong>
        </div>
        <div class="summary-line summary-total-line">
          <span>Total Amount:</span>
          <strong class="summary-subtotal-price">${formatCurrency(subtotal)}</strong>
        </div>
        <div class="summary-actions">
          <a href="index.html" class="btn btn-secondary btn-block">Continue Shopping</a>
          <button type="button" class="btn btn-primary btn-block" id="proceed-checkout-btn">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  `;

  attachCartEventListeners();
}

function attachCartEventListeners() {
  const cartContainer = document.getElementById('cart-container');
  if (!cartContainer) return;

  const decButtons = cartContainer.querySelectorAll('.cart-qty-dec');
  decButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        saveCart(cart);
        renderCart();
      }
    });
  });

  const incButtons = cartContainer.querySelectorAll('.cart-qty-inc');
  incButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (item) {
        item.quantity += 1;
        saveCart(cart);
        renderCart();
      }
    });
  });

  const removeButtons = cartContainer.querySelectorAll('.btn-remove');
  removeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      let cart = getCart();
      cart = cart.filter((i) => i.id !== id);
      saveCart(cart);
      renderCart();
    });
  });

  const checkoutBtn = cartContainer.querySelector('#proceed-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (isLoggedIn()) {
        window.location.href = 'checkout.html';
      } else {
        window.location.href = 'login.html?redirect=checkout&notice=login_required';
      }
    });
  }
}

// ==========================================================
// Authentication State & Utilities
// ==========================================================

function getAuthUser() {
  try {
    const rawData = localStorage.getItem(AUTH_USER_KEY);
    return rawData ? JSON.parse(rawData) : null;
  } catch (err) {
    console.error('Failed to parse auth user:', err);
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function isLoggedIn() {
  return Boolean(getAuthToken() && getAuthUser());
}

function setAuthSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function updateAuthNavigation() {
  const navContainer = document.getElementById('nav-links-container') || document.querySelector('.nav-links');
  if (!navContainer) return;

  const user = getAuthUser();
  const token = getAuthToken();

  navContainer.querySelectorAll('.nav-user-greeting').forEach((el) => el.remove());
  navContainer.querySelectorAll('#nav-logout-btn').forEach((el) => el.remove());
  navContainer.querySelectorAll('#nav-auth-link').forEach((el) => el.remove());
  navContainer.querySelectorAll('#nav-orders-link').forEach((el) => el.remove());

  if (user && token) {
    const ordersLink = document.createElement('a');
    ordersLink.href = 'orders.html';
    ordersLink.id = 'nav-orders-link';
    ordersLink.className = 'nav-link';
    if (window.location.pathname.endsWith('orders.html')) {
      ordersLink.classList.add('active');
    }
    ordersLink.textContent = 'Order History';

    const greeting = document.createElement('span');
    greeting.className = 'nav-user-greeting';
    greeting.textContent = `Welcome, ${user.name}`;

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.id = 'nav-logout-btn';
    logoutBtn.className = 'btn-nav-logout';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
      logoutUser();
    });

    navContainer.appendChild(ordersLink);
    navContainer.appendChild(greeting);
    navContainer.appendChild(logoutBtn);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.id = 'nav-auth-link';
    loginLink.className = 'nav-link';
    if (window.location.pathname.endsWith('login.html')) {
      loginLink.classList.add('active');
    }
    loginLink.textContent = 'Login';

    navContainer.appendChild(loginLink);
  }
}

function logoutUser() {
  clearAuthSession();
  updateAuthNavigation();

  if (window.location.pathname.endsWith('checkout.html') || window.location.pathname.endsWith('orders.html')) {
    window.location.href = 'login.html';
  } else {
    window.location.reload();
  }
}

function checkCheckoutAccess() {
  if (window.location.pathname.endsWith('checkout.html')) {
    if (!isLoggedIn()) {
      window.location.href = 'login.html?redirect=checkout&notice=login_required';
    }
  }
}

function showAuthAlert(element, message, type = 'error') {
  if (!element) return;
  element.className = `auth-alert auth-alert-${type} show`;
  element.textContent = message;
}

function hideAuthAlert(element) {
  if (!element) return;
  element.className = 'auth-alert';
  element.textContent = '';
}

// ==========================================================
// User Registration (register.html)
// ==========================================================

function initRegisterForm() {
  const form = document.getElementById('register-form');
  const alertEl = document.getElementById('register-alert');
  if (!form || !alertEl) return;

  if (form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert(alertEl);

    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    if (!name) {
      showAuthAlert(alertEl, 'Full name is required.', 'error');
      return;
    }

    if (!email) {
      showAuthAlert(alertEl, 'Email is required.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAuthAlert(alertEl, 'Please provide a valid email address.', 'error');
      return;
    }

    if (!password) {
      showAuthAlert(alertEl, 'Password is required.', 'error');
      return;
    }

    if (password.length < 6) {
      showAuthAlert(alertEl, 'Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAuthAlert(alertEl, 'Passwords do not match.', 'error');
      return;
    }

    const submitBtn = document.getElementById('register-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
    }

    try {
      const result = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      }, 0);

      if (result.isNetworkError) {
        const msg = result.isFileProtocol
          ? 'Browser security blocks API calls when opened from file://. Please open through a local or deployed web server.'
          : 'Unable to connect to the backend server. The service might be starting up from idle sleep. Please retry shortly.';
        showAuthAlert(alertEl, msg, 'error');
        return;
      }

      if (!result.ok) {
        showAuthAlert(alertEl, result.message || 'Registration failed.', 'error');
        return;
      }

      showAuthAlert(alertEl, 'Registration successful! Redirecting to login...', 'success');
      form.reset();

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    } catch (err) {
      console.error('Registration error:', err);
      showAuthAlert(alertEl, 'Unable to connect to the server. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    }
  });
}

// ==========================================================
// User Login (login.html)
// ==========================================================

function initLoginForm() {
  const form = document.getElementById('login-form');
  const alertEl = document.getElementById('login-alert');
  if (!form || !alertEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('notice') === 'login_required') {
    const redirectParam = urlParams.get('redirect');
    const msg = redirectParam === 'orders'
      ? 'Please login to view your order history.'
      : 'Please login to continue to checkout.';
    showAuthAlert(alertEl, msg, 'info');
  }

  if (form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert(alertEl);

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      showAuthAlert(alertEl, 'Please enter both email and password.', 'error');
      return;
    }

    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
    }

    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }, 0);

      if (result.isNetworkError) {
        const msg = result.isFileProtocol
          ? 'Browser security blocks API calls when opened from file://. Please open through a local or deployed web server.'
          : 'Unable to connect to the backend server. The service might be starting up from idle sleep. Please retry shortly.';
        showAuthAlert(alertEl, msg, 'error');
        return;
      }

      if (!result.ok) {
        showAuthAlert(alertEl, result.message || 'Invalid email or password.', 'error');
        return;
      }

      setAuthSession(result.data.token, result.data.user);
      showAuthAlert(alertEl, 'Login successful! Redirecting...', 'success');

      setTimeout(() => {
        const redirectParam = urlParams.get('redirect');
        if (redirectParam === 'checkout') {
          window.location.href = 'checkout.html';
        } else if (redirectParam === 'orders') {
          window.location.href = 'orders.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 700);
    } catch (err) {
      console.error('Login error:', err);
      showAuthAlert(alertEl, 'Unable to connect to the server. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    }
  });
}

// ==========================================================
// Checkout & Order Processing (checkout.html)
// ==========================================================

function renderCheckoutPage() {
  const checkoutForm = document.getElementById('checkout-form');
  if (!checkoutForm) return;

  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout&notice=login_required';
    return;
  }

  const emptyCartView = document.getElementById('checkout-empty-cart');
  const mainContentView = document.getElementById('checkout-main-content');
  const alertEl = document.getElementById('checkout-alert');
  const itemsListEl = document.getElementById('checkout-items-list');
  const totalItemsEl = document.getElementById('checkout-total-items');
  const totalAmountEl = document.getElementById('checkout-total-amount');

  const cart = getCart();

  if (!cart || cart.length === 0) {
    if (emptyCartView) emptyCartView.style.display = 'block';
    if (mainContentView) mainContentView.style.display = 'none';
    return;
  }

  if (emptyCartView) emptyCartView.style.display = 'none';
  if (mainContentView) mainContentView.style.display = 'grid';

  const user = getAuthUser();
  const nameInput = document.getElementById('checkout-name');
  const emailInput = document.getElementById('checkout-email');

  if (user) {
    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
  }

  if (itemsListEl) {
    itemsListEl.innerHTML = '';
    let totalItemsCount = 0;
    let totalOrderAmount = 0;

    cart.forEach((item) => {
      const itemQty = Number(item.quantity) || 1;
      const itemPrice = Number(item.price) || 0;
      const itemSubtotal = itemPrice * itemQty;
      totalItemsCount += itemQty;
      totalOrderAmount += itemSubtotal;

      const itemRow = document.createElement('div');
      itemRow.className = 'checkout-item-row';
      itemRow.innerHTML = `
        <div class="checkout-item-info">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="checkout-item-img"
            onerror="this.onerror=null; this.src='https://placehold.co/100x100/2563eb/ffffff?text=${encodeURIComponent(item.name)}';"
          />
          <div class="checkout-item-details">
            <span class="checkout-item-name">${item.name}</span>
            <span class="checkout-item-qty">Qty: ${itemQty} × ${formatCurrency(itemPrice)}</span>
          </div>
        </div>
        <span class="checkout-item-subtotal">${formatCurrency(itemSubtotal)}</span>
      `;
      itemsListEl.appendChild(itemRow);
    });

    if (totalItemsEl) totalItemsEl.textContent = totalItemsCount;
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalOrderAmount);
  }

  if (checkoutForm.dataset.initialized === 'true') return;
  checkoutForm.dataset.initialized = 'true';

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert(alertEl);

    const currentCart = getCart();
    if (!currentCart || currentCart.length === 0) {
      showAuthAlert(alertEl, 'Your cart is empty. Please add items to proceed.', 'error');
      return;
    }

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const addressInput = document.getElementById('checkout-address');
    const cityInput = document.getElementById('checkout-city');
    const stateInput = document.getElementById('checkout-state');
    const pincodeInput = document.getElementById('checkout-pincode');
    const phoneInput = document.getElementById('checkout-phone');

    const address = addressInput ? addressInput.value.trim() : '';
    const city = cityInput ? cityInput.value.trim() : '';
    const state = stateInput ? stateInput.value.trim() : '';
    const pincode = pincodeInput ? pincodeInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name) {
      showAuthAlert(alertEl, 'Please enter your full name.', 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    if (!email) {
      showAuthAlert(alertEl, 'Please enter your email address.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    if (!address) {
      showAuthAlert(alertEl, 'Please enter your delivery street address.', 'error');
      if (addressInput) addressInput.focus();
      return;
    }

    if (!city) {
      showAuthAlert(alertEl, 'Please enter your city.', 'error');
      if (cityInput) cityInput.focus();
      return;
    }

    if (!state) {
      showAuthAlert(alertEl, 'Please enter your state.', 'error');
      if (stateInput) stateInput.focus();
      return;
    }

    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincode || !pincodeRegex.test(pincode)) {
      showAuthAlert(alertEl, 'Please enter a valid 6-digit postal pincode.', 'error');
      if (pincodeInput) pincodeInput.focus();
      return;
    }

    const phoneClean = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phoneClean)) {
      showAuthAlert(alertEl, 'Please enter a valid 10-digit mobile number.', 'error');
      if (phoneInput) phoneInput.focus();
      return;
    }

    const submitBtn = document.getElementById('place-order-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Placing Order...';
    }

    const orderPayload = {
      items: currentCart.map((i) => ({
        productId: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity
      })),
      totalAmount: currentCart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
      deliveryAddress: {
        address,
        city,
        state,
        pincode
      },
      phone: phoneClean
    };

    try {
      const token = getAuthToken();
      const result = await apiFetch('/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      }, 0);

      if (result.isNetworkError) {
        const msg = result.isFileProtocol
          ? 'Browser security blocks API calls when opened from file://. Please open through a local or deployed web server.'
          : 'Unable to connect to the backend server. The service might be starting up from idle sleep. Please retry shortly.';
        showAuthAlert(alertEl, msg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Place Order';
        }
        return;
      }

      if (!result.ok) {
        showAuthAlert(alertEl, result.message || 'Failed to place order. Please check details and try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Place Order';
        }
        return;
      }

      localStorage.removeItem(CART_STORAGE_KEY);
      updateCartCount();

      const orderId = result.data.order ? result.data.order.id : '';
      window.location.href = `orders.html?newOrderId=${encodeURIComponent(orderId)}`;
    } catch (err) {
      console.error('Order placement error:', err);
      showAuthAlert(alertEl, 'Unable to connect to the server. Please try again.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
      }
    }
  });
}

function renderOrderSuccessPage() {
  const orderIdEl = document.getElementById('success-order-id');
  if (!orderIdEl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const amount = urlParams.get('amount');
  const status = urlParams.get('status') || 'Placed';

  if (orderId) {
    orderIdEl.textContent = orderId;
  } else {
    orderIdEl.textContent = 'N/A';
  }

  const statusEl = document.getElementById('success-order-status');
  if (statusEl) {
    statusEl.textContent = status;
  }

  const amountEl = document.getElementById('success-order-amount');
  if (amountEl && amount) {
    amountEl.textContent = formatCurrency(amount);
  }
}

// ==========================================================
// Order History Page (orders.html)
// ==========================================================

async function renderOrderHistoryPage() {
  const ordersContainer = document.getElementById('orders-container');
  if (!ordersContainer) return;

  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders&notice=login_required';
    return;
  }

  const alertEl = document.getElementById('orders-alert');
  const urlParams = new URLSearchParams(window.location.search);
  const newOrderId = urlParams.get('newOrderId');

  if (newOrderId && alertEl) {
    showAuthAlert(alertEl, `Order placed successfully! Order ID: ${newOrderId}`, 'success');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  ordersContainer.innerHTML = `
    <div class="loading-state">
      <p>Loading your orders...</p>
    </div>
  `;

  const token = getAuthToken();
  const result = await apiFetch('/orders', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (result.isAborted) return;

  if (result.status === 401 || result.status === 403) {
    window.location.href = 'login.html?redirect=orders&notice=login_required';
    return;
  }

  if (result.isNetworkError) {
    renderServerOfflineCard(ordersContainer, renderOrderHistoryPage, { message: 'Unable to connect to the server to load order history.' });
    return;
  }

  if (!result.ok) {
    ordersContainer.innerHTML = `
      <div class="api-error-card">
        <p style="margin-bottom: 14px;">${escapeHtml(result.message || 'Unable to load order history.')}</p>
        <button type="button" class="btn btn-secondary" id="retry-orders-btn">Retry</button>
      </div>
    `;
    const retryBtn = ordersContainer.querySelector('#retry-orders-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', renderOrderHistoryPage);
    }
    return;
  }

  const orders = Array.isArray(result.data) ? result.data : [];
  ordersContainer.innerHTML = '';

  if (orders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="empty-cart-card">
        <div class="empty-cart-icon">📦</div>
        <h2 class="empty-cart-title">You haven't placed any orders yet.</h2>
        <p class="empty-cart-text">Explore our collection of products and place your first order!</p>
        <a href="index.html" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    const orderDateStr = new Date(order.orderDate || order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const card = document.createElement('article');
    card.className = 'order-history-card';

    let itemsSummaryHtml = '';
    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        itemsSummaryHtml += `
          <div class="order-item-mini-row">
            <span class="order-item-mini-name">${item.name}</span>
            <span class="order-item-mini-qty">Qty: ${item.quantity} × ${formatCurrency(item.price)}</span>
            <span class="order-item-mini-subtotal">${formatCurrency(item.subtotal || item.price * item.quantity)}</span>
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="order-header">
        <div class="order-header-meta">
          <h3 class="order-id-title">
            Order <span class="order-id-code">#${order.id}</span>
          </h3>
          <span class="order-date-text">Placed on ${orderDateStr}</span>
        </div>
        <span class="order-status-badge">
          <span class="status-indicator">●</span> ${order.status || 'Placed'}
        </span>
      </div>

      <div class="order-items-summary">
        ${itemsSummaryHtml}
      </div>

      <div class="order-card-footer">
        <div class="order-total-block">
          <span class="order-total-label">Total Amount:</span>
          <span class="order-total-price">${formatCurrency(order.totalAmount)}</span>
        </div>
        <button type="button" class="btn-view-order" data-order-id="${order.id}">
          View Order Details &rarr;
        </button>
      </div>
    `;

    ordersContainer.appendChild(card);
  });

  attachOrderDetailsListeners();
}

let modalKeydownBound = false;

function attachOrderDetailsListeners() {
  const viewBtns = document.querySelectorAll('.btn-view-order');
  const modal = document.getElementById('order-details-modal');
  const modalBody = document.getElementById('modal-body-content');
  const closeBtn = document.getElementById('modal-close-btn');
  const backdrop = document.getElementById('modal-backdrop');

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;

  if (!modalKeydownBound) {
    modalKeydownBound = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
        closeModal();
      }
    });
  }

  viewBtns.forEach((btn) => {
    btn.onclick = async () => {
      const orderId = btn.getAttribute('data-order-id');
      if (!orderId || !modal || !modalBody) return;

      modalBody.innerHTML = `
        <div class="loading-state">
          <p>Loading order details...</p>
        </div>
      `;
      modal.style.display = 'flex';

      const token = getAuthToken();
      const res = await apiFetch(`/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        modalBody.innerHTML = `
          <div class="api-error-card">
            <p>${escapeHtml(res.message || 'Unable to retrieve order details.')}</p>
          </div>
        `;
        return;
      }

      const o = res.data.order;
      const dateStr = new Date(o.orderDate || o.createdAt).toLocaleString('en-IN');

      let itemsTableHtml = '';
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          itemsTableHtml += `
            <tr>
              <td><strong>${it.name}</strong></td>
              <td>${formatCurrency(it.price)}</td>
              <td>${it.quantity}</td>
              <td><strong>${formatCurrency(it.subtotal || it.price * it.quantity)}</strong></td>
            </tr>
          `;
        });
      }

      const addr = o.deliveryAddress || {};

      modalBody.innerHTML = `
        <div class="modal-section-box">
          <h3 class="modal-section-title">Overview</h3>
          <div class="modal-info-grid">
            <div><span class="modal-info-label">Order ID:</span> <span class="modal-info-val">#${o.id}</span></div>
            <div><span class="modal-info-label">Status:</span> <span class="order-status-badge">${o.status}</span></div>
            <div><span class="modal-info-label">Order Date:</span> <span class="modal-info-val">${dateStr}</span></div>
            <div><span class="modal-info-label">Payment:</span> <span class="modal-info-val">Cash on Delivery</span></div>
          </div>
        </div>

        <div class="modal-section-box">
          <h3 class="modal-section-title">Delivery Address</h3>
          <p><strong>Address:</strong> ${escapeHtml(addr.address || 'N/A')}</p>
          <p><strong>City / State:</strong> ${escapeHtml(addr.city || '')}, ${escapeHtml(addr.state || '')} - ${escapeHtml(addr.pincode || '')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(o.phone || 'N/A')}</p>
        </div>

        <div class="modal-section-box">
          <h3 class="modal-section-title">Ordered Items</h3>
          <table class="modal-items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableHtml}
            </tbody>
          </table>
        </div>

        <div class="modal-section-box" style="text-align: right;">
          <span class="order-total-label">Total Amount: </span>
          <strong class="order-total-price">${formatCurrency(o.totalAmount)}</strong>
        </div>
      `;
    };
  });
}

// ==========================================================
// Centralized App Initialization & Lifecycle Management
// ==========================================================

function initApp() {
  updateCartCount();
  updateAuthNavigation();
  checkCheckoutAccess();

  // If on index.html (Catalog / Search)
  if (document.getElementById('products-grid')) {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('search') || urlParams.get('q') || '';
    renderProducts(initialQuery);
    initProductSearch();
  }

  // If on product-details.html
  if (document.getElementById('product-details-container')) {
    renderProductDetails();
  }

  // If on cart.html
  if (document.getElementById('cart-container')) {
    renderCart();
  }

  // If on login.html
  if (document.getElementById('login-form')) {
    initLoginForm();
  }

  // If on register.html
  if (document.getElementById('register-form')) {
    initRegisterForm();
  }

  // If on checkout.html
  if (document.getElementById('checkout-form')) {
    renderCheckoutPage();
  }

  // If on order-success.html
  if (document.getElementById('success-order-id')) {
    renderOrderSuccessPage();
  }

  // If on orders.html
  if (document.getElementById('orders-container')) {
    renderOrderHistoryPage();
  }
}

// Listen for standard initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Listen for BFCache restore (navigating back / forward in browser history)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    initApp();
  }
});
