# The Daily Roast Cafeteria - Online Ordering & Kitchen System

A production-ready, full-stack responsive cafeteria ordering platform featuring customer-facing ordering (Dine-in with table delivery & Takeaway with counter pickup) and an authoritative, live Owner Admin Dashboard with Web Audio notification chimes, instant KOT receipt printing, menu management, and sales reporting.

---

## Features

### A. Customer Storefront
- **Warm Artisan Cafeteria Aesthetic**: Tailored cream/latte background (`#faf7f2`), espresso brown text (`#261c14`), and terracotta orange highlights (`#e07a3f`).
- **Comprehensive Food Categories**: Tea, Coffee, Maggi, Burgers, Sandwiches, Pizza, Snacks, Cold Drinks, and Desserts.
- **Dynamic Cart**: Real-time quantity steppers, item price snapshots, subtotal & total calculation, and availability validation.
- **Dine-In vs Takeaway Flow**:
  - **Dine-In**: Table number is **automatically generated in sequence** (e.g. `Table 001`, `Table 002`, `Table 003`), with an instant "Next Table" control or custom table number input if seated elsewhere.
  - **Takeaway**: Table number not required; shows clear Counter 1 pickup instructions.
- **Pay at Counter**: Transparent Cash / UPI at Counter payment workflow.
- **Automatic 3-Digit Order Numbering**: Concurrency-safe sequential order numbering (`001`, `002`, `003`, `004`...) paired with cryptographically secure random tracking tokens.
- **Live Order Tracking**: Visual 5-step progress timeline (Order Placed → Accepted → Preparing → Ready → Completed) that auto-updates via Realtime subscription.

### B. Owner Admin Dashboard
- **Access Route**: `/admin/login` → `/admin/dashboard`
- **Dashboard Overview Metrics**:
  - Total Orders Today
  - New & Pending Orders
  - Orders Currently in Kitchen (Preparing)
  - Completed Orders
  - Today's Sales (INR ₹) — *strictly excludes cancelled orders*
  - Monthly Sales (INR ₹) — *strictly excludes cancelled orders*
- **Live Orders Stream**:
  - Realtime incoming orders without manual refresh.
  - Two-tone kitchen audio chime synthesized via Web Audio API.
  - Pipeline status controls: `New` → `Accepted` → `Preparing` → `Ready` → `Completed`.
  - Cancellation with prompt for cancellation reason.
  - Thermal printer-ready Kitchen Order Ticket (KOT) format.
- **Menu Management**:
  - Add, edit, and delete food items.
  - Instant on/off toggle for item availability during rush hours.
  - Category creator.
  - Cafeteria Open/Closed master operational switch.
- **History & CSV Export**:
  - Filter orders by date, status, or search query.
  - Export filtered historical orders to CSV (`.csv`).

---

## Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Database**: Supabase PostgreSQL with custom sequences, Row Level Security (RLS) policies, and atomic RPC checkout function.
- **Realtime**: Supabase Realtime channel with BroadcastChannel / local event emitter fallback.
- **Audio**: Web Audio API sound synthesizer (reliable in modern browsers with zero external audio assets).
- **Dual-Engine Architecture**: If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured, the app uses `@supabase/supabase-js` and the PostgreSQL RPC `create_cafeteria_order`. In preview/demo mode, it uses the local persistent engine with identical atomic verification and sequence generation so evaluation tests work immediately.

---

## Local Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The app will run at `http://localhost:3000`.

---

## Supabase Database Setup

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Note down your Project URL and Anon Public Key from **Project Settings → API**.

2. **Apply Database Migrations**:
   - Open your Supabase Dashboard → **SQL Editor**.
   - Open the migration file: `supabase/migrations/20261025000000_init_cafeteria.sql`.
   - Copy the entire SQL content and paste it into the Supabase SQL Editor.
   - Click **Run**.
   - This creates:
     - `profiles`, `categories`, `menu_items`, `orders`, and `order_items` tables.
     - `order_number_seq` PostgreSQL sequence.
     - `create_cafeteria_order` atomic RPC function with server-side price recalculation.
     - Row Level Security (RLS) policies protecting customer order data and restricting admin updates.
     - Enables Supabase Realtime publication for `orders` and `menu_items`.

3. **Create an Admin / Owner Account**:
   - Go to **Authentication → Users** in Supabase.
   - Add a new user with email `admin@dailyroast.com` and your desired password.
   - In SQL Editor, grant admin role to this user:
     ```sql
     INSERT INTO public.profiles (id, full_name, role)
     VALUES ('<USER-UUID-FROM-AUTH>', 'Cafeteria Owner', 'admin')
     ON CONFLICT (id) DO UPDATE SET role = 'admin';
     ```

---

## Vercel Deployment Instructions

1. **Push your code to GitHub / GitLab**.
2. **Import Project into Vercel**:
   - Go to [Vercel](https://vercel.com) and click **Add New Project**.
   - Select your cafeteria repository.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.
3. **Set Environment Variables in Vercel**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
4. **Deploy**:
   - Click **Deploy**. Vercel will build and deploy the production bundle.

---

## Quick Testing Credentials (Built-in Demo)

To test the Owner Admin Dashboard without creating an external Supabase account:
- Click **Owner Login** in the navigation bar.
- Use the quick autofill button or enter:
  - **Email**: `admin@dailyroast.com`
  - **Password**: `admin123`
- You will be redirected to `/admin/dashboard` with full access to live orders, KOT receipts, menu editing, and sales reports.

---

## Verification & Acceptance Checklist

- [x] **Dine-In Order**: Customer selects Dine-In, enters mandatory Table Number, order confirms and displays table number on confirmation and KOT receipt.
- [x] **Takeaway Order**: Customer selects Takeaway, no table number is required, counter pickup notice is displayed.
- [x] **Unique Sequential Order Numbers**: Backend sequence generates format `CAF-YYYYMMDD-XXXX`.
- [x] **Atomic Persistence**: Orders and item snapshots saved with trusted database prices.
- [x] **Realtime Owner Updates**: Incoming orders ring a notification chime and appear in the owner dashboard instantly.
- [x] **Status Progression**: Owner can transition orders (`New` → `Accepted` → `Preparing` → `Ready` → `Completed`).
- [x] **Cancelled Orders Excluded from Sales**: Cancelled orders are excluded from revenue stats.
- [x] **Secure Tracking**: Tracking by secure 32-character token prevents guessing consecutive order IDs.
- [x] **Thermal Receipt Print**: Print-ready KOT view via `window.print()` with `@media print` layout.
