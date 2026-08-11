# Méta-Matic ∞ — projektanteckningar

Kontext och resonemang bakom pjäsen, så att en framtida session (eller
medarbetare) kan ta vid utan att spela upp hela ursprungssamtalet igen.
README beskriver *vad* det är; det här beskriver *varför* och *vart*.

## Tesen

Tinguelys *Méta-Matics* (1959) var motordrivna maskiner som spottade ur sig
abstrakt konst — ett skämt om det spontana geniet. Den här maskinen ritar också,
men **slumpar inte**: den *hämtar* varje verk ur ett kontinuerligt latent rum
där varje möjlig teckning redan är en punkt. Att gå framåt är att interpolera.

2020-talsversionen av Tinguelys fråga är inte "vad är konst när en maskin kan
göra det?" utan: **oändligt många, aldrig något nytt — var finns originalet?**
Räknaren räknar; originalen förblir noll. Att signera (och betala för) något som
aldrig var unikt är hela poängen — ironin är verket.

## Modellen

- **Väggklocksdriven.** Serienumret är en ren funktion av tiden (igång sedan
  2026-01-01, 1 verk / 4 s). Samma verk för alla, just nu, utan server. Kärnan
  behöver ingen backend alls.
- **Latent vandring.** `coordFor(serial)` är en deterministisk gång genom ett
  brusfält → `(u,v)`. `genesFor(u,v)` ger staplade epicykler/övertoner som ritas
  som en variabelviktad "bläck"-ribbon (bredd ur penhastighet). Närliggande
  serienummer ger nästan identiska teckningar → bandet morfar mjukt.
- **Framtiden är okänd tills precis innan.** Verk till höger om nuet stiger fram
  ur brus och *skärps* mot låsögonblicket — en Fourier-avslöjning (låga
  frekvenser först, höga sist), inte en opacitets-crossfade. Långt bort krymper
  verken till punkter (både perf och "ska inte vara tydligt så långt fram").
- **Titta bort, inte stoppa.** Man kan frysa sin vy eller gummibands-peeka fram/
  bak (rubberband, spring-back), men maskinen tickar vidare. Bara *nuet* går att
  signera; det som passerat är borta om man inte sparade det.
- **Signering.** Inspektera → signera medvetet. Signaturer sparas i webbläsaren
  (localStorage). En liten Cloudflare Worker + KV håller en global räknare och
  antal signaturer per verk (`api/`).

## Beslut på pränt

- **En enda `index.html`.** Canvas, inga beroenden, inget bygge — läsbar som
  portfoliokod. Backend (tally + plånbok) ligger separat i `api/`.
- **Deploy:** Cloudflare Workers Builds (statiska assets i roten) + separat
  Worker för API:t. Push → bygg → deploy.
- **Performance är en förstaklassfråga.** Frysta/passerade verk cachas som bitmap
  (i princip gratis per frame), så kvaliteten kan skruvas upp; bara de ~2–3 verk
  som är mitt i morf/lås kostar per frame. Diffusionen är **skärmoberoende** —
  samma upplevelse på alla storlekar; på mobil "missar" man bruset om man inte
  scrubbar in i framtiden.
- **Språk:** svensk chatt, engelsk produkt. Dokument i repot på svenska.

## Roadmap

Levererat:

- ✅ Latent löpande band, väggklocksdrivet, deterministisk vandring.
- ✅ Variabelviktad bläck-ribbon (stroke under morf → ribbon vid lås).
- ✅ Diffusion som Fourier-avslöjning (låg→hög frekvens), inte grain-crossfade.
- ✅ Framtiden krymper till punkter långt bort (perf + koncept).
- ✅ Gummibands-scrub fram/bak med spring-back; bara nuet signerbart.
- ✅ Lås i skärmrymd (sista 22 px in i nuet); focus-ringens snap synkad exakt
  mot stroke→ribbon-övergången.
