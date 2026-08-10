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

## Hosting (Cloudflare Pages)

Statisk sida, ingen byggprocess:

- **Framework preset:** None
- **Build command:** *(tomt)*
- **Output directory:** `/`

Anslut repot i Cloudflare Pages → varje push till `main` auto-deployar.

## Vidare (den "skarpa" versionen)

- En liten backend (Cloudflare Worker + KV / Supabase) som loggar **totala antalet
  signerade** globalt — och antal signaturer per verk.
- **Signera med plånbok** (`personal_sign`, off-chain, gratis) eller full **NFT-mint**
  (on-chain, kostar gas) — där kedjans `totalSupply` blir den globala liggaren.
  Ironin är poängen: att betala för att äga något som aldrig var original.

Dessa kräver fristående hosting (som denna) — de fungerar inte i en sandlådad förhandsvisning.
