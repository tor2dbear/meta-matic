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
