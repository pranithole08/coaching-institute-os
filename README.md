# Coaching Institute OS

<p align="center">
  <strong>A modern, focused operating system for coaching institutes, tuition centers, and academies.</strong><br>
  Manage students, track attendance, print & scan attendance sheets, automate tests & fees, and send real-time WhatsApp parent updates — with zero parent app install required.
</p>

---

## 🚀 Features

- **📊 Central Institute Dashboard**: Real-time snapshot of daily attendance, fee collections, upcoming tests, student count, and WhatsApp connectivity status.
- **👨‍🎓 Student Management**: Add, update, batch-assign, and search students. Includes one-click CSV spreadsheet import.
- **📝 Attendance & QR Sheet Scanner**:
  - One-tap marking (Present / Absent / Late) for individual students or full batches.
  - Printable A4 attendance sheets with corner registration markers and batch QR codes.
  - Camera/image scanning with automated optical bubble detection and verification screen.
- **💬 Direct WhatsApp Automation**:
  - Integrates with the official Meta WhatsApp Cloud API.
  - Automatic triggers for student absences, fee receipts, payment reminders, test results, and welcome messages.
  - Real delivery status tracking (`sent`, `delivered`, `read`, `failed`).
- **💳 Fees & Invoicing**:
  - Auto-generate monthly student invoices.
  - Support for partial payments, custom fee structures per class, instant PDF receipts, and expense tracking.
  - Automated or manual batch fee reminders with spam-protection windows.
- **📋 Tests & Marks Publishing**: Record cohort marks, calculate percentiles and averages, and publish scorecards directly to parents.
- **👨‍🏫 Faculty & Timetable Management**: Weekly scheduling with automated room and teacher clash detection.
- **📈 Advanced Analytics**: Attendance trends, revenue vs. expense metrics, cohort score distributions, and student attention lists.

---

## 🛠 Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI, Lucide Icons, Recharts
- **Backend**: [Hono](https://hono.dev) (Ultra-fast web standards framework)
- **Database & ORM**: SQLite / LibSQL with [Prisma ORM 7](https://www.prisma.io)
- **Document & Image Processing**: PDF.js, jsQR, Canvas CV scanner

---

## ⚡ Quick Start

### Prerequisites
Make sure you have [Bun](https://bun.sh) installed (v1.0+).

```bash
# Clone the repository
git clone https://github.com/pranithole08/coaching-institute-os.git
cd coaching-institute-os

# Install dependencies
bun install

# Generate Prisma client and start development server
bun run db:generate
bun run dev:full
```

The application will be running at:
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`

---

## 🔑 Demo Accounts

The database comes pre-seeded with sample data across 4 batches:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@institute.test` | `admin123` |
| **Teacher** | `teacher@institute.test` | `teacher123` |

> *Tip: Change these credentials under **Settings → Team** before using in production.*

---

## 🐳 Production Deployment

### Option 1: Docker (Single Container)

A production-ready multi-stage `Dockerfile` is included. It builds the frontend and serves both static assets and API routes on port 3001.

```bash
# Build Docker image
docker build -t coaching-institute-os .

# Run with persistent volume for database
docker run -d \
  -p 3001:3001 \
  -v coaching_data:/app/prisma \
  --name coaching-app \
  coaching-institute-os
```

### Option 2: Railway / Render / Fly.io

1. Link your GitHub repository to Railway or Render.
2. The platform will automatically detect the `Dockerfile`.
3. Set the build environment variable `PORT=3001`.
4. Attach a persistent disk mapped to `/app/prisma` to preserve your SQLite database across deploys.

---

## 📱 WhatsApp Cloud API Integration

The system uses Meta's official WhatsApp Business Cloud API:

1. Obtain a **Phone Number ID** and **Permanent Access Token** from [Meta for Developers](https://developers.facebook.com).
2. Go to **Settings → WhatsApp** in the dashboard and enter your credentials.
3. Configure your Webhook URL:
   - **URL**: `https://<your-domain>/api/app/whatsapp/webhook`
   - **Verify Token**: Any custom string configured in your Settings
   - **Subscription**: Check `messages`

---

## 📁 Project Structure

```
├── Dockerfile              # Multi-stage production container build
├── server.tsx              # Unified Hono production server & API router
├── custom-routes.ts        # Core institute business logic & endpoints
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── dev.db              # SQLite database
├── src/
│   ├── components/         # Reusable UI components, sheets, scanner
│   ├── pages/              # Dashboard, Students, Attendance, Finance, Tests
│   ├── lib/                # Database adapter, scanner geometry, formatters
│   └── main.tsx            # React application root
└── vite.config.ts          # Vite build config
```

---

## 📜 Available Scripts

- `bun run dev:full` — Runs backend API (`:3001`) and Vite client (`:3000`) concurrently.
- `bun run dev:server` — Runs Hono backend server in watch mode.
- `bun run dev:client` — Starts Vite dev server.
- `bun run build` — Compiles production-optimized frontend bundle into `dist/`.
- `bun run start` — Starts unified production server.
- `bun run db:studio` — Opens Prisma Studio visual database browser.

---

## 📄 License

Licensed under the [Apache-2.0 License](LICENSE).
