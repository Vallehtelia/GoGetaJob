# GoGetaJob Frontend Guide

## 🎨 Theme & Design System

### Color Palette

The GoGetaJob frontend uses a sleek **dark navy theme** with **pink gradient accents**.

#### Primary Colors
- **Background**: Deep navy blue (#0f172a)
- **Panels/Cards**: Slightly lighter navy (#1e293b)
- **Text**: Light gray (#e2e8f0)
- **Muted Text**: Medium gray (#94a3b8)

#### Accent Colors
- **Pink**: #ec4899 (used sparingly, ~10%)
- **Blue**: #3b82f6 (primary actions)
- **Purple**: #a855f7 (gradient transitions)

#### Gradients
- **Primary Gradient**: Pink → Purple → Blue (135deg)
  ```css
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 40%, #6366f1 70%, #3b82f6 100%);
  ```
- **Accent Gradient**: Pink → Purple (135deg)
  ```css
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
  ```

### Where to Tweak Colors

#### Global Theme (CSS Variables)
**File**: `frontend/app/globals.css`

```css
:root {
  --background: 222 47% 11%;    /* Deep navy */
  --card: 222 47% 14%;           /* Panel background */
  --primary: 221 83% 53%;        /* Navy blue */
  --accent: 330 81% 60%;         /* Pink */
  /* ... more variables */
}
```

#### Tailwind Config
**File**: `frontend/tailwind.config.ts`

```typescript
theme: {
  extend: {
    backgroundImage: {
      "gradient-primary": "linear-gradient(...)",
      "gradient-accent": "linear-gradient(...)",
    },
  },
}
```

#### Component-Level
- **Buttons**: `frontend/components/ui/Button.tsx` (line 17-21)
- **Badges**: `frontend/components/ui/Badge.tsx` (line 11-18)
- **Sidebar Active**: `frontend/components/Sidebar/Sidebar.tsx` (line 54)

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── (auth)/                 # Auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                  # App pages (with sidebar)
│   │   ├── layout.tsx          # Wraps with AppShell
│   │   ├── dashboard/page.tsx
│   │   ├── applications/
│   │   │   ├── page.tsx        # List view
│   │   │   └── new/page.tsx    # Create form
│   │   └── settings/page.tsx
│   ├── globals.css             # Global styles & theme
│   └── layout.tsx              # Root layout
├── components/
│   ├── AppShell/
│   │   └── AppShell.tsx        # Main layout with sidebar & topbar
│   ├── Sidebar/
│   │   └── Sidebar.tsx         # Collapsible navigation
│   └── ui/                     # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── Input.tsx
│       └── Label.tsx
├── lib/
│   └── utils.ts                # Helper functions (cn)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🧩 Key Components

### AppShell
**File**: `components/AppShell/AppShell.tsx`

Main layout component that includes:
- Collapsible sidebar
- Top bar with user info
- Content area with proper spacing

**Usage:**
```tsx
<AppShell>
  {children}
</AppShell>
```

### Sidebar
**File**: `components/Sidebar/Sidebar.tsx`

Features:
- Smooth collapse/expand animation
- Active route highlighting with gradient
- Icon-only mode when collapsed

**Props:**
- `collapsed: boolean` - Sidebar state
- `onToggle: () => void` - Toggle handler

### Button
**File**: `components/ui/Button.tsx`

**Variants:**
- `primary` - Pink→Blue gradient (default)
- `secondary` - Card background with border
- `ghost` - Transparent, hover effect
- `danger` - Red background

**Sizes:**
- `sm` - Small (h-9)
- `md` - Medium (h-11, default)
- `lg` - Large (h-13)

**Example:**
```tsx
<Button variant="primary" size="lg">
  Create Application
</Button>
```

### Badge
**File**: `components/ui/Badge.tsx`

**Variants:**
- `draft` - Gray
- `applied` - Blue
- `interview` - Purple
- `offer` - Pink gradient (special highlight!)
- `rejected` - Red

**Example:**
```tsx
<Badge variant="offer">OFFER</Badge>
```

### Card
**File**: `components/ui/Card.tsx`

Dark navy panel with rounded corners, shadow, and border.

**Example:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Modal
**File**: `components/ui/Modal.tsx`

Overlay modal with backdrop blur.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `title?: string`
- `size?: "sm" | "md" | "lg"`

**Example:**
```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notes">
  <p>Modal content</p>
</Modal>
```

---

## 🛣️ Routes

| Route | Description | Layout |
|-------|-------------|--------|
| `/` | Redirects to `/login` | None |
| `/login` | Login form | Auth |
| `/register` | Registration form | Auth |
| `/dashboard` | Stats & recent activity | App |
| `/applications` | List all applications | App |
| `/applications/new` | Create new application | App |
| `/settings` | API config & preferences | App |

---

## 🎭 Responsive Design

### Breakpoints
- **Mobile**: < 768px - Sidebar becomes drawer (future)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Current Responsive Features
- Grid layouts adapt (1 col → 2 cols → 4 cols)
- Table scrolls horizontally on mobile
- Sidebar width adjusts based on screen size

---

## 🔌 Connecting to Backend (TODO)

Currently, the frontend uses **mock data**. To connect to the backend:

### 1. Update API Base URL
**File**: `app/(app)/settings/page.tsx`

Set to: `http://localhost:3000` (or your backend URL)

### 2. Create API Service
Create `lib/api.ts`:

```typescript
const API_BASE = "http://localhost:3000";

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// Add more API functions...
```

### 3. Wire Up Forms
Replace `console.log` with actual API calls in:
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(app)/applications/new/page.tsx`

### 4. Add Auth State Management
Consider adding:
- Token storage (localStorage or httpOnly cookies)
- Auth context provider
- Protected route wrapper

---

## 🎨 Customization Examples

### Change Primary Color
**File**: `app/globals.css`

```css
--primary: 260 100% 60%; /* Change to purple */
```

### Change Gradient Direction
**File**: `tailwind.config.ts`

```typescript
"gradient-primary": "linear-gradient(90deg, #ec4899 0%, #3b82f6 100%)"
// 90deg = left to right
// 180deg = top to bottom
```

### Adjust Border Radius
**File**: `app/globals.css`

```css
--radius: 0.5rem;  /* Less rounded (rounded-lg) */
--radius: 1.5rem;  /* More rounded (rounded-3xl) */
```

### Change Sidebar Width
**File**: `components/Sidebar/Sidebar.tsx`

```tsx
collapsed ? "w-20" : "w-72"  // Wider sidebar
```

---

## 🚀 Development Commands

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint
npm run lint
```

---

## 📦 Dependencies

### Core
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety

### Styling
- **TailwindCSS**: Utility-first CSS
- **lucide-react**: Icon library

### Utilities
- **clsx**: Conditional classnames
- **tailwind-merge**: Merge Tailwind classes

---

## 🎯 Next Steps (Future Enhancements)

1. **Connect to Backend**
   - Wire up login/register forms
   - Add token management
   - Implement protected routes

2. **Mobile Sidebar**
   - Convert to drawer on mobile
   - Add overlay/backdrop

3. **Loading States**
   - Add skeleton loaders
   - Loading spinners

4. **Toasts/Notifications**
   - Success/error messages
   - Toast component

5. **Advanced Filters**
   - Multi-select status filter
   - Date range picker
   - Search with debounce

6. **Animations**
   - Page transitions
   - List item animations
   - Micro-interactions

---

**GoGetaJob Frontend** - Built with ❤️ using Next.js, TypeScript, and TailwindCSS
