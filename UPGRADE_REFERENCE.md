# WhatsApp Clone v2.0 — Full Upgrade Reference

## Folder Structure

```
whatsapp-clone/
├── render.yaml                     # Render deployment config (backend)
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Zod env validation — app exits if vars missing
│   │   │   └── database.ts         # MongoDB Atlas connection with reconnect handling
│   │   ├── models/
│   │   │   ├── User.ts             # E2EE fields + presence + bcrypt hashing
│   │   │   ├── Message.ts          # encryptedPayload, delivery status, media
│   │   │   └── Conversation.ts     # unreadCount map, lastMessage, participants
│   │   ├── controllers/
│   │   │   ├── authController.ts   # register, login, refresh, uploadKeyBundle, getKeyBundle
│   │   │   ├── chatController.ts   # conversations, messages, seen, user search
│   │   │   └── mediaController.ts  # encrypted file upload via multer → Cloudinary
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT Bearer middleware, AuthRequest type
│   │   │   └── rateLimiter.ts      # global, auth, upload rate limiters
│   │   ├── routes/
│   │   │   ├── auth.ts             # /api/auth/*
│   │   │   └── chat.ts             # /api/chat/*
│   │   ├── services/
│   │   │   ├── jwtService.ts       # access + refresh token generation/verification
│   │   │   └── mediaService.ts     # Cloudinary upload for encrypted blobs
│   │   ├── socket/
│   │   │   └── socketManager.ts    # Full Socket.io manager (auth, presence, E2EE msg flow)
│   │   ├── validators/
│   │   │   └── authValidator.ts    # express-validator chains for register/login/keyBundle
│   │   └── server.ts               # Express app, middleware stack, bootstrap
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Auth/AuthPage.tsx
    │   │   ├── Chat/               AppLayout, ChatPanel, ChatHeader, MessageList, MessageBubble, MessageInput
    │   │   ├── Sidebar/Sidebar.tsx
    │   │   └── UI/                 Avatar, MessageTicks, TypingIndicator
    │   ├── encryption/e2eeService.ts
    │   ├── hooks/                  useTyping, useMessages
    │   ├── services/api.ts
    │   ├── socket/socketClient.ts
    │   ├── store/                  authStore, chatStore, themeStore
    │   ├── types/index.ts
    │   ├── App.tsx, main.tsx, index.css
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── vercel.json
    └── .env.example
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                  | Required | Default     | Description                                         |
|---------------------------|----------|-------------|-----------------------------------------------------|
| `NODE_ENV`                | No       | development | `development` or `production`                       |
| `PORT`                    | No       | 5000        | **Render sets this to 10000 automatically**         |
| `MONGODB_URI`             | **Yes**  | —           | MongoDB Atlas connection string                     |
| `JWT_SECRET`              | **Yes**  | —           | Min 32 chars. Use Render "Generate" button          |
| `JWT_REFRESH_SECRET`      | **Yes**  | —           | Min 32 chars. Different from JWT_SECRET             |
| `JWT_EXPIRES_IN`          | No       | 15m         | Access token lifetime                               |
| `JWT_REFRESH_EXPIRES_IN`  | No       | 7d          | Refresh token lifetime                              |
| `CLIENT_URL`              | **Yes**  | localhost:3000 | Your Vercel frontend URL                        |
| `CLOUDINARY_CLOUD_NAME`   | No       | —           | Required for media upload                           |
| `CLOUDINARY_API_KEY`      | No       | —           | Required for media upload                           |
| `CLOUDINARY_API_SECRET`   | No       | —           | Required for media upload                           |
| `RATE_LIMIT_WINDOW_MS`    | No       | 900000      | Rate limit window in ms                             |
| `RATE_LIMIT_MAX`          | No       | 100         | Max requests per window                             |

### Frontend (`frontend/.env`)

| Variable           | Required | Description                                              |
|--------------------|----------|----------------------------------------------------------|
| `VITE_API_URL`     | **Yes**  | Render backend URL e.g. `https://your-app.onrender.com`  |
| `VITE_SOCKET_URL`  | **Yes**  | Same as API URL                                          |

---

## Deployment Checklist

### Step 1 — MongoDB Atlas

- [ ] Go to https://mongodb.com/atlas and create free account
- [ ] Create a free **M0** cluster (choose any region)
- [ ] Go to **Database Access** → Add a database user with username + password
- [ ] Go to **Network Access** → Add IP Address → Allow access from anywhere `0.0.0.0/0`
- [ ] Go to **Databases** → Connect → Drivers → copy the connection string
- [ ] Replace `<password>` in the string with your actual password
- [ ] Save this string — you need it for Render

---

### Step 2 — Render (Backend)

