// Méta-Matic ∞ — print shop (v2.1b)
//
// Order a physical print of a certified work. Worldwide, priced per destination
// from a LIVE Prodigi quote so the customer always covers 100% of cost (product +
// shipping + Stripe fee + buffer) — the seller is never out of pocket, and idle
// cost is $0. Dependency-free: fetch + WebCrypto only. Sandbox-first.
//
// Flow:
//   1. client renders the 300 dpi PNG, POSTs it to /print-image -> stored in R2,
//      returns a public URL the print lab can fetch.
//   2. client POSTs /print-checkout {serial, imageKey, country} -> we quote Prodigi
//      for that country, gross up for the Stripe fee, and open a Stripe Checkout
//      Session locked to that country. Returns the Checkout URL.
//   3. Stripe fires checkout.session.completed -> /stripe-webhook (signature
//      verified) -> we create the Prodigi order with the paid address + image URL.
//
// Config (wrangler.toml [vars]):  PRODIGI_BASE, PRODIGI_SKU, PRODIGI_SHIPPING,
//   PRINT_CURRENCY, PRICE_PCT_FEE, PRICE_FIXED_FEE, PRICE_BUFFER, SITE_ORIGIN, API_ORIGIN
// Secrets (wrangler secret): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PRODIGI_API_KEY
// Binding: PRINTS (R2 bucket)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function hexId(n = 8) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---- Stripe (raw fetch; no SDK) ----
function formEncode(obj, prefix, out = []) {
  for (const k in obj) {
    const key = prefix ? `${prefix}[${k}]` : k, v = obj[k];
    if (v && typeof v === "object") formEncode(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
  }
  return out.join("&");
}
async function stripe(env, path, params) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode(params),
  });
  const data = await r.json();
  if (!r.ok) throw new Error("stripe: " + (data.error && data.error.message || r.status));
  return data;
}
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function verifyStripe(raw, header, secret) {
  const parts = Object.fromEntries((header || "").split(",").map(p => p.split("=")));
  if (!parts.t || !parts.v1) throw new Error("bad signature header");
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) throw new Error("timestamp out of tolerance");
  const expected = await hmacHex(secret, parts.t + "." + raw);
  // constant-time-ish compare
  if (expected.length !== parts.v1.length) throw new Error("signature mismatch");
  let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  if (diff !== 0) throw new Error("signature mismatch");
  return JSON.parse(raw);
}

