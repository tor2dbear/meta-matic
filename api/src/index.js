// Méta-Matic ∞ — certificate backend
//
// A work can be *certified* exactly once — first signer wins, everyone after is
// told it's taken. That single-owner rule is the point: a certificate of
// authenticity for something that was never new. Two ways to certify:
//   - browser : an instant, browser-id-backed certificate
//   - wallet  : the same, plus a personal_sign signature (verifiable provenance)
//
// Storage is Cloudflare D1 (binding: DB). Exclusivity is enforced by the schema:
// `serial` is the PRIMARY KEY, so a second concurrent /claim on the same work
// fails the INSERT instead of racing to a double-owner. No app-level locking.

const CORS = {
  "Access-Control-Allow-Origin": "*",              // public art piece; anyone may read/claim
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const str = (v, max) => (v == null ? null : String(v).slice(0, max));

// Deterministic latent walk — MUST match index.html's coordFor exactly, so the map
// plots the same point the client draws. Coordinates are derived here from the serial
// and NEVER taken from the request: /claim is public, and a hostile u,v (e.g. 1e308)
// would flow into renderMap() as Infinity and crash the canvas for every visitor.
function h1(i) {
  let n = Math.imul(i | 0, 374761393) + 2654435761;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
function value1(x) {
  const i = Math.floor(x), f = x - i;
  return h1(i) * (1 - smooth(f)) + h1(i + 1) * smooth(f);
}
const WALK = 0.135;
function coordFor(g) {
  return { u: value1(g * WALK + 40.5), v: value1(g * WALK + 913.7) };
}

// Shape a DB row into the certificate object the client renders.
function certOf(row) {
  if (!row) return null;
  return {
    serial: row.serial,
    method: row.method,
    owner: row.owner_id,
    address: row.address || null,
    ts: row.ts,
  };
}

// This Worker is mounted under a path prefix on the shared api.tor2dbear.com
// gateway (route: api.tor2dbear.com/meta-matic/*), so requests arrive as
// /meta-matic/claim etc. Strip that prefix when present so the route handlers
// stay path-clean — and leave bare paths untouched so the *.workers.dev URL keeps working.
const BASE = "/meta-matic";
function route(pathname) {
  if (pathname === BASE) return "/";
  if (pathname.startsWith(BASE + "/")) return pathname.slice(BASE.length);
  return pathname;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = route(url.pathname);

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    // GET /stats -> { total }  — how many works have been certified, globally.
    if (path === "/stats" && request.method === "GET") {
      const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM certificates").first("n")) || 0;
      return json({ total });
    }

    // GET /work?serial=N -> { serial, claimed, cert? }  — is this work available or taken?
    if (path === "/work" && request.method === "GET") {
      const serial = Number(url.searchParams.get("serial"));
      if (!Number.isFinite(serial)) return json({ error: "serial must be a number" }, 400);
      const row = await env.DB
        .prepare("SELECT serial, method, owner_id, address, ts FROM certificates WHERE serial = ?")
        .bind(serial).first();
      return row ? json({ serial, claimed: true, cert: certOf(row) })
                 : json({ serial, claimed: false });
    }

    // GET /claimed -> { certs: [{serial,u,v,method}] }  — every certified point, for the map.
    // Bounded to the most recent 2000 so the payload stays small; serial->coord is
    // deterministic client-side too, but we ship u,v so the map needs no recompute.
    if (path === "/claimed" && request.method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT serial, u, v, method FROM certificates ORDER BY ts DESC LIMIT 2000")
        .all();
      return json({ certs: results || [] });
    }

    // POST /claim { serial, method, id, address?, sig?, u, v, gen }
    //   -> { ok:true, cert, total }            you got it
    //   -> { ok:false, taken:true, cert }      someone was first
    if (path === "/claim" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "invalid JSON body" }, 400); }

      const serial = Number(body && body.serial);
      if (!Number.isFinite(serial)) return json({ error: "serial (number) required" }, 400);

      const method = body.method === "wallet" ? "wallet" : "browser";
      const owner_id = str(body.id || body.address, 128);
      if (!owner_id) return json({ error: "owner id required" }, 400);
      const address = str(body.address, 64);
      const sig = str(body.sig, 300);
      const { u, v } = coordFor(serial);   // derived server-side — client coords are never trusted
      const gen = Number.isFinite(Number(body.gen)) ? Number(body.gen) : 1;
      const ts = Date.now();

      try {
        await env.DB
          .prepare("INSERT INTO certificates (serial, method, owner_id, address, sig, u, v, gen, ts) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(serial, method, owner_id, address, sig, u, v, gen, ts).run();
      } catch (e) {
        // PRIMARY KEY / UNIQUE violation => already certified. Return the winner.
        const row = await env.DB
          .prepare("SELECT serial, method, owner_id, address, ts FROM certificates WHERE serial = ?")
          .bind(serial).first();
        if (row) return json({ ok: false, taken: true, cert: certOf(row) });
        return json({ error: "claim failed" }, 500);   // some other DB error
      }

      const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM certificates").first("n")) || 0;
      return json({ ok: true, cert: certOf({ serial, method, owner_id, address, ts }), total });
    }

    // index / health
    return json({
      name: "meta-matic certificates",
      endpoints: ["GET /stats", "GET /work?serial=<n>", "GET /claimed", "POST /claim {serial,method,id,...}"],
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Notes / trade-offs
//
// • Exclusivity is atomic by construction: `serial` PRIMARY KEY means the second
//   concurrent INSERT throws (caught above) rather than both "winning". No locks.
//
// • Abuse: /claim is open (no auth) and browser-id is cheap, so a script could
//   land-grab serials. A per-IP rate limit is the mitigation — parked on the
//   roadmap (NOTES.md) rather than shipped here, to keep the deploy simple.
//
// • Provenance: wallet claims store the address + personal_sign signature as-is;
//   the client verifies. Server-side signature recovery (recover address from sig,
//   assert it matches) is a roadmap item — it needs secp256k1 recovery in-Worker.
