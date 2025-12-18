# ENSD SPORT - Telegram Sports Analytics Platform

## Overview
ENSD SPORT is a Telegram Mini App platform for sports predictions and analytics. It combines free and VIP content, gamification (points, streaks, daily bonuses), and an admin panel for managing predictions.

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter
- **UI Components**: Shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query
- **Telegram Integration**: Telegram Web App SDK

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Bot**: node-telegram-bot-api

### Key Directories
```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (Home, Profile, Stats, Admin)
│   ├── lib/            # Utilities (queryClient, telegram SDK wrapper)
│   └── hooks/          # Custom React hooks
server/
├── db.ts              # Database connection
├── routes.ts          # API endpoints
├── storage.ts         # Database operations
├── telegram-bot.ts    # Telegram bot logic
└── index.ts           # Server entry point
shared/
└── schema.ts          # Drizzle schema & TypeScript types
```

## Features

### User Features
- View sports predictions (football, hockey, MMA, UFC, boxing)
- Filter predictions by sport type
- Daily bonus system with streak multipliers
- Points and level progression
- VIP subscription via Telegram Stars

### Admin Features
- Add/edit/delete predictions via Mini App
- Add predictions via Telegram bot commands
- Mark predictions as won/lost
- View all users and their stats

### Telegram Bot Commands
- `/start` - Welcome message + Mini App button
- `/predictions` - View latest predictions
- `/profile` - View your profile stats
- `/bonus` - Claim daily bonus
- `/vip` - VIP subscription info
- `/add` - (Admin) Add prediction help
- `/addpred` - (Admin) Add prediction with data

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `ADMIN_TELEGRAM_IDS` - Comma-separated Telegram user IDs for admins
- `SESSION_SECRET` - Session secret key

## Database Schema
- `users` - User profiles with Telegram data, points, VIP status
- `predictions` - Sports predictions with match details
- `transactions` - VIP subscription payments
- `point_transactions` - Points earning history

## Running the Project
1. Set environment variables
2. Run `npm run db:push` to sync database schema
3. Run `npm run dev` to start development server
4. Access Mini App via Telegram bot or web browser (demo mode)

## Demo Mode
When accessed outside Telegram, the app runs in demo mode with mock user data for testing the UI.

## Recent Changes
- December 18, 2025: Initial MVP implementation
  - Full Mini App with predictions, profile, stats, admin pages
  - Telegram bot with user commands and admin commands
  - Gamification system (points, streaks, daily bonuses)
  - VIP subscription system (Telegram Stars integration ready)
  - Demo mode for browser testing
