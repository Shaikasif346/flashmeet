# 📹 FlashMeet — Video Calling App

A full-stack real-time video calling application built with WebRTC, React, Node.js and Socket.io.

## 🚀 Features
- 1-on-1 and group video calls
- Screen sharing
- In-call chat
- Mute/unmute audio & video
- Room creation with shareable codes
- JWT Authentication

## 🛠️ Tech Stack
- **Frontend:** React.js, WebRTC, Simple-Peer
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB Atlas
- **Auth:** JWT

## 📦 Setup

```bash
# Install all dependencies
npm run install-all

# Create .env in server/
cp server/.env.example server/.env
# Fill in your MongoDB URI and JWT secret

# Run both server and client
npm run dev
```

## 🌐 Deployment
- Backend → Render.com
- Frontend → Vercel.com
