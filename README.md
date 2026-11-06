# ShopEase — Full Stack E-Commerce Store

**CodeAlpha Full Stack Development Internship — Task 1: Simple E-Commerce Store**  
**Phase: Step 8 — Checkout and Order Processing**

---

## 📌 Project Overview
ShopEase is a full-stack e-commerce web application built step-by-step. In **Step 8: Checkout and Order Processing**, real checkout and order placement are integrated with MongoDB using Mongoose. The system includes customer detail pre-filling, comprehensive Indian delivery address and phone number validation, secure server-side total amount calculation, duplicate submission prevention, post-order cart clearance, order success presentation, and strict JWT authentication protection.

---

## 📁 Project Structure

```text
ShopEase/
│
├── frontend/
│   ├── index.html              # Product listing (fetches from /api/products)
│   ├── product-details.html    # Product details (fetches from /api/products/:id)
│   ├── cart.html               # Shopping cart page (persisted in localStorage)
│   ├── checkout.html           # Real checkout page (delivery details & order summary)
│   ├── login.html              # User login page
│   ├── register.html           # User registration page
│   ├── order-success.html      # Order confirmation page
│   │
│   ├── css/
│   │   └── style.css           # Responsive styling (Catalog, Details, Cart, Auth, Checkout)
│   │
│   └── js/
│       └── script.js           # REST API fetch calls, cart state, auth, & checkout logic
│
├── backend/
│   ├── server.js               # Express server connecting to MongoDB with Mongoose
│   ├── seed.js                 # Database seeding script (npm run seed)
│   │
│   ├── models/
│   │   ├── Product.js          # Mongoose Product Schema & Model
│   │   ├── User.js             # Mongoose User Schema & Model (bcrypt hashed passwords)
│   │   └── Order.js            # Mongoose Order Schema & Model (items, total, delivery, status)
│   │
│   ├── routes/
│   │   ├── authRoutes.js       # Auth endpoints (/api/auth/register, /login, /me)
│   │   └── orderRoutes.js      # Order endpoints (POST /api/orders, GET /api/orders/:id)
│   │
│   └── middleware/
│       └── authMiddleware.js   # JWT authentication middleware
│
├── .env                        # Environment variables (MONGODB_URI, PORT, JWT_SECRET) - Git ignored
├── .gitignore                  # Git ignore rules for .env and node_modules
├── package.json                # Dependencies (express, cors, mongoose, dotenv, bcryptjs, jsonwebtoken)
└── README.md                   # Project documentation
```

---

## 🛠️ Technology Stack (Step 8)

- **Frontend**: HTML5, CSS3 (Grid & Flexbox), Vanilla JavaScript (Fetch API)
- **Backend**: Node.js, Express.js, CORS
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: `bcryptjs` (salt rounds = 10) & `jsonwebtoken` (JWT, 1d expiry)
- **Order Processing**: Server-side total calculation from MongoDB product prices
- **Environment Management**: `dotenv`
- **Cart State**: Browser `localStorage` (`shopease_cart`)

---

## 🔌 Backend REST API Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `GET` | `/api/test` | Verifies that the backend server is running | `200 OK` |
| `GET` | `/api/products` | Retrieves all products from MongoDB | `200 OK` / `500 Error` |
| `GET` | `/api/products/:id` | Retrieves single product from MongoDB by ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/auth/register` | Registers new user with hashed password | `201 Created` / `400 Bad Request` / `409 Conflict` |
| `POST` | `/api/auth/login` | Validates credentials and returns JWT token | `200 OK` / `400 Bad Request` / `401 Unauthorized` |
| `GET` | `/api/auth/me` | Protected route verifying JWT authMiddleware | `200 OK` / `401 Unauthorized` |
| `POST` | `/api/orders` | Places order with verified server calculations (Protected) | `201 Created` / `400 Bad Request` / `401 Unauthorized` |
| `GET` | `/api/orders` | Retrieves all orders for the authenticated user (Protected) | `200 OK` / `401 Unauthorized` |
| `GET` | `/api/orders/:id` | Retrieves single order by ID for verified owner (Protected) | `200 OK` / `403 Forbidden` / `404 Not Found` |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (.env)
Create or verify the `.env` file in the root directory:
```text
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/shopease
JWT_SECRET=your_jwt_secret_key
```

> **Note**: `.env` is included in `.gitignore` to prevent exposing credentials.

### 3. Seed Products into MongoDB
Run the database seed script to populate the initial products:
```bash
npm run seed
```

### 4. Start the Backend Server
```bash
npm start
```
The server will start on `http://localhost:3000` and connect to MongoDB.

### 5. Open the Frontend
Visit `http://localhost:3000/index.html` or open any frontend page.

---

## 📋 Status & Next Steps
- [x] **Step 1: Project Setup** (Completed)
- [x] **Step 2: Product Listing** (Completed)
- [x] **Step 3: Product Details Page** (Completed)
- [x] **Step 4: Shopping Cart & LocalStorage** (Completed)
- [x] **Step 5: Backend Product API** (Completed)
- [x] **Step 6: MongoDB Database Integration** (Completed)
- [x] **Step 7: User Registration & Login** (Completed)
- [x] **Step 8: Checkout & Order Processing** (Completed)
- [x] **Feature: Order History** (Completed)
