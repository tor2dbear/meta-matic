// Méta-Matic ∞ — tally backend
// A tiny Cloudflare Worker that keeps a global count of signatures:
//   - a single global total ("total")
//   - a per-work count ("sig:<serial>")
// so the page can show "this work has been signed N times" and a global total.
//
// Storage is Workers KV (binding: TALLY). KV is simple and free-tier friendly,
// but note the trade-offs at the bottom of this file.

const CORS = {
  "Access-Control-Allow-Origin": "*",              // public art piece; anyone may read/sign
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

const num = v => (parseInt(v, 10) || 0);

// This Worker is mounted under a path prefix on the shared api.tor2dbear.com
// gateway (route: api.tor2dbear.com/meta-matic/*), so requests arrive as
// /meta-matic/stats etc. Strip that prefix when present so the route handlers
// stay path-clean — and leave bare paths untouched so the *.workers.dev URL
// (/stats, /sign) keeps working as a fallback.
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

    // GET /stats            -> { total }
    // GET /stats?serial=123 -> { total, serial, count }
    if (path === "/stats" && request.method === "GET") {
      const raw = url.searchParams.get("serial");
      const total = num(await env.TALLY.get("total"));
      if (raw === null) return json({ total });
      const serial = Number(raw);
      if (!Number.isFinite(serial)) return json({ error: "serial must be a number" }, 400);
      const count = num(await env.TALLY.get("sig:" + serial));
      return json({ total, serial, count });
    }

    // POST /sign  body: { "serial": 123 }  -> { total, serial, count }
    if (path === "/sign" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "invalid JSON body" }, 400); }
      const serial = Number(body && body.serial);
      if (!Number.isFinite(serial)) return json({ error: "serial (number) required" }, 400);

      const key = "sig:" + serial;
      // read-modify-write. Racy under high concurrency (see note below); fine here.
      const total = num(await env.TALLY.get("total")) + 1;
      const count = num(await env.TALLY.get(key)) + 1;
      await Promise.all([
        env.TALLY.put("total", String(total)),
        env.TALLY.put(key, String(count)),
      ]);
      return json({ total, serial, count });
    }

    // index / health
    return json({
      name: "meta-matic tally",
      endpoints: ["GET /stats", "GET /stats?serial=<n>", "POST /sign {serial}"],
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Notes / trade-offs
//
// • Consistency: KV read-modify-write is not atomic. Two simultaneous /sign calls
//   can both read N and write N+1, losing one. For this piece's traffic that's
//   acceptable — and "the counter counts" tolerates a little slippage. If it ever
//   needs exactness, move the counter to a Durable Object (atomic, still free-tier).
//
// • Write limits: KV free tier allows ~1,000 writes/day; each /sign does 2 writes.
//   Reads are cheap (~100k/day). Popular days may need the paid plan or a Durable
//   Object. Reads are also eventually consistent (a fresh /stats may lag a /sign by
//   up to ~60s at the edge).
//
// • Abuse: /sign is open by design (no auth) — thematically fitting for a machine
//   that manufactures "ownership" of things that were never original. Add a per-IP
//   rate limit later if the total gets spammed.
