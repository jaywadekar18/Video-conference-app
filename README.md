# Peer-to-Peer Video Conference App

A lightweight, fully responsive 1-to-1 WebRTC video conferencing application. Built with **React** (Vite) on the frontend and **Node.js + Socket.IO** for the signaling backend.

## Features
- **True Peer-to-Peer**: Video and audio data is sent directly between users via WebRTC (`RTCPeerConnection`), ensuring minimum latency.
- **Room-based Architecture**: Users can generate a random secure room code or join an existing meeting instantly.
- **Media Controls**: Easily mute audio or turn off video streams during the call.
- **Responsive Design**: Polished, dark-themed UI that perfectly scales to mobile devices and tablets.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Socket.IO Client
- **Backend (Signaling Server)**: Node.js, Express, Socket.IO, TypeScript

---

## 🚀 Getting Started (Local Development)

Because this app involves both a frontend client and a backend signaling server, you need to run both simultaneously in **two separate terminal windows**.

### 1. Start the Backend Server
```bash
cd server
npm install
npm run dev
```
*(The backend will run on `http://localhost:3000`)*

### 2. Start the Frontend Client
Open a new terminal window:
```bash
npm install
npm run dev
```
*(The frontend will run on `http://localhost:5173`. Open this URL in two separate browser windows to test the connection locally)*

---

## 🌍 Deployment Guide

To put this app live on the internet, you must host the frontend and backend on separate services.

### Deploying the Backend (Render, Railway, Heroku)
The `server` directory contains a persistent Node.js WebSockets server. It **cannot** be deployed to static hosts like Netlify. We recommend **Render.com**.
1. Create a new Web Service on Render linked to this repository.
2. **Root Directory**: `server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. *Once deployed, copy your live backend URL.*

### Deploying the Frontend (Netlify, Vercel)
The root directory can be hosted on any static site hosting service like Netlify.
1. Create a new site from your Git repository on Netlify.
2. **Build Command**: `npm run build`
3. **Publish Directory**: `dist`
4. **Environment Variables**: Add a new variable named `VITE_SERVER_URL` and set its value to your live backend URL (e.g., `https://my-video-backend.onrender.com`).
5. Deploy!
