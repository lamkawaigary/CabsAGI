# Cabs AGI - 跨境商務出行

Cross-border taxi booking app for Hong Kong.

## Features

- 🔐 Firebase Authentication (Phone + Email)
- 🗺️ Tencent Map Integration
- 🌍 Cross-border Locations (HK Airports, Border Crossings)
- 💰 Price Calculation with Toll Detection
- 📱 PWA Ready

## Tech Stack

- React 18 + TypeScript + Vite
- Firebase Auth + Firestore
- Tencent Map SDK
- Tailwind CSS

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Cursor Cloud Agent Environment

This repository includes a cloud environment config at `.cursor/environment.json`.

- Base image: `ghcr.io/cursor-images/node-22:latest`
- Install step: `bash scripts/cloud-agent-install.sh`
- Startup step: `bash scripts/cloud-agent-startup.sh`

With this setup, cloud agents come up with a Node/npm toolchain and project dependencies so `npm run lint` and `npm run build` can run out of the box.

## Environment Variables

Create `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## License

MIT
// Updated at Mon Feb 23 04:06:19 HKT 2026
