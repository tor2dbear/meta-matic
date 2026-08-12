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
-- Migration for a print_orders that was created BEFORE `status` existed: CREATE TABLE
-- IF NOT EXISTS above is a no-op on an existing table, so it would NOT add the column,
-- and every webhook INSERT would then fail with "no column named status". This ALTER
-- adds it. On a fresh table (already has status) SQLite errors "duplicate column name" —
-- harmless: it means you're already migrated. Run it only if you created the table from
-- an earlier build; skip/ignore the error otherwise. (Kept separate, not a destructive
-- DROP, so re-running the schema never wipes fulfilment history.)
--
-- Backfill value is 'done', NOT 'pending': the pre-`status` build DELETEd a row whenever
-- the Prodigi order failed, so any row that survived is a COMPLETED order. Marking them
-- 'done' stops a later Stripe replay from treating them as resumable and re-ordering —
-- which would be unsafe, since those old orders carry no Idempotency-Key to dedupe on.
-- (New rows are still written 'pending' by the app on INSERT; this default only backfills
-- the existing rows this one time.)
--   ALTER TABLE print_orders ADD COLUMN status TEXT NOT NULL DEFAULT 'done';
