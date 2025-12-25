# ManagerStaff - React Frontend with Spring Boot Backend

Ứng dụng quản lý nhân viên với Dashboard quản trị, tích hợp đầy đủ với backend Spring Boot.

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + React Router
- **Charts**: Recharts
- **State**: React Context API
- **HTTP**: Axios với JWT interceptor
- **Backend**: Spring Boot (localhost:5000)

## 🚀 Features

### ✅ Authentication & Authorization
- Login hệ thống với JWT
- Role-based access (admin/user)
- Auto redirect sau login
- Protected routes

### ✅ Dashboard Administration
- **KPI Cards**: Thống kê tổng quan với StatCard component
- **Completion Circle**: Vòng tròn hiển thị % hoàn thành
- **Progress Chart**: Line chart so sánh tháng này/tháng trước
- **Top 5 Rankings**: Thống kê người dùng hoạt động nhiều/ít nhất
- **Calendar Heatmap**: GitHub-style activity map
- **Period Switching**: Tuần/Tháng/Năm với real-time data

### ✅ Task Management
- **CRUD Operations**: Tạo/Sửa/Xóa tasks
- **Status Toggle**: Pending ↔ Completed
- **Real-time Stats**: KPI cards cập nhật ngay lập tức
- **Role Permissions**: Admin & owner permissions
- **Kanban-style UI**: Layout 2 cột Pending/Completed

### ✅ API Integration
- **Axios Setup**: Base URL và JWT interceptor tự động
- **TypeScript Interfaces**: Full typing cho tất cả API responses
- **Error Handling**: Loading states và error boundaries
- **Real-time Updates**: Optimistic UI updates

## 📁 Project Structure

```
src/
├── api/                    # API calls & interfaces
│   ├── axios.ts           # Axios instance với interceptor
│   ├── auth.ts            # Login API
│   ├── users.ts           # User CRUD APIs
│   ├── tasks.ts           # Task CRUD APIs
│   ├── habits.ts          # Habit stats APIs
│   └── timesheets.ts      # Timesheet APIs
├── components/            # Reusable UI components
│   ├── Layout.tsx        # Main layout với sidebar
│   ├── StatCard.tsx      # KPI cards
│   ├── CompletionCircle.tsx # Progress circles
│   └── charts/           # Chart components
├── contexts/             # React Context providers
│   ├── AuthContext.tsx   # Auth state management
│   └── authContext.ts    # Auth types & interfaces
├── hooks/                # Custom hooks
│   └── useAuth.ts       # Auth context hook
├── pages/               # Page components
│   ├── Login.tsx        # Login form
│   ├── Dashboard.tsx    # Admin dashboard
│   └── Tasks.tsx        # Task management
└── App.tsx              # Main app với routing
```

## 🔥 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# .env file
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
# Server: http://localhost:5556
```

### 4. Backend Setup (Spring Boot)
```bash
# Backend server cần chạy tại localhost:5000
# Implement tất cả APIs theo spec trong src/api/
```

## 🔑 Login Credentials

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Response sample:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "1",
    "name": "Nguyen Van A",
    "role": "admin"
  }
}
```

## 📊 Dashboard Features Screenshots

### KPI Cards & Stats
- Total Tasks, Completed, Pending, Success Rate
- Visual completion circle with percentage
- Responsive grid layout

### Charts & Analytics
- Line chart comparing current vs previous period
- Monthly performance bar chart
- Top 5 performers leaderboard
- GitHub-style activity calendar heatmap

### Task Management UI
- Kanban-style layout (Pending/Completed)
- Inline editing forms
- Status toggle buttons
- Role-based action permissions

## 🔗 Backend API Endpoints Required

### Auth
- `POST /api/auth/login` → `{ token, user }`

### Users
- `GET /api/users` (admin)
- `GET/POST/PUT/DELETE /api/users/:id` (admin)

### Tasks
- `GET/POST /api/tasks`
- `PUT/DELETE /api/tasks/:id`

### Habits (Dashboard Data)
- `GET /api/habits/stats/weekly` (admin)
- `GET /api/habits/me/stats/weekly` (user)
- `GET /api/habits/stats/monthly` (admin)
- `GET /api/habits/me/stats/monthly` (user)

### Timesheets
- `POST /api/timesheets/checkin`
- `POST /api/timesheets/checkout`
- `GET /api/timesheets/me`
- `GET /api/timesheets/stats/weekly` (admin)

## 🚀 Production Build

```bash
npm run build    # Build for production
npm run preview  # Preview production build
```

## ✨ Development Notes

- **TypeScript**: Full type safety với interfaces cho tất cả API
- **Error Handling**: Graceful fallbacks và loading states
- **Responsive Design**: Mobile-first với TailwindCSS
- **Performance**: Optimistic updates và caching logic
- **Code Quality**: ESLint + Prettier đã config

## 🎯 Next Steps

- [] Implement Habits page với chart progress
- [] Add Timesheets page với checkin/checkout
- [] User management page (admin only)
- [] Add Reports page với advanced analytics
- [] Implement notifications và real-time updates
- [] Add testing suite (Jest + React Testing Library)
- [] Add CI/CD pipeline

---

**Ready to integrate with Spring Boot backend!** 🚀
