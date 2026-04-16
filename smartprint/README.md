# SmartPrint — Privacy-First Printing Platform

SmartPrint is a premium, secure, and privacy-first document printing platform built for hackathons. It eliminates the need for sharing personal documents via WhatsApp or email by providing an end-to-end encrypted, auto-destructing printing flow.

## 🚀 Quick Start (under 5 commands)

```bash
cd smartprint
npm install --legacy-peer-deps
# Update .env with your DATABASE_URL and Google OAuth keys
npx prisma db push
node prisma/seed.js
npm run dev
```

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: NextAuth.js v5 (Google OAuth)
- **Encryption**: AES-GCM 256-bit (Client-side Web Crypto API)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 🔐 Security Features
- **Auto-Destruct**: Files are physically deleted from the server 100 seconds after the shop opens them.
- **Client-side Encryption**: "Secure It" mode encrypts files before upload; keys never reach the server.
- **Screen Protection**: Admin portal blurs content if the window loses focus or DevTools are opened.
- **Privacy Guards**: Right-click, copy, and standard print shortcuts are disabled in the admin job viewer.
- **Friendly IDs**: Jobs are identified by memorable IDs like "BlueFox391" instead of complex UUIDs.

## 📱 User Portal
- **Scan QR**: Instantly connect to a shop.
- **Find Nearby**: Use geolocation to find the closest SmartPrinters.
- **Recent Shops**: Remembers your last 3 visited shops (stored in secure cookies).
- **Two-Layer Settings**: Simple basics + advanced configuration accordion.

## 💼 Admin Portal
- **Real-time Dashboard**: Jobs appear automatically as customers send them.
- **Privacy Timer**: A circular countdown visualizes the remaining life of the document.
- **Google Onboarding**: Easy setup with reverse geocoding for shop location.
