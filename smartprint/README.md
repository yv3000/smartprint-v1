# 🖨️ SmartPrint — Web Application & Core Services

> Core Next.js 14 Web Application, Prisma ORM, and Companion Electron Desktop Client for the SmartPrint Privacy-First Printing Platform.

Please refer to the main repository [README.md](../README.md) for full architectural documentation, sequence diagrams, and threat models.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, AUTH_SECRET, and Google OAuth credentials

# 3. Synchronize database schema and seed demo shop
npx prisma generate
npx prisma db push
node prisma/seed.js

# 4. Start Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the user portal or [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard) for the shopkeeper admin dashboard.

---

## 🖥️ Electron Companion App

For the native desktop hardware print application:

```bash
cd electron-admin
npm install
npm start
```

For production builds:
```bash
npm run pack   # Unpacked build in dist/
npm run build  # Windows NSIS installer / portable exe
```

---

## 🛠️ Tech Stack & Key Libraries

- **Framework**: Next.js 14 (App Router) & React 18
- **Database**: PostgreSQL (Neon connection pooling) & Prisma ORM
- **Auth**: NextAuth.js v5 (Google OAuth with database session strategy)
- **Encryption**: AES-GCM 256-bit (Web Crypto API)
- **Styling & Motion**: Tailwind CSS & Framer Motion
- **Document Handling**: `pdf-lib`, `react-pdf`, `mammoth`, `docx-preview`, `xlsx`, `jspdf`, `jspdf-autotable`
- **Image Editing**: `cropperjs`, `react-cropper`, `konva` (1, 2, 4, 9, 35 passport photo grid)
- **Hardware Integration**: Electron 33 with native silent print pipeline (`webContents.print`)
