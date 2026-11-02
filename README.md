# 🖨️ SmartPrint — Privacy-First Printing Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33.2-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **Eliminating data leaks at print & xerox shops.** An end-to-end encrypted, zero-knowledge, auto-destructing document transmission and silent hardware printing platform.

---

## 📌 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Key Features](#-key-features)
  - [Zero-Knowledge Client-Side Encryption](#-zero-knowledge-client-side-encryption)
  - [100-Second Self-Destruct Lifecycle](#-100-second-self-destruct-lifecycle)
  - [Admin Screen Shield & Anti-Exfiltration](#-admin-screen-shield--anti-exfiltration)
  - [Electron Desktop App & Silent Hardware Printing](#-electron-desktop-app--silent-hardware-printing)
  - [Smart Document & Passport Photo Studio](#-smart-document--passport-photo-studio)
  - [Automatic PDF Color / B&W Splitting](#-automatic-pdf-color--bw-splitting)
  - [Geolocation Shop Radar & Heartbeat Presence](#-geolocation-shop-radar--heartbeat-presence)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running the Next.js Web App](#running-the-nextjs-web-app)
  - [Running & Building the Electron Desktop App](#running--building-the-electron-desktop-app)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Security Model & Threat Mitigation](#-security-model--threat-mitigation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚨 The Problem

Millions of people every day share personal and highly sensitive documents with local print, cyber cafe, and xerox operators:
- 🪪 **Identity Credentials**: Passports, National IDs (Aadhaar, Social Security), Driving Licenses.
- 💼 **Personal & Career Data**: Resumes, Offer Letters, Employment Contracts, Academic Transcripts.
- 🏥 **Medical & Legal Records**: Diagnostic Reports, Prescriptions, Legal Affidavits, Court Documents.
- 💳 **Financial Records**: Bank Statements, Tax Returns (ITR, W-2), Pay Slips.

### The Attack Surface at Local Print Shops:
1. **Unencrypted Channels**: Customers email or WhatsApp documents to the shop's personal number.
2. **Permanent Local Footprint**: Files stay indefinitely inside the shopkeeper's `Downloads` folder, WhatsApp desktop cache, or Windows Recycle Bin.
3. **Exposed to Third Parties**: Subsequent customers standing by the screen or using shared computers can view, copy, or exfiltrate documents with zero accountability.

---

## 💡 The Solution

**SmartPrint** completely re-engineers document dispatch for print centers into a **zero-trust, privacy-first workflow**:

1. **Zero Registration**: Customers need **no account**, no phone number, and no email.
2. **Client-Side AES-256 Encryption**: Documents are encrypted directly in the user's browser via Web Crypto API before hitting the network.
3. **Ephemeral Storage**: Documents are held in memory/temporary storage and shredded immediately after printing.
4. **100-Second Self-Destruct**: Once the shop opens the job, a circular countdown timer starts; upon reaching 0, files are wiped from the disk.
5. **Silent Direct Printing**: The companion Electron application sends documents straight to the hardware printer, blocking preview windows where files could be saved as PDF or intercepted.

---

## ✨ Key Features

### 🔐 Zero-Knowledge Client-Side Encryption
- Optional **"Secure It"** mode encrypts documents using **AES-GCM 256-bit** encryption in the browser.
- Uses a cryptographically strong 12-byte initialization vector (`IV`) prepended to each file.
- The decryption key is generated on the client and never stored on the server.
- The shop can print the document directly without ever being able to view or inspect the unencrypted content.

### ⏱️ 100-Second Self-Destruct Lifecycle
- When an operator clicks into a job, a **100-second circular countdown timer** starts.
- At `00:00`, the server initiates an automated shred pass via `deleteJobFiles(jobId)`.
- Files are unlinked and purged from `/tmp/smartprint/`.
- A global background worker additionally sweeps and purges any uncollected jobs older than 1 hour.

### 🛡️ Admin Screen Shield & Anti-Exfiltration
- **Window Blur Protection**: If the operator switches tabs, minimizes the window, or clicks away, the document viewer instantly blurs with a security shield.
- **DevTools Trap**: Best-effort detection that activates screen protection if developer inspection tools are opened.
- **Anti-Copy Controls**: Disables right-click context menu, clipboard copy (`Ctrl+C`), file dragging, and text selection (`user-select: none`).
- **Shortcut Interception**: Blocks `Ctrl+S` (Save), `Ctrl+P` (standard browser print dialog), `F12`, and `PrintScreen`.

### 🖥️ Electron Desktop App & Silent Hardware Printing
- Native Windows and macOS application built specifically for print shop counters.
- **Direct Silent Printing**: Uses Electron's native `webContents.print({ silent: true })` API to print directly to connected hardware printers.
- **Virtual Printer Bypassing**: Automatically detects and rejects virtual print drivers (`Microsoft Print to PDF`, `OneNote`, `Fax`) to prevent operators from saving copies to disk.
- **Seamless OAuth Bridge**: Custom deep-linking protocol (`smartprint://auth?token=...`) allows shop owners to authenticate with Google OAuth in their secure system browser and automatically transfers session tokens to Electron without exposing credentials inside embedded webviews.

### ✂️ Smart Document & Passport Photo Studio
- **Multi-Format Support**: Native handling for PDF, Word documents (`.docx`), Excel spreadsheets (`.xlsx`, `.csv`), and Images (`.png`, `.jpg`, `.webp`).
- **Client-Side Spreadsheets**: Converts `.xlsx` and `.csv` files to paginated PDFs on the client using SheetJS and jsPDF AutoTable.
- **Passport Photo Grid Studio**: Built-in image editor powered by Cropper.js and Konva. Offers precision adjustments (Brightness, Contrast, Saturation, Exposure) and automated multi-up layouts:
  - 1 Full Page
  - 2 Photos per page
  - 4 Photos per page
  - 9 Photos per page
  - **35 Passport Photos on an A4 sheet** with cutting guidelines.

### 🎨 Automatic PDF Color / B&W Splitting
- SmartPrint parses incoming PDF documents page-by-page using `pdf-lib`.
- Customers with mixed documents (e.g., color cover + black-and-white pages) can specify color vs. B&W page ranges (e.g. `1,3,5-8`).
- The system automatically extracts and splits the file into two optimized sub-jobs (`_COLOR_pages.pdf` and `_BW_pages.pdf`), dramatically reducing print costs for the customer.

### 🗺️ Geolocation Shop Radar & Heartbeat Presence
- **Interactive OpenStreetMap**: Leaflet-powered map displaying registered print centers nearby.
- **Real-Time Heartbeat**: Shop terminals send an active ping every 10 seconds via `/api/admin/heartbeat`. Shops are dynamically marked **Online** (green beacon) or **Offline** (red beacon).
- **Multiple Discovery Modes**:
  1. **Scan QR**: Camera scanner scans the QR code placed at the physical shop counter.
  2. **6-Character Shop ID**: Type an easy-to-read code (e.g., `SP0001` or `kndv01`).
  3. **Recent Shops**: Remembers the customer's last 3 visited shops via secure local cookies.
  4. **Geolocation Radar**: Automatically finds shops within radius of the user's device coordinates.

---

## 📐 Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Customer
    participant Web as 🌐 Customer Web Portal
    participant API as ⚡ Next.js API Routes
    participant DB as 🗄️ PostgreSQL (Neon)
    participant FS as 📁 Ephemeral Disk (/tmp)
    participant Electron as 🖥️ Electron Admin App
    actor Admin as 👨‍💼 Shopkeeper

    Note over User,Web: 1. Discovery & Selection
    User->>Web: Scan Shop QR / Select Nearby Shop
    Web->>API: Verify Shop ID & Heartbeat Status
    API-->>Web: Shop Verified (Online)

    Note over User,Web: 2. Document Prep & Encryption
    User->>Web: Upload Document (PDF/DOCX/Images)
    User->>Web: Configure Print Settings & Enable "Secure It"
    Web->>Web: AES-GCM 256-bit Encryption in Browser (Key kept client-side)

    Note over Web,FS: 3. Job Dispatch
    Web->>API: POST /api/jobs/create (Payload + Settings)
    API->>FS: Save Encrypted/Raw Files to /tmp/smartprint/<jobId>
    API->>DB: Create Job Record (Friendly 4-digit ID, TTL = 1h)
    API-->>Web: Return 4-digit Queue Token (e.g., "0042")
    Web-->>User: Display Success Screen with Queue Token

    Note over Admin,Electron: 4. Shop Terminal & Print
    Admin->>Electron: Observe Real-Time Queue
    Electron->>API: GET /api/jobs (Polls Queue)
    Admin->>Electron: Open Job "0042"
    Electron->>API: GET /api/jobs/<jobId> (Status -> "opened")
    API->>DB: Set openedAt = NOW() (Starts 100s TTL)
    Electron->>Electron: Start 100s Circular Countdown
    Electron->>Electron: Direct Hardware Print (Silent, no preview dialog)
    Electron->>API: POST /api/jobs/<jobId>/print (Status -> "printed")

    Note over API,FS: 5. Auto-Destruction
    rect rgb(255, 230, 230)
    Note over API,FS: Timer reaches 0 or Admin clears
    API->>FS: deleteJobFiles(jobId) (Files unlinked & wiped)
    API->>DB: Update status = "expired", expiredAt = NOW()
    end
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Modern full-stack React framework with server routes |
| **Frontend** | **React 18 & TypeScript** | Component architecture with end-to-end type safety |
| **Styling** | **Tailwind CSS 3.4** | Utility-first styling with custom dark/light theme tokens |
| **Motion** | **Framer Motion 12** | Spring-based layout transitions and micro-animations |
| **Icons** | **Lucide React** | Consistent, lightweight vector icons |
| **Desktop Client** | **Electron 33 + Builder** | Cross-platform desktop runtime for silent printing |
| **ORM & Database** | **Prisma 5.22 + PostgreSQL** | Type-safe queries with Neon connection pooling |
| **Authentication** | **NextAuth.js v5 (Auth.js)** | Google OAuth 2.0 with Prisma database adapter |
| **Cryptography** | **Web Crypto API (Subtle)** | Client-side AES-GCM 256-bit encryption & HMAC-SHA256 tokens |
| **PDF Processing** | **pdf-lib & react-pdf** | PDF manipulation, page extraction, splitting & previewing |
| **Office Documents** | **SheetJS (xlsx) & Mammoth** | Client-side Excel to PDF conversion & Word doc parsing |
| **Image Studio** | **Cropper.js & Konva** | Passport photo crop tool, canvas filters & multi-up layout |
| **Maps & QR** | **Leaflet & qr-scanner** | Geolocation interactive map & high-speed camera QR reader |

---

## 📂 Repository Structure

```text
smartprint-v1/
├── app/                        # Root Next.js route fallbacks & templates
├── components/                 # Root UI component references
├── design-md/                  # Design language references & tokens
├── prisma/                     # Database seed configuration
│   └── seed.js                 # Initial seed for demo Kandivali shop
│
├── smartprint/                 # Primary Next.js & Electron Workspace
│   ├── app/                    # Next.js 14 App Router
│   │   ├── admin/              # Shopkeeper admin portal
│   │   │   ├── [secret]/       # Protected secret routes
│   │   │   ├── auth/           # Admin Google OAuth login
│   │   │   ├── auth-bridge/    # Deep-link auth bridge for Electron
│   │   │   ├── dashboard/      # Real-time queue & job manager
│   │   │   ├── jobs/[id]/      # Detailed single-job inspector
│   │   │   └── onboarding/     # Shop name, geolocation & QR generator
│   │   │
│   │   ├── api/                # REST API backend routes
│   │   │   ├── admin/          # Admin endpoints (cleanup, heartbeat, onboard, profile)
│   │   │   ├── auth/           # NextAuth handlers & Electron session transfer
│   │   │   ├── jobs/           # Job lifecycle (create, fetch, stream, print, clear)
│   │   │   ├── preview/        # File preview generation & temporary tokens
│   │   │   └── shops/          # Shop discovery (by-id, nearby, token)
│   │   │
│   │   ├── user/               # Customer portal (Upload -> Configure -> Queue)
│   │   ├── globals.css         # Theme tokens, dark mode, animation utilities
│   │   ├── layout.tsx          # Root HTML structure and font setup
│   │   └── page.tsx            # Landing page with interactive demo
│   │
│   ├── components/             # Reusable UI component modules
│   │   ├── admin/              # SecurityShield, CountdownTimer, JobCard, JobViewer, QRModal
│   │   ├── theme/              # ThemeProvider & ThemeToggle (dark/light)
│   │   └── user/               # FileUpload, PrintSettings, PDFPreview, ImageEditor, NearbyMap
│   │
│   ├── electron-admin/         # Electron Desktop Application v1.1.0
│   │   ├── main.js             # Main process, protocol registration, silent hardware print
│   │   ├── preload.js          # Context bridge exposing safe IPC APIs
│   │   └── package.json        # Electron build scripts and metadata
│   │
│   ├── lib/                    # Core utility libraries
│   │   ├── adminPresence.ts    # Online/offline presence threshold calculation
│   │   ├── cleanup.ts          # Ephemeral file shredding & background sweeps
│   │   ├── db.ts               # Database helpers
│   │   ├── encryption.ts       # Web Crypto AES-GCM 256 encryption & decryption
│   │   ├── printLayout.ts      # Paper dimensions (A2-A6, Letter, etc.) and margins
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── shopId.ts           # Unique 6-character shop code generator
│   │   ├── storage.ts          # File write/read, HMAC signed URL validation
│   │   ├── types.ts            # Shared TypeScript data models
│   │   └── usernames.ts        # Atomic 4-digit sequential queue ID generator
│   │
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema (User, Admin, Job, Counter, TransferToken)
│   │   └── seed.js             # Demo shop seed script
│   │
│   ├── public/                 # Static assets and icons
│   ├── auth.ts                 # NextAuth v5 configuration & Google OAuth provider
│   ├── middleware.ts           # Route protection & session validation
│   ├── next.config.js          # Next.js build & header configuration
│   ├── package.json            # Web application dependencies & scripts
│   └── tailwind.config.js      # Tailwind theme configuration
│
└── README.md                   # Repository documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.18.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: Local PostgreSQL instance or cloud database (e.g., [Neon](https://neon.tech/), Supabase)
- **Google Cloud Console Credentials** (for admin Google OAuth sign-in)

---

### Environment Configuration

Create a `.env` file inside the `smartprint/` directory:

```bash
cd smartprint
cp .env.example .env
```

Populate the following variables:

```env
# ─── DATABASE (PostgreSQL) ──────────────────────────────────
# Connection string with SSL (supports Neon connection pooling)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-1.aws.neon.tech/smartprint?sslmode=require"

# ─── AUTHENTICATION (NextAuth v5 / Auth.js) ──────────────────
# Generate a random 32-character secret: openssl rand -base64 32
AUTH_SECRET="your-32-byte-random-secret-key-here"

# Base URL of your app
NEXTAUTH_URL="http://localhost:3000"
BASE_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# ─── GOOGLE OAUTH CREDENTIALS ────────────────────────────────
# From Google Cloud Console -> APIs & Services -> Credentials
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# ─── ADMIN DEFAULTS (Optional) ──────────────────────────────
ADMIN_ID="smartprint_shop_001"
NEXT_PUBLIC_ADMIN_ID="smartprint_shop_001"
ADMIN_SECRET_PATH="printshop2024"
```

> [!TIP]
> For Google OAuth in local development, add `http://localhost:3000/api/auth/callback/google` to your **Authorized Redirect URIs** in the Google Cloud Console.

---

### Database Setup

Run Prisma to push the schema models to your database and generate the Prisma Client:

```bash
cd smartprint

# Generate Prisma Client
npx prisma generate

# Sync schema to PostgreSQL
npx prisma db push

# Seed demo shop in Kandivali, Mumbai
node prisma/seed.js
```

---

### Running the Next.js Web App

Install dependencies and start the development server:

```bash
cd smartprint
npm install --legacy-peer-deps
npm run dev
```

Open your browser to:
- **Customer Portal**: [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/user](http://localhost:3000/user)
- **Admin Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
- **Admin Login**: [http://localhost:3000/admin/auth](http://localhost:3000/admin/auth)

---

### Running & Building the Electron Desktop App

The Electron admin client runs side-by-side with your Next.js application:

```bash
# In a new terminal window
cd smartprint/electron-admin

# Install Electron dependencies
npm install

# Start in development mode (pointing to http://localhost:3000)
npm start
```

#### Packaging Electron for Production (Windows / macOS)

```bash
cd smartprint/electron-admin

# Build unpacked executable
npm run pack

# Build production installer (.exe / .dmg)
npm run build
```
Built binaries are emitted into `smartprint/electron-admin/dist/`.

---

## 📡 API Reference

### Customer Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/jobs/create` | Upload documents, configure print settings, create queue job |
| `GET` | `/api/shops/[token]` | Fetch shop details and online status by shop token |
| `GET` | `/api/shops/by-id/[shopId]` | Look up shop information by 6-character code (e.g. `SP0001`) |
| `GET` | `/api/shops/nearby?lat=...&lng=...` | Retrieve nearby shops sorted by distance with live heartbeat status |
| `POST` | `/api/preview/upload` | Temporary preview generator for document pages |

### Admin Endpoints (Authenticated)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/jobs` | Retrieve all jobs for the authenticated shopkeeper |
| `GET` | `/api/jobs/[jobId]` | Retrieve single job, sign file download tokens, trigger 100s TTL |
| `POST` | `/api/jobs/[jobId]/print` | Mark job as successfully printed |
| `DELETE` | `/api/jobs/clear-completed` | Purge all printed and expired jobs and wipe files from disk |
| `DELETE` | `/api/jobs/clear-all` | Purge all jobs regardless of status |
| `POST` | `/api/admin/heartbeat` | Send 10s presence ping (`online` / `offline`) from terminal |
| `GET` | `/api/admin/profile` | Retrieve shopkeeper profile, coordinates, and QR token |
| `POST` | `/api/admin/onboard` | Register shop name, reverse-geocode coordinates, issue QR code |
| `GET` | `/api/admin/cleanup` | Execute manual shredding pass on expired jobs |

### Electron Session Transfer Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/transfer?token=...` | Exchange single-use token from system browser into Electron session |

---

## 🗄️ Database Schema

```mermaid
erDiagram
    User ||--o{ Account : "has"
    User ||--o{ Session : "has"
    User ||--o| Admin : "owns"
    User ||--o{ ElectronTransferToken : "requests"
    Admin ||--o{ Job : "processes"

    User {
        string id PK
        string name
        string email UK
        datetime emailVerified
        string image
    }

    Admin {
        string id PK
        string userId FK
        string shopName
        string qrCode UK
        string shopId UK
        float latitude
        float longitude
        string address
        datetime createdAt
        datetime lastLoginAt
    }

    Job {
        string id PK
        string userId
        string userToken
        string adminId FK
        boolean isEncrypted
        json settings
        string status
        int fileCount
        datetime createdAt
        datetime openedAt
        datetime printedAt
        datetime expiredAt
        int printCount
    }

    Counter {
        string id PK
        int value
    }

    ElectronTransferToken {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
        boolean used
        datetime createdAt
    }
```

---

## 🔒 Security Model & Threat Mitigation

| Threat Vector | Standard Print Shop Vulnerability | SmartPrint Mitigation |
| :--- | :--- | :--- |
| **Data Lingering** | Documents stay indefinitely in `Downloads` or WhatsApp media folders | **100-Second Hard TTL**: Files unlinked and deleted via Node.js `fs.unlinkSync` once viewed. 1-hour global fallback sweep. |
| **Shop Operator Snooping** | Shopkeeper reads, previews, or archives personal customer documents | **Client-Side AES-256 ("Secure It")**: Files are encrypted in-browser; Electron prints directly to hardware without rendering content. |
| **Over-the-Shoulder Peeking** | Neighboring customers view confidential docs on the shopkeeper's monitor | **Security Shield**: The screen blurs immediately if the application window loses focus or DevTools is detected. |
| **Unauthorized File Copies** | Shopkeeper clicks "Save As PDF" or copies files to a flash drive | **Anti-Exfiltration**: Disables right-click, selection, copy, and keyboard shortcuts (`Ctrl+S`, `PrintScreen`). Electron disables file download dialogs. |
| **Virtual Printer Interception** | Software print drivers export print jobs to local PDF or XPS files | **Hardware Printer Filter**: Electron inspects connected drivers and filters out virtual printers to guarantee output goes to physical hardware. |
| **Insecure Electron Authentication** | Embedded Chromium webviews are vulnerable to clickjacking & credential theft | **System Browser Deep Linking**: OAuth occurs in the user's trusted system browser and hands off via `smartprint://` deep links with 5-minute single-use transfer tokens. |

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome!

1. Fork the Project: `https://github.com/yv3000/smartprint-v1`
2. Create your Feature Branch: `git checkout -b feat/amazing-feature`
3. Commit your Changes: `git commit -m 'feat: add amazing feature'`
4. Push to the Branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for privacy, security, and effortless printing everywhere.
</p>
