# Habit Tracker

A social accountability app for building good habits and breaking bad ones. Track daily check-ins, keep streaks alive, join anonymous support groups or get paired one-on-one with someone working on the same habit, and lean on built-in safety tools when things get hard.

**Live demo:** https://habit-tracker-mqbc-puce.vercel.app

---

## Features

- **Habit tracking** — Create habits you want to quit (smoking, sugar, social media, etc.) or build (exercise, meditation, journaling), check in daily, and track streaks automatically.
- **Anonymous identity** — Every user gets a randomly generated alias (e.g. "Quiet Falcon442") so real identities stay private across groups and chats.
- **Support groups** — Join a small group of people working on the same category of habit, share progress, and react to each other's posts.
- **1-on-1 pairing** — Get matched with another user working on the same goal for direct, private support via real-time chat.
- **Real-time chat** — Socket.io-powered messaging with typing indicators, unread counts, and live notifications.
- **Distract Me** — In a tough moment, get an instant quote, a breathing/physical activity suggestion, a ping to your buddy, or a support request to your group.
- **Safety net** — Posts are automatically scanned for crisis language. If something concerning is detected, the app surfaces emergency contacts, distraction options, and a verified crisis helpline directory.
- **Account verification & password reset** — Email-based verification codes and secure password reset flow.
- **Moderation basics** — Report posts, block users, and soft-delete/edit your own posts.

---

## Tech Stack

**Backend**
- Node.js + Express (TypeScript)
- PostgreSQL with Prisma ORM
- Socket.io for real-time messaging
- JWT-based auth with refresh token rotation
- Zod for request validation
- Winston for logging

**Frontend**
- React + TypeScript (Vite)
- Tailwind CSS
- Zustand for state management
- Framer Motion for animations
- Socket.io client
- React Router

---

## Project Structure

```
backend/
  src/
    controllers/   # Route handlers
    routes/        # Express route definitions
    services/      # Business logic (matching, streaks, safety checks, distractions)
    middleware/     # Auth, validation, rate limiting
    socket/        # Real-time chat + group feed events
    lib/           # Tokens, logging, validation schemas, crisis resources
  prisma/
    schema.prisma  # Database schema
    migrations/    # Migration history

frontend/
  src/
    pages/         # Route-level pages (Dashboard, Chat, Distract Me, Auth, etc.)
    components/    # Reusable UI components
    lib/           # API clients, socket setup, local storage helpers
    store/         # Zustand stores (auth, chat)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/habit_tracker
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
PORT=4000
```

Run migrations and seed distraction content:

```bash
npx prisma migrate deploy
npm run seed
```

Start the dev server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_URL=http://localhost:4000/api
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Database Schema Overview

Core models include:

- **User** — Account info, alias, avatar seed, emergency contact, verification state
- **Habit** / **CheckIn** / **Streak** — Habit definitions, daily logs, and cached streak calculations
- **Group** / **GroupMembership** — Pair and small-group matching
- **Post** / **Reaction** / **Report** — Group feed content and moderation
- **SafetyEvent** — Logged whenever crisis language is detected in a post
- **Conversation** / **ChatMessage** / **PairQueue** — Real-time 1-on-1 and group messaging
- **DistractionContent** / **DistractionLog** — Quotes, verses, and activities served through Distract Me

See `backend/prisma/schema.prisma` for the full schema.

---

## Safety Design Notes

The app includes a pattern-matching safety layer that scans posts for crisis-related language (self-harm risk, acute relapse crisis, etc.). When triggered, it:

1. Flags the post and logs a `SafetyEvent`
2. Surfaces the user's emergency contact (if set)
3. Offers an immediate Distract Me suggestion
4. Points to a verified, up-to-date global helpline directory (findahelpline.com) rather than a hardcoded number, since crisis line numbers vary by country and change over time

This is intentionally coarse (keyword/phrase matching, not ML) and errs toward showing support resources more often rather than less.

---

## Known Limitations / Roadmap

- Nearby coffee shop suggestions (via Google Places) are not yet implemented
- No admin dashboard for moderating open reports (currently requires direct DB/API access)
- Group chat push notifications are limited to direct messages for now

---

## License

ISC