// ---- Prodigi ----
async function prodigi(env, path, body) {
  const r = await fetch(env.PRODIGI_BASE + "/v4.0/" + path, {
    method: "POST",
    headers: { "X-API-Key": env.PRODIGI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error("prodigi: " + (data.message || r.status));
  return data;
}
// One print of the configured SKU, sized to the country. Returns cost in PRINT_CURRENCY.
async function quotePrint(env, country) {
  const q = await prodigi(env, "quotes", {
    shippingMethod: env.PRODIGI_SHIPPING || "Standard",
    destinationCountryCode: country,
    currencyCode: env.PRINT_CURRENCY || "EUR",
    items: [{ sku: env.PRODIGI_SKU, copies: 1, attributes: {}, assets: [{ printArea: "default" }] }],
  });
  const cs = q.quotes && q.quotes[0] && q.quotes[0].costSummary;
  if (!cs) throw new Error("no quote returned (check SKU / country)");
  // items + shipping + tax (any that are present)
  const cost = num(cs.items && cs.items.amount) + num(cs.shipping && cs.shipping.amount) + num(cs.tax && cs.tax.amount);
  if (cost <= 0) throw new Error("quote returned zero cost");
  return cost;
}
// Gross up so that after Stripe's cut the seller still nets the full Prodigi cost:
//   charge - (charge*pct + fixed) >= cost   ->   charge = (cost + fixed)/(1 - pct) + buffer
function priceFor(env, cost) {
  const pct = num(env.PRICE_PCT_FEE || 0.039), fixed = num(env.PRICE_FIXED_FEE || 0.3), buf = num(env.PRICE_BUFFER || 1.5);
  const charge = (cost + fixed) / (1 - pct) + buf;
  return Math.ceil(charge * 100); // minor units (cents)
}

export async function handlePrintShop(path, request, env, ctx) {
  if (path === "/print/config" && request.method === "GET") {
    // lets the client show the price ballpark / enabled state without secrets
    // Every fulfilment-critical secret must be present — including the webhook secret,
    // or payments would be taken while webhooks fail signature checks and no order is made.
    return json({ enabled: !!(env.STRIPE_SECRET_KEY && env.PRODIGI_API_KEY && env.STRIPE_WEBHOOK_SECRET), currency: env.PRINT_CURRENCY || "EUR" });
  }

  // POST /print-image?serial=N  (body = PNG bytes) -> { key, url }
  if (path === "/print-image" && request.method === "POST") {
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 25 * 1024 * 1024) return json({ error: "bad image" }, 400);
    const serial = String(new URL(request.url).searchParams.get("serial") || "x").replace(/[^0-9]/g, "").slice(0, 12) || "x";
    const key = serial + "-" + hexId(8) + ".png";
    await env.PRINTS.put(key, buf, { httpMetadata: { contentType: "image/png" } });
    return json({ key, url: env.API_ORIGIN + "/print-image/" + key });
  }
  // GET /print-image/<key> -> the PNG (so the print lab can fetch it)
  if (path.startsWith("/print-image/") && request.method === "GET") {
    const key = decodeURIComponent(path.slice("/print-image/".length));
    const obj = await env.PRINTS.get(key);
    if (!obj) return new Response("not found", { status: 404 });
    return new Response(obj.body, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
  }

  // POST /print-checkout { serial, imageKey, country } -> { url }
  if (path === "/print-checkout" && request.method === "POST") {
    let b; try { b = await request.json(); } catch { return json({ error: "bad body" }, 400); }
    const serial = String(b.serial || "").replace(/[^0-9]/g, "").slice(0, 12);
    const imageKey = String(b.imageKey || "");
    const country = String(b.country || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    if (!serial || !imageKey || country.length !== 2) return json({ error: "serial, imageKey, country required" }, 400);
    let cost; try { cost = await quotePrint(env, country); } catch (e) { return json({ error: String(e.message || e) }, 502); }
    const amount = priceFor(env, cost);
    const session = await stripe(env, "checkout/sessions", {
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (env.PRINT_CURRENCY || "EUR").toLowerCase(),
          unit_amount: amount,
          product_data: { name: "Méta-Matic ∞ — print № " + serial },
        },
      }],
      shipping_address_collection: { allowed_countries: [country] },
      phone_number_collection: { enabled: true },
      success_url: (env.SITE_ORIGIN || "") + "/?print=ok",
      cancel_url: (env.SITE_ORIGIN || "") + "/?print=cancel",
      metadata: { serial, imageKey, country },
    });
    return json({ url: session.url });
  }

  // POST /stripe-webhook -> on payment, create the Prodigi order
  if (path === "/stripe-webhook" && request.method === "POST") {
    const raw = await request.text();
    let event;
    try { event = await verifyStripe(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET); }
    catch (e) { return new Response("bad signature", { status: 400 }); }
    // Fulfil on an immediately-paid Checkout OR a delayed method (SEPA, some Klarna)
    // that later succeeds — NEVER on the bare `completed` event while still unpaid,
    // or a later payment failure would leave the seller paying for the print.
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object;
      if (s.payment_status !== "paid") return new Response("ok (awaiting payment)", { status: 200 });
      const m = s.metadata || {};
      // Newer Stripe API versions nest the collected shipping address under
      // collected_information; fall back to the legacy top-level field. customer_details
      // is billing-oriented and used only for name/email/phone, never for the address.
      const ship = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
      const cust = s.customer_details || {};
      const addr = ship.address || {};
      if (!addr.line1 || !addr.country) return new Response("ok (no shipping address)", { status: 200 }); // never order a broken shipment
      const order = {
        merchantReference: "meta-matic-" + (m.serial || ""),
        shippingMethod: env.PRODIGI_SHIPPING || "Standard",
        recipient: {
          name: ship.name || cust.name || "Customer",
          email: cust.email || undefined,
          phoneNumber: cust.phone || undefined,
          address: {
            line1: addr.line1, line2: addr.line2 || null,
            postalOrZipCode: addr.postal_code || "", countryCode: addr.country,
            townOrCity: addr.city || "", stateOrCounty: addr.state || null,
          },
        },
        items: [{
          sku: env.PRODIGI_SKU, copies: 1, sizing: "fillPrintArea",
          assets: [{ printArea: "default", url: env.API_ORIGIN + "/print-image/" + m.imageKey }],
        }],
        metadata: { serial: m.serial, stripeSession: s.id },
      };
      // If Prodigi is briefly unreachable, 500 so Stripe retries; creation is
      // idempotent via merchantReference so a retry won't double-order.
      try { await prodigi(env, "Orders", order); }
      catch (e) { return new Response("order deferred: " + (e.message || e), { status: 500 }); }
    }
    return new Response("ok", { status: 200 });
  }

  if (request.method === "OPTIONS" && path.startsWith("/print")) return new Response(null, { headers: CORS });
  return null; // not a print-shop route
}