- ✅ "The Space" — kartan över det latenta fältet (delad väg, dina signeringar,
  maskinens nu). Fyller nu hela lediga vyn.
- ✅ Tally-backend (global summa + per-verk), plånbokssignering (`personal_sign`).
- ✅ Inspektera & signera, spara signerat verk som bild.
- ✅ Reduced-motion-läge (ingen autoplay, hämta stillbild av "nu").
- ✅ SEO/social: OG-/Twitter-taggar + genererad `og.png`, `robots.txt`, `sitemap.xml`.

### Öppet / nästa

- **Print-shop (huvudspåret för v2).** Tematiskt perfekt — en fysisk print är den
  ultimata "betala för att äga något som aldrig var original". Konsten är redan
  vektorlik canvas, så vilket verk som helst kan renderas i 300 dpi print-upplösning
  gratis. Det svåra är *handeln*, inte bilden. Stega:
  - **v2.0 — "Ladda ner print-fil".** Hög-upplöst PNG/PDF (300 dpi) av ett signerat
    verk. Nästan gratis, inget betalflöde. Ger 90 % av upplevelsen.
  - **v2.1 — riktig shop.** Print-on-demand via Gelato/Prodigi (poster/canvas,
    dropship, inget lager) + Stripe Checkout. Deras API tar en bild-URL + produkt
    och sköter tryck & frakt. Ett par dagars jobb, mest kring betalning/fulfillment/
    frakt-edge-cases.
- **Exakt räknare / skalning.** KV:s read-modify-write är inte atomär (två
  samtidiga `/sign` kan tappa en) och gratis-KV taket är ~1 000 writes/dygn
  (≈500 signeringar/dygn, 2 writes styck). Flytta räknaren till en **Durable
  Object** när trafiken kräver exakthet/högre tak.
- **Abuse-skydd på `/sign`.** Öppet by design, men en launch-spik eller en som
  scriptar loopen kan bränna KV-kvoten. Billigaste motmedlet: en **Cloudflare
  rate-limiting-regel** (dashboard, ingen kod). DO löser det på sikt.
- **NFT-mint (on-chain).** Den gamla "skarpa" idén — kedjans `totalSupply` som
  global liggare. Möjlig men lågt prioriterad; plånbokssigneringen bär redan
  poängen off-chain och gratis.

## Riktningar som testats och valts bort (så vi inte loopar om)

Diffusions-estetiken tog många varv. Dokumenterat så en framtida session inte
återuppfinner återvändsgränderna:

- **Grain/korn-crossfade — avfärdad.** Kändes som brus *ovanpå* bilden, inte som
  att den blev skarpare. Ville ha "skarpare och skarpare tills perfekt".
- **"Prickar/partiklar som flyger in" — avfärdad.** Migrerande partiklar läste
  som en annan mekanism; vi ville att verkets *egna* övertoner ska träda fram.
  Landade i Fourier-avslöjningen istället.
- **`ctx.filter`-blur (focus-ring/diffusion) — borttaget.** Tankade FPS (60→37).
- **Per-frame variabelt stegantal — borttaget.** Att omsampla kurvan varje frame
  gav "skakning" innan lås. Fast stegantal per verk (komplexitets-skalat) istället.
- **Brus + morf överlappande — borttaget.** Blev grötigt; nu sekventiell ease-in.
- **Skärmberoende diffusion — borttaget.** Bruset kom in olika på mobil/desktop
  och kortade morfen; gjordes skärmoberoende.

## Slutmål: en portfolio-works-case

Precis som Cadence är tänkt att dubbla som works-case (github: tor2dbear/portfolio,
Hugo) kan Méta-Matic bli en egen entry. Vinkel: generativ konst + latent rum, med
hyllningen till hur AI genererar bild (diffusion → Fourier-avslöjning) som den
tekniska kroken, och den konceptuella frågan — *var finns originalet?* — som
berättelsen. När pjäsen känns klar: skriv entryn.
