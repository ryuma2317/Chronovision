# Chronovision Frontend

React + Vite frontend for Chronovision, built from the Stitch UI exports and wired to the
Express/Flask backend in `../backend` and `../Flask_API`.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api and /uploads to http://localhost:3001
```

Run the backend (`../backend`) and the Flask ML API (`../Flask_API`) alongside it — see the
backend's own README/CHANGELOG for those setup steps. There's no `.env` needed for the
frontend in dev; `vite.config.js` proxies API calls to `localhost:3001`.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

For a real deployment, point a reverse proxy (nginx, etc.) at the backend for `/api` and
`/uploads`, and serve `dist/` as static files — or set the proxy target in `vite.config.js`
if you're deploying behind a different host.

## Design system

Built directly from the brief in `academic_prestige_modernism/DESIGN.md` (in the Stitch
export): navy (`#051424`) + gold (`#D4AF37`) on a warm cream background, Hanken Grotesk
throughout. Day/night mode is a single class toggle (`<html class="dark">`) — every color in
`tailwind.config.js` maps to a CSS variable defined twice in `src/index.css` (light in `:root`,
dark in `.dark`), so components never hardcode light/dark logic themselves.

## What's wired vs. what's a preview

Per your call to build everything — wire what's possible, mock the rest — here's the actual
split. "Wired" means real API calls against your backend; "Preview" means static sample data
behind a banner that says so.

| Screen area | Status | Notes |
|---|---|---|
| Login | Wired | Sign-up tab explains accounts are admin-provisioned (no register endpoint exists) |
| Student dashboard, score entry, prediction detail | Wired | |
| What-if simulator (+ history) | Wired | |
| Study plan (auto-suggest → free-time check → weekly calendar) | Wired | Enforces the free-time-must-cover-study-hours rule with a real 422 |
| Aptitude/IQ test | Wired | Graded server-side |
| Quizzes (list, take, submit, answer sheet) | Wired | |
| Leaderboard & badges | Wired | |
| Attendance (+ heatmap) | Wired | |
| Lessons (student view + teacher upload/publish) | Wired | |
| Peer comparison (you vs. class average) | Wired | New backend endpoint — see root CHANGELOG |
| Profile & account settings | Wired | New `/auth/me` endpoints — see root CHANGELOG |
| Teacher dashboard, classes, roster, student detail | Wired | |
| At-risk dashboard | Wired | |
| Teacher viewing a student's study plan | Wired | New backend endpoint, access-checked to shared classes only |
| Quiz manager (manual + AI-upload from docx/pdf) | Wired | AI generation needs `ANTHROPIC_API_KEY` set on the backend |
| Attendance manager | Wired | |
| Admin dashboard, user management, class management | Wired | |
| Onboarding tour, 404 | Wired | Pure UI, no backend needed |
| EduBot assistant | **Preview** | Scripted response only — no AI backend for this exists |
| Notifications / announcement center | **Preview** | No notifications table/endpoint exists |
| Audit log | **Preview** | No audit table/endpoint exists |
| AI model management / retraining ops | **Preview** | No MLOps endpoints exist |
| Reports hub | **Preview** | No report-generation endpoint exists |
| Faculty hub | **Preview** | No messaging/announcement backend exists |
| Semester/peer analytics (the dedicated analytics screens) | **Preview** | Distinct from the real peer-comparison widget on the student dashboard, which IS wired |
| Superadmin overview | Reused | Folded into the regular Admin dashboard — your schema has no separate superadmin role |

Preview pages all render through `src/pages/mock/PreviewPage.jsx` with a visible
"Preview — sample data" banner (`src/components/PreviewBanner.jsx`) so nobody mistakes sample
content for real data.

## Structure

```
src/
  lib/api.js              axios instance, JWT handling, auto refresh-on-401
  lib/endpoints/          one file per backend route group (auth, admin, teacher, student)
  lib/predictionFormSpec.js  the 35-feature prediction form, ranges pulled from
                             data_generation/generate_data.py so inputs stay realistic
  context/                Auth + Theme providers
  components/ui/          Button, Card, Input, Select, Badge, Modal, Avatar, Toast, etc.
  components/layout/      TopNav, DashboardShell, RoleRoute (auth+role guard), navConfig
  components/QuestionCard.jsx  shared MCQ renderer (IQ test + quizzes)
  pages/student, pages/teacher, pages/admin, pages/shared, pages/mock
```

## Honest limitations

- I did not have a live database or browser in the build environment, so this hasn't had a
  full click-through QA pass — `npm run build` compiles clean and every request/response
  shape was checked against the actual controller code, but please smoke-test the real flows
  (especially file uploads and the study-plan wizard) once you have a database running.
- The bundle is a single ~700KB JS chunk — fine for a class project, but if this grows further
  it's worth code-splitting per role with `React.lazy`.
- No automated tests.
