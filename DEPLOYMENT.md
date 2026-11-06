# ShopEase — Production Deployment Guide

This guide walks you through deploying the **ShopEase** full-stack e-commerce application so that it runs continuously in the cloud on a public HTTPS URL without requiring your personal computer to be turned on or running local servers.

---

## 1. Deployment Architecture Options

ShopEase is architected to support two production deployment architectures:

| Feature | Option A: Unified Full-Stack (Recommended for simplicity) | Option B: Decoupled Architecture |
| :--- | :--- | :--- |
| **Frontend** | Served directly by Express backend as static assets | Hosted on Netlify, Vercel, or GitHub Pages |
| **Backend** | Render, Railway, or Koyeb (Node.js Web Service) | Render, Railway, or Koyeb (Node.js Web Service) |
| **Database** | MongoDB Atlas (M0 Free Tier) | MongoDB Atlas (M0 Free Tier) |
| **Public URLs** | 1 unified URL (e.g. `https://shopease.onrender.com`) | 2 URLs (e.g. `https://shopease.netlify.app` + API URL) |
| **CORS Setup** | Same-origin (no CORS complexity) | Cross-origin via `ALLOWED_ORIGINS` and `config.js` |
| **Cost** | 100% Free Tier compatible | 100% Free Tier compatible |

---

## 2. Platform Comparison & Free Tier Limitations

| Platform | Role | Free Tier Availability | Important Notes & Limitations |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Remote Database | **Free forever** (M0 Sandbox, 512MB storage) | No credit card required. Suitable for production demo. Requires Network Access configured to `0.0.0.0/0`. |
| **Render** | Node.js Backend (+ optional Frontend) | **Free tier** (750 free instance-hours/month) | **Cold Starts**: Inactive services spin down after 15 minutes of inactivity. The first incoming request takes **30–50 seconds** to wake up. |
| **Railway** | Node.js Backend Alternative | $5 free trial credit / usage based | Does not sleep on inactivity, fast response times. |
| **Netlify / Vercel** | Static Frontend Hosting | **Free forever** (100GB bandwidth/month) | Global CDN, instant loading, automated HTTPS certificates. |

---

## 3. Step 1: Configure the Remote MongoDB Database (MongoDB Atlas)

Before deploying the server, your remote database must be created on MongoDB Atlas:

### 3.1 Create a Free Cluster
1. Sign in or sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to deploy a database.
3. Choose the **M0 Free (Shared)** tier.
4. Select your preferred cloud provider (AWS, Google Cloud, or Azure) and a region geographically close to your target audience (e.g., `AWS / Mumbai (ap-south-1)`).
5. Name your cluster (e.g. `shopease-cluster`) and click **Create Deployment**.

### 3.2 Create a Database User
1. In the Atlas dashboard, navigate to **Security** -> **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set a username (e.g. `shopease_admin`).
5. Set an alphanumeric password.
   > **Note**: Avoid special characters like `@`, `:`, `/`, or `%` in your password, as they require URL percent-encoding in MongoDB connection strings.
6. Under **Database User Privileges**, select **Read and write to any database** (or `Built-in Role: Atlas admin`).
7. Click **Add User**.

### 3.3 Configure Network Access (IP Whitelist)
Because cloud hosting providers (Render, Railway, Heroku) use dynamic IP addresses that rotate on each container restart, you must permit traffic from all cloud instances:
1. In the Atlas dashboard, navigate to **Security** -> **Network Access**.
2. Click **Add IP Address**.
3. Click the button **Allow Access From Anywhere** (this enters `0.0.0.0/0`).
4. Set Comment: `Cloud deployment access`.
5. Click **Confirm**. Wait ~1 minute until the status shows `Active`.

