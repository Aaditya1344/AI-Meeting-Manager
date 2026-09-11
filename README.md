# MeetFlow — AI Staff Meeting Organizer 🎓

> **Institutional Staff Meeting Scheduling & Lifecycle Platform for Indira Gandhi Delhi Technical University (IGDTUW)**

An intelligent academic meeting management platform that automatically overlays faculty teaching timetables with real-time Google Calendar availability, calculates conflict-free meeting windows, and autonomously manages meeting lifecycle operations (reminders, conflict watchdogs, and formal Minutes of Meeting (MoM) preparation).

---

## 🌟 Key Features

1. **Flexible Login Screen**:
   - Clean login landing page shown by default on load.
   - Sign in using **Institutional Email & Password** or directly via **Google Workspace**.
   - First-time onboarding collects the faculty member's **Official Designation**, **Academic Department**, **Employee ID**, and **Cabin/Room Number**.

2. **Role-Based Access Control (RBAC)**:
   - **Admin Control Panel**: Gated exclusively for designated administrators: **Aditya** (`aditya@igdtuw.ac.in`) and **Arun** (`arun@igdtuw.ac.in`).
   - Other institutional roles: **Meeting Organizer** (HODs, Deans, Committee Chairs) and **Faculty / Teacher**.

3. **Timetable Ingestion & Upload (PDF & Picture / Image Support)**:
   - Upload weekly teaching schedules via **PDF**, **Timetable Pictures / Photos (PNG, JPG, JPEG)**, **Excel (.xlsx)**, or **CSV**.
   - Built-in intelligent parser maps lecture hours, lab sessions, and open research slots.

4. **5-Step Smart Scheduling Wizard & Real-time Availability Matrix**:
   - **Step 1 — Details**: Title, date, target time, duration (30/60/90 mins), venue, Google Meet auto-generator, and agenda.
   - **Step 2 — Staff Select**: Search and check faculty across academic departments.
   - **Step 3 — Availability Grid**: Visual hour-by-hour matrix (🟢 FREE, 🔴 BUSY: Class/G-Cal, ⚪ LUNCH) with consensus calculation.
   - **Step 4 — Best Slots**: AI-scored 5-star meeting recommendations with feasibility rationale.
   - **Step 5 — Confirmation**: Review summary and 1-click scheduling.

5. **AI Background Automation Daemon (NOT a Chatbot)**:
   - Operates as a continuous background daemon executing automated 30-minute meeting reminders, timetable collision monitoring, and post-meeting MoM pre-draft generation.

6. **Minutes of Meeting (MoM) Management & Editor**:
   - Pre-populates official IGDTUW university document format with verified attendees, agenda, discussion notes, decisions, and action-item matrices.
   - One-click approval, digital sign-off, and official archive dispatch.

---

## 🚀 Deployment Guide

### Option A: Deploy Frontend to Vercel & Backend to Render

#### 1. Backend on Render:
1. Go to **[dashboard.render.com](https://dashboard.render.com/)** &rarr; **New Web Service**.
2. Connect `Aaditya1344/AI-Meeting-Manager`.
3. Set **Build Command**: `npm install` and **Start Command**: `node server.js`.
4. Render will provide your backend URL (e.g. `https://meetflow-backend.onrender.com`).

#### 2. Frontend on Vercel:
1. Go to **[vercel.com](https://vercel.com/)** &rarr; **Add New Project**.
2. Import `Aaditya1344/AI-Meeting-Manager`.
3. Framework Preset: **Other** / Root directory: `./` (or `public`).
4. Click **Deploy**. Vercel uses `vercel.json` to serve the static frontend.

---

## 🏛️ Initial Users & Roles

| User | Email | Role | Access Level |
| :--- | :--- | :--- | :--- |
| **Aditya** | `aditya@igdtuw.ac.in` | `admin` | **Full Admin Control Panel Access** |
| **Arun** | `arun@igdtuw.ac.in` | `admin` | **Full Admin Control Panel Access** |
| **Dr. Rajesh Sharma** | `r.sharma@igdtuw.ac.in` | `organizer` | Meeting Organizer & HOD (CSE) |
| **Dr. Sneha Kumar** | `sneha.k@igdtuw.ac.in` | `faculty` | Associate Professor (IT) |
| **Dr. Manpreet Singh** | `m.singh@igdtuw.ac.in` | `faculty` | Assistant Professor (ECE) |
| **Prof. Ananya Roy** | `ananya.r@igdtuw.ac.in` | `faculty` | Assistant Professor (MAE) |
