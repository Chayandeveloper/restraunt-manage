# 🍽️ RestaurantOS — Restaurant Operating System

A production-ready, multi-tenant SaaS platform for restaurant operations built with the MERN stack.

---

## ✨ Features

| Module | Features |
|--------|----------|
| **Multi-Tenancy** | Single DB, `restaurantId` isolation on every document |
| **Auth** | JWT, 4 roles (super_admin / admin / staff / kitchen) |
| **Orders** | Table-based, Zomato/Swiggy manual aggregation, profit calc |
| **Reservations** | Time-slot booking, double-booking prevention |
| **Menu** | Categories + items, availability toggle |
| **Tables** | Visual grid, real-time status (available/occupied/reserved) |
| **Kitchen Display** | Live order queue, sound alerts on new orders, elapsed timer |
| **Analytics** | Revenue, profit, peak hours, per-source breakdown — with charts |
| **Receipts** | Printable receipt popup from any order |
| **Users** | Per-restaurant team management |

---

## 🚀 Quick Start

### Option A — Local (requires MongoDB running)

```bash
# 1. Clone & setup
git clone <repo>
cd restaurant-os

# 2. Backend
cd backend
cp .env.example .env          # edit MONGO_URI and JWT_SECRET
npm install
npm run seed                   # loads demo data
npm run dev                    # starts on :5000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm start                      # starts on :3000
```

### Option B — Docker Compose (easiest)

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

To seed demo data in Docker:
```bash
docker exec ros-backend node seed.js
```

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Super Admin** | admin@restaurantos.com | admin123 | All restaurants |
| **Admin** | ravi@spicegarden.com | admin123 | Spice Garden only |
| **Staff** | arjun@spicegarden.com | staff123 | Orders + Reservations |
| **Kitchen** | kitchen@spicegarden.com | kitchen123 | Kitchen display only |

---

## 🏗️ Architecture

```
restaurant-os/
├── backend/                     # Node.js + Express
│   ├── models/index.js          # All Mongoose schemas
│   ├── middleware/index.js      # authMiddleware, roleMiddleware, tenantMiddleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── restaurants.js       # super_admin only
│   │   ├── users.js
│   │   ├── tables.js
│   │   ├── categories.js
│   │   ├── menuItems.js
│   │   ├── orders.js            # includes profit auto-calc
│   │   ├── reservations.js      # conflict detection
│   │   └── analytics.js         # MongoDB aggregation pipelines
│   └── seed.js
│
└── frontend/                    # React 18
    └── src/
        ├── context/AuthContext.jsx
        ├── utils/api.js          # Axios + 401 interceptor
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Modal.jsx
        │   └── OrderCard.jsx     # + printReceipt()
        └── pages/
            ├── LoginPage.jsx
            ├── KitchenPanel.jsx  # Full-screen, sound alerts, elapsed timers
            ├── superadmin/       # Restaurant + user management
            ├── admin/            # Full dashboard
            └── staff/            # Order builder + live orders
```

---

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/login
GET    /api/auth/me
```

### Restaurants (super_admin only)
```
GET    /api/restaurants
POST   /api/restaurants
PUT    /api/restaurants/:id
DELETE /api/restaurants/:id
```

### Orders
```
GET    /api/orders?status=&source=&date=&tableId=
POST   /api/orders
PUT    /api/orders/:id/status   { status }
PUT    /api/orders/:id/payment  { paymentMethod, paymentStatus }
PUT    /api/orders/:id
```

### Reservations
```
GET    /api/reservations?date=&status=
POST   /api/reservations        # checks for conflicts
PUT    /api/reservations/:id
DELETE /api/reservations/:id    # sets status=cancelled
```

### Analytics
```
GET    /api/analytics?startDate=&endDate=
# Returns: summary, revenueBySource, ordersPerDay, peakHours, tableUsage
```

### Tables, Categories, Menu Items, Users
```
Standard CRUD: GET, POST, PUT /:id, DELETE /:id
All filtered by restaurantId via tenantMiddleware
```

---

## 🛡️ Multi-Tenancy & Security

- Every API route behind `authMiddleware` (JWT verification)
- `tenantMiddleware` auto-injects `restaurantId` filter from the logged-in user
- `super_admin` can optionally pass `?restaurantId=` to target a specific restaurant
- Role checks via `roleMiddleware('admin', 'staff')` composition
- Passwords hashed with bcrypt (10 rounds)
- JWT expires in 24h

---

## 💰 Profit Calculation

Orders automatically calculate profit:

```
profit = totalAmount - (totalAmount × commissionPercent / 100)
```

This runs as a Mongoose `pre('save')` hook and is recalculated on every update.
Zomato default commission: **20%**, Swiggy: **18%** (both editable per order).

---

## 🖨️ Receipt Printing

Any order can be printed via the receipt button (🖨️). Opens a thermal-printer-friendly popup and triggers `window.print()` automatically.

---

## 🔧 Environment Variables

**Backend `.env`**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/restaurant-os
JWT_SECRET=your-secret-here
NODE_ENV=development
```

**Frontend `.env`**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Database | MongoDB 7 + Mongoose 8 |
| Backend | Node.js 20, Express 4 |
| Frontend | React 18, React Router 6 |
| Charts | Recharts |
| Auth | JWT + bcryptjs |
| Styling | Pure CSS (custom design system) |
| Fonts | Syne (display) + DM Sans (body) |
| Deployment | Docker + Nginx |

---

## 🗺️ Roadmap / Future Enhancements

- [ ] WebSocket real-time updates (replace polling)
- [ ] Customer-facing menu / online ordering
- [ ] Inventory management & COGS tracking
- [ ] Shift management & attendance
- [ ] WhatsApp/SMS reservation confirmations
- [ ] Multi-branch analytics comparison
- [ ] Export reports to CSV/PDF
