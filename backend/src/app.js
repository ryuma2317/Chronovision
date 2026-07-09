const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const idempotency = require('./middleware/idempotency');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { UPLOAD_DIR } = require('./config/env');

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const teacherRoutes = require('./routes/teacher.routes');
const studentRoutes = require('./routes/student.routes');

const app = express();

// ── Security headers ─────────────────────────────────────────
// contentSecurityPolicy is disabled because it blocks the Swagger UI assets;
// re-enable with a tailored policy if you stop serving Swagger publicly.
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ─────────────────────────────────────────────────────
// In production set CORS_ORIGIN in .env to your frontend URL(s), comma-separated,
// e.g. CORS_ORIGIN=https://chronovision.vercel.app
// Left unset (or '*') it allows any origin, which is fine for local dev.
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Duplicate-submission guard (reads the Idempotency-Key header) ──
app.use(idempotency);

// ── Rate limiting ────────────────────────────────────────────
app.use('/api', apiLimiter); // general cap for the whole API
app.use('/api/auth', authLimiter); // stricter cap for login / refresh

// ── Uploaded files (lesson material, quiz source docs) ────────
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ── Swagger Docs ─────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler (must be last) ──────────────────────
app.use(errorHandler);

module.exports = app;
