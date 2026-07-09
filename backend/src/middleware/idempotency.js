// Duplicate-submission guard (idempotency).
//
// Protects against the same request being processed twice — from a double
// click, an impatient user, or the client automatically retrying after a token
// refresh. The client sends a unique "Idempotency-Key" header on mutating
// requests. The first request with a given key runs normally and its response
// is remembered briefly; any repeat with the same key returns the remembered
// response instead of running the handler again.
//
// NOTE: this cache lives in ONE server process's memory. Perfect for a single
// backend instance. If you ever run several backend instances behind a load
// balancer, move this cache to Redis so all instances share it.

const store = new Map(); // scopedKey -> { status, body, expires }
const TTL_MS = 60 * 1000; // remember a key for 60 seconds
const IN_FLIGHT = Symbol('in-flight');

// Periodically drop expired entries so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expires <= now) store.delete(k);
}, 30 * 1000).unref();

const idempotency = (req, res, next) => {
  const key = req.get('Idempotency-Key');
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!key || !mutating) return next();

  const scoped = `${req.user?.user_id || 'anon'}:${req.method}:${req.originalUrl}:${key}`;
  const existing = store.get(scoped);

  if (existing) {
    if (existing.body === IN_FLIGHT) {
      return res
        .status(409)
        .json({ message: 'A duplicate request is already being processed.' });
    }
    return res.status(existing.status).json(existing.body);
  }

  // Mark this key as in-flight so a rapid second request is rejected as duplicate.
  store.set(scoped, { status: 0, body: IN_FLIGHT, expires: Date.now() + TTL_MS });

  // Capture the JSON response so we can replay it for repeats.
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    store.set(scoped, { status: res.statusCode, body, expires: Date.now() + TTL_MS });
    return originalJson(body);
  };

  next();
};

module.exports = idempotency;