### 3.4 Retrieve the Connection String
1. Go to **Database** -> **Clusters** and click **Connect**.
2. Select **Drivers** (Node.js).
3. Copy the connection string format:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=shopease
   ```
4. Replace `<username>` and `<password>` with your database user credentials.
5. Add the database name `/shopease` right before the `?` query parameter:
   ```text
   mongodb+srv://shopease_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/shopease?retryWrites=true&w=majority
   ```

### 3.5 Optional: Seed the Remote Database
You can populate the initial 56 products into MongoDB Atlas from your computer before deploying:
```bash
# In your terminal (Windows PowerShell):
$env:MONGODB_URI="mongodb+srv://shopease_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/shopease?retryWrites=true&w=majority"
npm run seed
```
The script will insert all products without overwriting existing user data or orders.

---

## 4. Step 2: Deploy the Backend to Render

### 4.1 Push Project to GitHub
Ensure your latest project code is in a GitHub repository:

**Option 1: Using Git CLI (if Git is installed)**
```bash
git init
git add .
git commit -m "Prepare ShopEase for cloud deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shopease.git
git push -u origin main
```

**Option 2: Using GitHub Desktop**
1. Download and open [GitHub Desktop](https://desktop.github.com/).
2. Choose **File** -> **Add Local Repository** and select `C:\Users\Pavithra\Desktop\ecom`.
3. Click **Publish Repository** to push to your GitHub account.

**Option 3: Using GitHub Web Interface**
1. Create a new repository on [GitHub](https://github.com/new) named `shopease`.
2. Click **uploading an existing file** and drag the contents of `C:\Users\Pavithra\Desktop\ecom` into the browser (excluding `node_modules`).

### 4.2 Create Render Web Service
1. Log in to [Render](https://render.com/).
2. In the dashboard, click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `shopease-backend` (or your preferred name)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Root Directory**: `.` (leave empty for repo root)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 4.3 Configure Environment Variables
Under the **Environment Variables** section on Render, add:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode and error handling |
| `MONGODB_URI` | `mongodb+srv://shopease_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/shopease?retryWrites=true&w=majority` | Remote MongoDB Atlas connection |
| `JWT_SECRET` | `replace_with_a_long_random_string_min_32_chars` | Used to sign user login tokens |
| `ALLOWED_ORIGINS` | `*` (or your frontend public domain) | Configures CORS permissions |

> **Note**: You do **not** need to set `PORT` on Render. Render automatically assigns and populates `process.env.PORT`.

5. Click **Create Web Service**.
6. Wait for the build and deployment log to finish. You should see:
   ```text
   ShopEase backend running on port 10000
   MongoDB connected successfully to mongodb+srv://shopease_admin:****@cluster0.xxxxx.mongodb.net/shopease
   ```
7. Copy your public service URL from the top of the Render dashboard (e.g. `https://shopease-backend-xyz.onrender.com`).

### 4.4 Verify Backend Health
Open a browser or terminal and test the health endpoint:
```bash
curl https://shopease-backend-xyz.onrender.com/api/health
```
Expected JSON response:
```json
{
  "status": "healthy",
  "message": "ShopEase backend is running successfully",
  "database": "connected",
  "environment": "production"
}
```

---

## 5. Step 3: Configure and Deploy the Frontend

### Option A: Unified Full-Stack (Zero Frontend Setup Needed)
If you followed Step 2, **your frontend is already live!**
The Express server in `backend/server.js` serves the entire `frontend/` directory statically on clean URLs:
- Open `https://shopease-backend-xyz.onrender.com/` in your browser.
- All requests use same-origin relative `/api`, with no CORS restrictions or separate DNS configuration needed.

---

### Option B: Decoupled Frontend (Netlify / Vercel)
If you prefer hosting the frontend on a specialized static CDN platform like Netlify or Vercel:

