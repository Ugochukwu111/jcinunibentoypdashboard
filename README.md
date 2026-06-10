# JCIN UNIBEN TOYP Dashboard

A lightweight serverless admin dashboard system for managing TOYP UNIBEN nominations, voting, categories, and audit logs.

This project uses:

Vercel Serverless Functions for API endpoints
Supabase as the backend database
A static frontend dashboard for admin interaction
📁 Project Structure
/api
  categories/
  nominations/
  counts.js
  health.js
  logs.js
  votes.js
  _supabase.js

/static
  scripts.js
  views/
  index.html

schema.sql
vercel.json
⚙️ Prerequisites
Node.js 18+
A Supabase project with tables defined in schema.sql
Vercel CLI (for local development)
🚀 Setup
1. Install dependencies
npm install
2. Configure environment variables

Copy .env.example to .env:

cp .env.example .env

Fill in your Supabase credentials:

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
3. Run locally (IMPORTANT)

This project runs as a Vercel serverless app, not a traditional Node server.

Start development server:

vercel dev
🌐 Running the App

After starting vercel dev, open:

http://localhost:3000
🔌 API Endpoints

All endpoints are serverless functions under /api.

System
GET /api/health → Health check
Nominations
POST /api/nominations → Create nomination
GET /api/nominations → Fetch nominations
Votes
POST /api/votes → Submit vote
Categories
GET /api/categories → List categories
Analytics
GET /api/counts → Dashboard summary counts
Logs
GET /api/logs → System activity logs
🖥 Frontend

The frontend is a static admin dashboard located in /static.

Key features:

Nomination review workflow
Category management
Voting controls
Audit logs viewer
Role-based UI (admin/auditor modes)

Frontend communicates with /api/* endpoints.

🔐 Security Notes
Supabase keys must never be exposed in frontend code
Row Level Security (RLS) should be enabled in Supabase
Environment variables must be kept in .env
Serverless functions handle secure DB access via _supabase.js
🧠 Architecture Overview
Frontend (static JS dashboard)
        ↓
Vercel Serverless API (/api)
        ↓
Supabase Database
🧪 Development Notes
Uses ES Modules ("type": "module")
Each /api/*.js file is an independent serverless function
No Express server is required
Local development requires vercel dev
🚀 Deployment

This project is designed for:

Vercel (recommended)
Any platform supporting serverless functions

Deploy with:

vercel
⚠️ Important Clarification

This project is not a traditional Express backend.

It uses serverless functions instead of a persistent server.