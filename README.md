# IGDTUW AI Staff Meeting Organizer 🎓

> **Institutional Staff Meeting Scheduling & Lifecycle Platform for Indira Gandhi Delhi Technical University (IGDTUW)**

An AI-powered academic meeting management system that automatically overlays faculty teaching timetables with real-time Google Calendar availability, calculates conflict-free meeting windows, and autonomously manages meeting lifecycle operations (reminders, conflict watchdogs, and formal Minutes of Meeting (MoM) preparation).

---

## 🌟 Key Features

1. **Google Account Authentication & Profile Onboarding**:
   - Authenticate with Google Workspace.
   - First-time onboarding collects the faculty member's **Official Designation**, **Academic Department**, **Employee ID**, and **Cabin/Room Number** while pulling Name, Email, and Google Avatar directly from Google.

2. **Role-Based Access Control (RBAC)**:
   - **Admin Control Panel**: Strictly gated. Authorized exclusively for designated administrators: **Aditya** (`aditya@igdtuw.ac.in`) and **Arun** (`arun@igdtuw.ac.in`).
   - Other institutional roles: **Meeting Organizer** (HODs, Deans, Committee Chairs) and **Faculty / Teacher**.

3. **Timetable Ingestion & Upload (PDF & Picture / Image Support)**:
   - Upload weekly teaching schedules via **PDF**, **Timetable Pictures / Photos (PNG, JPG, JPEG)**, **Excel (.xlsx)**, or **CSV**.
   - Built-in intelligent parser maps lecture hours, lab sessions, and open research slots.

4. **5-Step Smart Scheduling Wizard & Real-time Availability Matrix**:
   - **Step 1 — Details**: Title, date, target time, duration, location, Google Meet auto-generator, and agenda.
   - **Step 2 — Staff Select**: Search and check faculty across academic departments.
   - **Step 3 — Availability Grid**: Visual hour-by-hour matrix (🟢 FREE, 🔴 BUSY: Lecture/G-Cal, ⚪ LUNCH) with consensus calculation.
   - **Step 4 — Best Slots**: AI-scored 5-star meeting recommendations with rationale.
   - **Step 5 — Confirmation**: Review summary and 1-click scheduling.

5. **AI Background Automation Daemon (NOT a Chatbot)**:
   - Operates as a continuous background daemon executing automated 30-minute meeting reminders, timetable collision monitoring, and post-meeting MoM pre-draft generation.

6. **Minutes of Meeting (MoM) Management & Editor**:
   - Pre-populates official IGDTUW university document format with verified attendees, agenda, discussion notes, decisions, and action-item matrices.
   - One-click approval, digital sign-off, and official archive dispatch.

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Aaditya1344/AI-Meeting-Manager.git
cd AI-Meeting-Manager
npm install
```

### 2. Run the Server
```bash
npm start
```
The server will start on `http://localhost:3000`.

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

---

## 📡 API Endpoints

- `POST /api/auth/google` — Google authentication
- `POST /api/auth/onboard` — Save designation, department & employee metadata
- `GET /api/timetable` — Get timetable
- `POST /api/timetable/upload` — Upload PDF / Timetable photo
- `POST /api/meetings/check-availability` — Calculate availability matrix & 5-star recommendations
- `POST /api/meetings/create` — Schedule meeting & push to Google Calendar
- `GET /api/mom` & `PUT /api/mom/:id` — Minutes of Meeting lifecycle
- `GET /api/ai/logs` — Real-time AI background automation stream
- `GET /api/admin/stats` & `POST /api/admin/assign-role` — Admin Control Panel (Aditya & Arun only)
