-- Méta-Matic ∞ — certificate ledger (Cloudflare D1 / SQLite)
--
-- One row per work. `serial` is the PRIMARY KEY, so the database itself guarantees
-- that a work can be certified exactly once: the second concurrent /claim on the
-- same serial fails the INSERT (UNIQUE) instead of racing to a double-owner. That
-- is the whole exclusivity mechanic — enforced by the schema, not by app code.
CREATE TABLE IF NOT EXISTS certificates (
  serial   INTEGER PRIMARY KEY,   -- the work's serial (= one point in the latent space)
  method   TEXT    NOT NULL,      -- 'browser' | 'wallet'
  owner_id TEXT    NOT NULL,      -- browser uid, or wallet address
  address  TEXT,                  -- wallet address (wallet method only)
  sig      TEXT,                  -- personal_sign signature (wallet method only)
  u        REAL    NOT NULL,      -- coordinate, denormalised so the map needs no client recompute
  v        REAL    NOT NULL,
  gen      INTEGER NOT NULL,      -- generator version that drew it (provenance)
  ts       INTEGER NOT NULL       -- unix ms
);

-- recent-first scans for the map / feed
CREATE INDEX IF NOT EXISTS idx_certificates_ts ON certificates(ts);

-- Print-shop fulfilment ledger. One row per PAID Stripe Checkout session. `session`
-- is the PRIMARY KEY, so the webhook claims a session atomically before creating the
-- Prodigi order: a Stripe retry of the same payment fails the INSERT instead of
-- placing a second, seller-charged order. `status` starts 'pending' and flips to
-- 'done' only once Prodigi confirms — so a row that dies mid-flight is a resume point,
-- not a false "already fulfilled" (the retry re-orders under the same idempotency key).
-- The same work bought twice is two distinct sessions -> two rows -> two orders.
CREATE TABLE IF NOT EXISTS print_orders (
  session  TEXT PRIMARY KEY,               -- Stripe Checkout Session id (unique per checkout)
  serial   TEXT,                           -- the work's serial (provenance; not unique)
  status   TEXT NOT NULL DEFAULT 'pending',-- 'pending' | 'done'
  ts       INTEGER NOT NULL                -- unix seconds
);
-- Legacy migration — normally you do NOTHING here. This only matters if you deployed a
-- print_orders build that predates `status` AND that table holds rows. This project never
-- shipped such a build (the CREATE TABLE above makes a fresh, correct table on first run),
-- so the standard path needs no ALTER.
--
-- If you somehow inherited a legacy table: add the column, then RECONCILE each row against
-- your Prodigi dashboard before trusting its status — do not blind-backfill. A legacy row
-- is usually a completed order (the old build DELETEd failures), but not guaranteed: a
-- Prodigi failure coinciding with a D1 outage could have swallowed the cleanup delete and
-- left an unfulfilled row. Those old orders carry no Idempotency-Key, so a wrong status is
-- costly either way — 'done' on an unfulfilled row silently loses it; 'pending' on a
-- completed one lets a Stripe replay double-charge. Reconcile, don't guess:
--   ALTER TABLE print_orders ADD COLUMN status TEXT;  -- then SET 'done'/'pending' per Prodigi