#### 1. Set the Backend API URL
Open [frontend/js/config.js](file:///c:/Users/Pavithra/Desktop/ecom/frontend/js/config.js) and enter your deployed backend API URL:
```javascript
window.SHOPEASE_CONFIG = {
  API_BASE_URL: 'https://shopease-backend-xyz.onrender.com/api'
};
```
Commit and push the change to GitHub:
```bash
git add frontend/js/config.js
git commit -m "Configure public API URL for frontend"
git push origin main
```

#### 2. Deploy to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repository.
4. Set build settings:
   - **Base directory**: Leave blank
   - **Publish directory**: `frontend`
   - **Build command**: Leave blank (static HTML/CSS/JS requires no build step)
5. Click **Deploy Site**.
6. Netlify will generate a public URL (e.g. `https://shopease-store.netlify.app`).

#### 3. Update Backend CORS (Optional)
If you want to restrict backend access exclusively to your Netlify site instead of `*`:
1. In Render -> your web service -> **Environment**.
2. Update `ALLOWED_ORIGINS` to `https://shopease-store.netlify.app`.
3. Save changes. Render will automatically redeploy with the restricted origin.

---

## 6. Testing & Verifying Features End-to-End

Once deployed, verify all features on the public URL:

1. **Product Catalog**: Open the homepage. Verify product cards, prices in INR (₹), and images display properly.
2. **Search**: Search for "laptop", "phone", "mouse". Verify real-time query filtering matches the MongoDB database.
3. **Product Details**: Click on a product. Verify name, price, stock, rating, and description load from `/api/products/:id`.
4. **Cart**: Add items to cart. Refresh the page to verify cart state is retained in `localStorage`.
5. **User Registration**:
   - Go to `/register.html`.
   - Register a new account (e.g. `testuser@example.com`, password >= 6 characters).
   - Verify success alert and redirect to login.
6. **User Login**:
   - Log in with the newly created account.
   - Verify the navigation updates to show user name and Logout button.
7. **Checkout**:
   - Proceed to checkout with items in the cart.
   - Enter a valid 6-digit Indian PIN code and 10-digit mobile number.
   - Click **Place Order**.
8. **Order History**:
   - Navigate to `/orders.html`.
   - Verify the placed order is listed with items, total amount, delivery details, and status.
9. **Database Persistence**:
   - Log out and log back in, or test from a different browser.
   - Order history and user account persist permanently in MongoDB Atlas.

---

## 7. Troubleshooting & Checking Backend Logs

### Cold Starts on Free Tier
- Render's free tier puts backend instances to sleep after 15 minutes of inactivity.
- When you first visit the site after an idle period, the backend may take **30–50 seconds** to boot.
- The ShopEase frontend automatically displays a friendly notification explaining this during cold starts and includes a **Retry Connection** button.

### How to Inspect Backend Logs
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click on your `shopease-backend` service.
3. In the left navigation menu, click **Logs**.
4. Real-time stdout and stderr output will appear here.

### Common Error Resolutions

| Error Message in Logs / Browser | Cause | Resolution |
| :--- | :--- | :--- |
| `MongooseServerSelectionError: connect ECONNREFUSED` | MongoDB Atlas network whitelist blocking connection | Go to MongoDB Atlas -> **Network Access** -> Ensure `0.0.0.0/0` is added and marked Active. |
| `MongoServerError: bad auth : authentication failed` | Wrong database user credentials in `MONGODB_URI` | Go to Atlas -> **Database Access**, reset user password, and update `MONGODB_URI` on Render. |
| `CORS Error: Origin not allowed` | Frontend origin is blocked by server CORS policy | In Render environment variables, set `ALLOWED_ORIGINS=*` or include your exact frontend URL. |
| `Registration/Login: 503 Database Unavailable` | Server started before MongoDB Atlas connection established | Check Render logs for database connection status. The server automatically retries every 5 seconds. |
| `Failed to fetch / NetworkError` | Incorrect backend URL in `frontend/js/config.js` | Ensure `API_BASE_URL` points to `https://<your-render-url>/api` (including the `/api` prefix and `https://`). |
