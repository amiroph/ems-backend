# 🏢 EMS — Employee Management System

> A full-stack HR platform with role-based dashboards for Admin, HR, Manager, and Employee.

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MySQL](https://img.shields.io/badge/Database-MySQL-orange)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)

🌐 **Live Demo:** [https://ems-frontend-nine-pearl.vercel.app](https://ems-frontend-nine-pearl.vercel.app)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Author](#author)

---

## 📖 Overview

EMS is a comprehensive Human Resources management platform featuring four role-based dashboards. It handles employee lifecycle management, leave requests with automatic balance calculation, department management, and management reporting — all in a clean, production-ready web application.

Built entirely from scratch as a solo project covering database schema design, REST API development, role-based access control, and full cloud deployment.

---

## ✨ Features

### 👥 Role-Based Dashboards

**Admin**
- Full control over all employees, departments, and users
- Assign and change employee roles
- View all leave requests across the organization
- Generate and export reports as CSV
- Block or deactivate employee accounts

**HR**
- Manage employee records — add, edit, view
- Process leave requests — approve or reject
- View department summaries and employee leave balances
- Onboard new employees

**Manager**
- View team members and their leave status
- Approve or reject leave requests from direct reports
- View department-level reports

**Employee**
- View personal profile and contract details
- Submit leave requests (annual, sick, maternity, emergency)
- Track leave balance — 16 days per year prorated from join date
- View leave history and approval status

### ⚙️ Technical Highlights
- JWT authentication with role-based access control (4 roles)
- Automatic leave balance calculation — 16 days/year prorated from hire date
- Session timeout with 60-second countdown warning modal
- Reports with CSV export
- Pagination across all listings
- CORS protection, Helmet security headers, and rate limiting

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | JWT + bcryptjs |
| Security | Helmet, express-rate-limit |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| Database Host | Clever Cloud |

---

## 🏗️ Project Structure
ems/
│
├── frontend/                        # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx          # Role-aware sidebar navigation
│   │   │   ├── ProtectedRoute.jsx   # Role-based route guard
│   │   │   └── Pagination.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth + session timeout
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx        # Role-specific dashboard
│   │   │   ├── Employees.jsx        # Employee list and management
│   │   │   ├── Departments.jsx      # Department management
│   │   │   ├── LeaveRequests.jsx    # Leave management
│   │   │   ├── MyLeave.jsx          # Employee leave portal
│   │   │   ├── Profile.jsx          # User profile
│   │   │   └── Reports.jsx          # Reports with CSV export
│   │   └── utils/
│   │       └── api.js               # Axios with JWT interceptor
│   └── vercel.json
│
└── backend/                         # Node.js + Express
└── src/
├── config/
│   └── db.js                # MySQL pool
├── middleware/
│   ├── auth.js              # protect + authorize (4 roles)
│   └── rateLimiter.js
└── routes/
├── auth.js              # Login
├── employees.js         # Employee CRUD
├── departments.js       # Department CRUD
├── leave.js             # Leave requests + balance
└── reports.js           # Reports + CSV export

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+

### 1. Clone the repositories

```bash
git clone https://github.com/amiroph/ems-backend.git
git clone https://github.com/amiroph/ems-frontend.git
```

### 2. Set up the backend

```bash
cd ems-backend
npm install
```

Create `.env` file (see [Environment Variables](#environment-variables) below).

Run the MySQL schema to create all tables, then seed an admin user:

```sql
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@ems.com',
'$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
```

Start the server:

```bash
npm run dev
# Runs on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd ems-frontend
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
# Runs on http://localhost:5173
```

### Test Accounts (Live Demo)

| Role | Email | Password |
|---|---|---|
| Admin | admin@ems.com | password |
| HR | hr@ems.com | password |
| Manager | manager@ems.com | password |
| Employee | employee@ems.com | password |

---

## 🔐 Environment Variables

### Backend `.env`

```env
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_PORT=3306
DB_NAME=ems

# JWT
JWT_SECRET=ems_secret_key_2026
JWT_EXPIRES_IN=7d

# CORS
CLIENT_URL=http://localhost:5173
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user |

### Employees — Admin + HR

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | All employees with pagination |
| POST | `/api/employees` | Add new employee |
| GET | `/api/employees/:id` | Single employee details |
| PUT | `/api/employees/:id` | Update employee |
| PUT | `/api/employees/:id/toggle` | Block or activate account |

### Departments — Admin + HR

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/departments` | All departments |
| POST | `/api/departments` | Create department |
| PUT | `/api/departments/:id` | Update department |
| DELETE | `/api/departments/:id` | Delete department |

### Leave — All roles

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/leave` | Submit leave request (employee) |
| GET | `/api/leave/my` | My leave requests (employee) |
| GET | `/api/leave/balance` | My leave balance (employee) |
| GET | `/api/leave` | All requests (admin/hr/manager) |
| PUT | `/api/leave/:id/approve` | Approve leave request |
| PUT | `/api/leave/:id/reject` | Reject leave request |

### Reports — Admin + HR

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/summary` | Organization summary |
| GET | `/api/reports/export` | Export CSV report |

---

## 🌍 Deployment

| Layer | Platform | URL |
|---|---|---|
| Frontend | Vercel | [ems-frontend-nine-pearl.vercel.app](https://ems-frontend-nine-pearl.vercel.app) |
| Backend | Render | Render managed service |
| Database | Clever Cloud | MySQL managed instance |

---

## 👨‍💻 Author

**Amanuel Adamu Shifera**

- 🌐 Portfolio: [amiroph.github.io](https://amiroph.github.io/amanueladamu.github.io/)
- 💼 GitHub: [@amiroph](https://github.com/amiroph)
- ✉️ Email: amannice77@gmail.com
- 📞 Phone: +251-924073032

---

## 📄 License

This project is built for portfolio and demonstration purposes.