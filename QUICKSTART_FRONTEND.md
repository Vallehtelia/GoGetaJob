# GoGetaJob Frontend - Quick Start

## 🚀 Run Frontend (30 seconds)

```bash
# Navigate to frontend
cd /root/GoGetaJob/frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Open in browser:** http://localhost:3001

---

## 📍 What You'll See

### 1. Login Page (/)
- Dark navy background
- Gradient "GoGetaJob" branding
- Email and password fields
- Pink gradient "Sign in" button

### 2. Register Page (/register)
- Similar to login
- Additional confirm password field
- Password requirements shown

### 3. Dashboard (/dashboard)
- **Collapsible sidebar** on the left (try clicking the arrow!)
- Stats cards showing: Total, Interviews, Offers, Response Rate
- Recent applications list
- Top bar with user info

### 4. Applications (/applications)
- Table with mock data (5 sample applications)
- Status badges (color-coded)
- Click **eye icon** to view notes in modal
- "New Application" button (top right)

### 5. Create Application (/applications/new)
- Form with all fields
- Company, Position, URL, Status, Date, Notes
- Pink gradient "Create Application" button

### 6. Settings (/settings)
- API base URL configuration
- Profile settings placeholder
- Theme info

---

## 🎨 Try These Features

✅ **Collapse/Expand Sidebar**
   - Click the arrow icon in sidebar header
   - Smooth animation
   - Icons remain visible when collapsed

✅ **View Application Notes**
   - Go to Applications page
   - Click eye icon on any row
   - Modal appears with notes

✅ **Navigate Between Pages**
   - Click sidebar items (Dashboard, Applications, Settings)
   - Active page has pink→blue gradient highlight

✅ **Status Badges**
   - Different colors for each status
   - OFFER badge has special pink gradient!

---

## 🎯 Mock Data

The frontend currently shows **5 sample applications**:

1. **TechCorp** - Senior Backend Developer (INTERVIEW)
2. **StartupXYZ** - Full Stack Engineer (APPLIED)
3. **BigTech Inc** - Software Engineer (OFFER) ⭐
4. **DesignCo** - Frontend Developer (REJECTED)
5. **CloudSystems** - DevOps Engineer (DRAFT)

---

## 🎨 Theme Colors

**Background:** Deep navy (#0f172a)  
**Panels:** Lighter navy (#1e293b)  
**Accent:** Pink gradient (#ec4899 → #a855f7)  
**Primary:** Blue (#3b82f6)

**See:** `FRONTEND_GUIDE.md` for customization

---

## 🔧 Quick Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production
npm start

# Lint
npm run lint
```

---

## 📱 Responsive Design

- **Desktop:** Full sidebar visible
- **Tablet:** Sidebar collapses by default
- **Mobile:** Table scrolls horizontally

Try resizing your browser window!

---

## 🔌 Not Connected Yet

The frontend uses **mock data** and doesn't connect to the backend API yet.

**Forms will:**
- ✅ Validate input
- ✅ Show console logs
- ❌ Not save data (no API calls)

**To connect:** See `PHASE_3_COMPLETE.md` section "Backend Integration"

---

## 🐛 Troubleshooting

**Port 3001 already in use?**
```bash
# Kill process
lsof -ti:3001 | xargs kill -9

# Or change port in package.json
"dev": "next dev -p 3002"
```

**Styles not loading?**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## ✨ Design Highlights

- **Gradient buttons** hover and scale slightly
- **Sidebar** has smooth collapse animation
- **Active nav** item has gradient background
- **Modals** have backdrop blur
- **Cards** have soft shadows
- **Everything** uses rounded-2xl corners

---

**GoGetaJob Frontend** - Ready to explore! 🚀
