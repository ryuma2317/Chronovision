# Chronovision — Backend Structure
# Node.js + Express  |  REST API  |  JWT Auth  |  Swagger Docs

chronovision-backend/
│
├── .env                        # DB creds, JWT secret, Flask URL, port — never commit
├── .env.example                # Template with keys but no values — commit this
├── .gitignore
├── package.json
├── server.js                   # Entry point — binds app to port, starts server
│
└── src/
    │
    ├── app.js                  # Express app setup — middleware, routes, swagger, error handler
    │
    ├── config/
    │   ├── db.js               # MySQL2 connection pool — uses .env vars
    │   ├── env.js              # Validates required env vars on startup (fail fast)
    │   └── swagger.js          # swagger-jsdoc config — API title, version, servers
    │
    ├── middleware/
    │   ├── auth.js             # Verifies JWT → attaches req.user {user_id, role, email}
    │   ├── role.js             # checkRole('admin','teacher') factory — 403 if role mismatch
    │   ├── upload.js           # Multer config — lesson files + quiz source files
    │   └── errorHandler.js     # Global error middleware — maps error types to HTTP codes
    │
    ├── repositories/           # Raw SQL only — no business logic here
    │   ├── user.repo.js        # findByEmail, findById, create, update, deactivate
    │   ├── class.repo.js       # create, findById, findByTeacher, findByStudent, addMember
    │   ├── lesson.repo.js      # create, findByClass, markViewed
    │   ├── quiz.repo.js        # create, findByClass, findAttemptsByStudent
    │   ├── prediction.repo.js  # create, findLatestByStudent, findAllByStudent
    │   ├── studyplan.repo.js   # create, findByStudent, saveSchedule
    │   ├── simulation.repo.js  # create, findByStudent
    │   ├── attendance.repo.js  # upsert, findByClass, findByStudent
    │   └── gamification.repo.js# addPoints, findBadges, awardBadge, getLeaderboard
    │
    ├── services/               # Business logic only — calls repositories + external APIs
    │   ├── auth.service.js     # hashPassword, comparePassword, signToken, verifyToken
    │   ├── class.service.js    # validateMembership, getClassDashboard
    │   ├── ml.service.js       # axios calls to Flask :5001 — /predict, /whatif
    │   ├── quiz.service.js     # docx/pdf parser → Anthropic API → structured questions
    │   ├── studyplan.service.js# rule-based plan generator + free-time validation
    │   ├── attendance.service.js # auto-mark present on quiz submit
    │   └── gamification.service.js # point rules, badge evaluation triggers
    │
    ├── controllers/            # Handle req/res only — call services, return JSON
    │   ├── auth.controller.js          # POST /auth/login, POST /auth/refresh
    │   ├── admin.controller.js         # User CRUD, class CRUD, dashboard stats
    │   ├── class.controller.js         # Shared class operations (get members etc.)
    │   ├── lesson.controller.js        # Upload, publish, view tracking
    │   ├── quiz.controller.js          # Create, publish, submit, grade, answer sheet
    │   ├── prediction.controller.js    # Submit features → call ML → save → return
    │   ├── simulation.controller.js    # Submit overrides → call ML /whatif → save
    │   ├── studyplan.controller.js     # Generate, fetch schedule
    │   ├── attendance.controller.js    # Manual mark, fetch by class/date
    │   └── gamification.controller.js  # Leaderboard, badges, point history
    │
    └── routes/                 # Route definitions + Swagger JSDoc annotations
        ├── auth.routes.js              # POST /api/auth/login
        │                               # POST /api/auth/refresh
        ├── admin.routes.js             # All routes guarded by checkRole('admin')
        │   ├── POST   /api/admin/users
        │   ├── GET    /api/admin/users
        │   ├── PUT    /api/admin/users/:id
        │   ├── DELETE /api/admin/users/:id
        │   ├── POST   /api/admin/classes
        │   ├── GET    /api/admin/classes
        │   ├── PUT    /api/admin/classes/:id
        │   ├── DELETE /api/admin/classes/:id
        │   ├── POST   /api/admin/classes/:id/teachers
        │   ├── POST   /api/admin/classes/:id/students
        │   └── GET    /api/admin/dashboard
        ├── teacher.routes.js           # All routes guarded by checkRole('teacher')
        │   ├── GET    /api/teacher/classes
        │   ├── GET    /api/teacher/classes/:id/students
        │   ├── GET    /api/teacher/classes/:id/atrisk
        │   ├── GET    /api/teacher/students/:id
        │   ├── POST   /api/teacher/lessons
        │   ├── PUT    /api/teacher/lessons/:id/publish
        │   ├── POST   /api/teacher/quizzes
        │   ├── POST   /api/teacher/quizzes/upload
        │   └── GET    /api/teacher/quizzes/:id/results
        └── student.routes.js           # All routes guarded by checkRole('student')
            ├── POST   /api/student/prediction
            ├── GET    /api/student/prediction/history
            ├── POST   /api/student/iq
            ├── POST   /api/student/studyplan
            ├── GET    /api/student/studyplan/latest
            ├── POST   /api/student/whatif
            ├── GET    /api/student/lessons
            ├── POST   /api/student/lessons/:id/view
            ├── GET    /api/student/quizzes
            ├── POST   /api/student/quizzes/:id/start
            ├── POST   /api/student/quizzes/:id/submit
            └── GET    /api/student/quizzes/:id/answers


# ── Layer responsibilities (one rule each) ──────────────────
#
#  routes       → declare endpoint + middleware chain only
#  controllers  → read req, call service, send res — no SQL, no business rules
#  services     → business logic, validation, orchestration — no req/res
#  repositories → SQL queries only — return plain JS objects, never throw HTTP errors
#  middleware   → cross-cutting: auth, roles, file upload, error formatting
#
# ── Key packages ────────────────────────────────────────────
#
#  express            REST framework
#  mysql2             MySQL driver (promise mode)
#  bcryptjs           password hashing
#  jsonwebtoken       JWT sign/verify
#  multer             file upload (lessons, quiz files)
#  axios              HTTP client for Flask ML API calls
#  swagger-jsdoc      generates OpenAPI spec from JSDoc comments
#  swagger-ui-express serves Swagger UI at /api/docs
#  mammoth            .docx → text extraction (quiz file parsing)
#  pdf-parse          .pdf  → text extraction (quiz file parsing)
#  dotenv             loads .env
#  express-validator  request validation
#  cors               CORS headers
#  morgan             HTTP request logging
#
# ── Swagger ─────────────────────────────────────────────────
#
#  Docs served at:  GET /api/docs
#  Spec JSON at:    GET /api/docs.json
#  Each route file annotates endpoints with @swagger JSDoc blocks
#  All protected routes show the 🔒 padlock (Bearer JWT security scheme)
#
# ── Environment variables (.env.example) ────────────────────
#
#  PORT=3001
#  DB_HOST=localhost
#  DB_PORT=3306
#  DB_NAME=chronovision
#  DB_USER=chronovision_app
#  DB_PASSWORD=
#  JWT_SECRET=
#  JWT_EXPIRES_IN=15m
#  JWT_REFRESH_SECRET=
#  JWT_REFRESH_EXPIRES_IN=7d
#  FLASK_ML_URL=http://localhost:5001
#  ANTHROPIC_API_KEY=          # for quiz AI generation
#  UPLOAD_DIR=./uploads