- [ ] Go to https://render.com → sign up / log in
- [ ] Click **New +** → **Web Service**
- [ ] Connect your GitHub account and select your repo
- [ ] Set **Root Directory** to `backend`
- [ ] Set **Runtime** to `Node`
- [ ] Set **Build Command**: `npm install && npm run build`
- [ ] Set **Start Command**: `npm start`
- [ ] Set **Instance Type**: Free (or Starter to avoid spin-down)
- [ ] Click **Advanced** → Add the following Environment Variables:

```
NODE_ENV        = production
MONGODB_URI     = mongodb+srv://... (your Atlas string)
JWT_SECRET      = (click Generate)
JWT_REFRESH_SECRET = (click Generate)
JWT_EXPIRES_IN  = 15m
JWT_REFRESH_EXPIRES_IN = 7d
CLIENT_URL      = https://your-app.vercel.app  ← add AFTER Vercel deploy
CLOUDINARY_CLOUD_NAME = (if using media)
CLOUDINARY_API_KEY    = (if using media)
CLOUDINARY_API_SECRET = (if using media)
```

- [ ] Click **Create Web Service**
- [ ] Wait for build to finish (2-4 minutes)
- [ ] Copy your Render URL: `https://your-app.onrender.com`
- [ ] Test it: visit `https://your-app.onrender.com/health` — should return `{"status":"healthy"}`

> ⚠️ **Free tier note:** Render free tier sleeps after 15 minutes of inactivity.
> First request after sleep takes ~30 seconds. Use https://uptimerobot.com
> (free) to ping `/health` every 5 minutes to keep it awake.

---

### Step 3 — Vercel (Frontend)

- [ ] Go to https://vercel.com → sign up / log in
- [ ] Click **Add New** → **Project**
- [ ] Import your GitHub repo
- [ ] Set **Root Directory** to `frontend`
- [ ] Framework preset will auto-detect as **Vite**
- [ ] Expand **Environment Variables** and add:

```
VITE_API_URL    = https://your-app.onrender.com
VITE_SOCKET_URL = https://your-app.onrender.com
```

- [ ] Click **Deploy**
- [ ] Wait for build (1-2 minutes)
- [ ] Copy your Vercel URL: `https://your-app.vercel.app`

---

### Step 4 — Connect Frontend ↔ Backend

- [ ] Go back to Render dashboard → your web service → **Environment**
- [ ] Update `CLIENT_URL` to your actual Vercel URL:
  `https://your-app.vercel.app`
- [ ] Click **Save Changes** — Render will auto-redeploy
- [ ] Wait for redeploy to finish
- [ ] Open your Vercel URL — the app should fully work now

---

### Step 5 — Test E2EE is Working

1. Open the app in **two different browsers** (e.g. Chrome + Firefox)
2. Register two different accounts (one in each browser)
3. Search for the other user and open a conversation
4. Send a message from browser 1
5. Open MongoDB Atlas → Browse Collections → messages
6. You should see `encryptedPayload.body` is a random base64 string — **not your message text**
7. The message should display correctly in browser 2 — it was decrypted client-side
8. Check browser DevTools → Application → Local Storage → you should see `wa_e2ee_keys` and `wa_sessions`

---

## Security Features

| Feature                  | Implementation                                |
|--------------------------|-----------------------------------------------|
| End-to-end encryption    | ECDH P-256 + AES-GCM 256-bit (Web Crypto API) |
| JWT access tokens        | 15 min expiry                                 |
| JWT refresh tokens       | 7 day expiry, separate secret                 |
| Password hashing         | bcrypt rounds=12                              |
| Rate limiting            | Global 100/15min, Auth 10/15min               |
| Helmet security headers  | XSS, content-type, frame protection           |
| MongoDB sanitization     | Prevents NoSQL injection                      |
| Input validation         | express-validator on all routes               |
| CORS                     | Locked to CLIENT_URL env var                  |
| Env validation           | Zod schema — server exits if invalid          |
| File upload limits       | 50MB max, MIME type allowlist                 |

---

## Key Notes for Render

1. **PORT** — Render sets this to `10000` automatically. Your server binds to `0.0.0.0:PORT`. Never hardcode a port.

2. **Cold starts** — Free tier sleeps after 15 min idle. Use UptimeRobot to monitor `/health` every 5 min.

3. **Socket.io on Render** — Works out of the box. WebSocket connections are supported on all Render plans.

4. **Auto-deploy** — Every push to your main branch triggers a new deploy automatically.

5. **Logs** — View real-time logs in Render dashboard → your service → **Logs** tab.

6. **Scaling** — To scale horizontally, upgrade to a paid plan and add a Redis adapter for Socket.io session sharing across instances.
