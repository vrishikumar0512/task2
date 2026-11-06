// ==========================================================
// ShopEase - Public API Configuration
// ==========================================================
// When deploying the frontend to a static host (Vercel, Netlify,
// GitHub Pages, Cloudflare Pages, etc.) separately from your backend:
//
// 1. Deploy your backend to Render, Railway, or another Node host.
// 2. Set your public backend API URL below:
//    e.g. API_BASE_URL: 'https://shopease-backend.onrender.com/api'
//
// NOTES:
// - Leave API_BASE_URL empty ('') if:
//     a) You are running locally (it will automatically use http://127.0.0.1:3000/api)
//     b) You are deploying frontend + backend together as a single Node web service (same-origin /api)
// - Do NOT include a trailing slash.
// ==========================================================

window.SHOPEASE_CONFIG = {
  // Public HTTPS URL of the deployed backend (e.g. 'https://shopease-api.onrender.com/api')
  API_BASE_URL: ''
};
