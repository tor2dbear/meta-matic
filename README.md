# Méta-Matic ∞

En digital ritmaskin efter **Jean Tinguely** — ett *latent löpande band* som ritar
oändligt många verk och aldrig något nytt.

1959 byggde Tinguely sina *Méta-Matics*: motordrivna maskiner som spottade ur sig
abstrakt konst på löpande band — ett skämt om det spontana geniet. Den här maskinen
ritar också, men slumpar inte fram sina verk: den *hämtar* dem ur ett kontinuerligt
rum där varje möjlig teckning redan är en punkt. Att gå framåt är att interpolera.
Bandet stannar aldrig, upprepar sig aldrig exakt — och skapar ändå aldrig något nytt.
Räknaren räknar. Originalen förblir noll.

Frågan är inte längre Tinguelys *"vad är konst när en maskin kan göra det?"* utan en
2020-talsversion: **oändligt många, aldrig något nytt — var finns originalet?**

## Så fungerar den

- **Väggklocksdriven.** Serienumret är en ren funktion av tiden (igång sedan 2026-01-01,
  takt 1 verk / 4 s). Maskinen går oavsett om någon tittar — samma verk för alla, just nu,
  helt utan server.
- **Latent rum, simulerat.** Varje verk ritas med staplade epicykler vars parametrar
  hämtas ur ett kontinuerligt brusfält. Närliggande koordinater ger nästan identiska
  teckningar → bandet morfar. Vandringen är bunden och återkommer ständigt.
- **Titta bort.** Du kan frysa din vy, men inte stoppa maskinen — räknaren tickar vidare.
  Titta tillbaka och den har hunnit rita utan dig.
- **Granska & signera.** Klicka på ett verk för att förstora det och signera det medvetet.
  Bara det du signerar kan sparas som bild. Signeringar sparas i din webbläsare.

Allt är en enda självständig `index.html` — Canvas, inga beroenden, inget bygge.

## Hosting (Cloudflare Workers Builds)

Statisk sida — `index.html` plus assets (`og.png`, `robots.txt`, `sitemap.xml`) i
repo-roten, ingen byggprocess. Repot är anslutet till **Cloudflare Workers Builds**:
varje push bygger och deployar. Tally-API:t är en separat Worker under `api/`
(route `api.tor2dbear.com/meta-matic/*`, se `api/wrangler.toml`).

## Vidare

Backenden (Cloudflare Worker + KV för global signeringsräknare) och
plånbokssignering (`personal_sign`, off-chain) är **byggda**. Nästa steg,
öppna idéer och avfärdade spår lever i **[`NOTES.md`](NOTES.md)** — bland annat
idén att beställa sitt signerade verk som en fysisk **print**.
