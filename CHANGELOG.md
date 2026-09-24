## 2026-09-24-wx-label · Weather warning title, district cards, nowcast

- Homepage weather card heading is **मौसम चेतावनी** / **Weather warning**. It no longer says “पाँच दिनको मौसम चेतावनी” / “Five-day weather warning”, including the no-JS fallback. On `notices.html#alert` the same title frames the district cards. The section heading stays **भारी वर्षा चेतावनी** / Heavy Rain Alert. Timeline bars still name the DHM products.
- The weather board footer no longer prints the Sources / स्रोत line (Monsoon Bulletin-3 #12297 · 4-day warning #12299 · Bhotekoshi corridor #12307 · 5-day warning #12300) on the homepage or `notices.html#alert`. Those bulletin names stay on the timeline.
- District impact cards from @NMD_Weather (24 Sep ~19:03 NPT): **सिन्धुपाल्चोक** high impact · medium likelihood; **बागलुङ** and **म्याग्दी** medium impact · medium likelihood. Validity Asoj 8, 6:00 PM through Asoj 11, 6:00 AM. No invented MFD page IDs. Images: `img/dhm/impact-sindhupalchok.jpg`, `impact-baglung.jpg`, `impact-myagdi.jpg`. Links go to the X post and dhm.gov.np/mfd.
- Nowcast at 7:40 PM Asoj 8: light to moderate rain in some places of Koshi, Bagmati and Lumbini; a few places in Madhesh, Gandaki and Karnali; past-hour maximum **9.6 mm** at Jhapa Kechana. Image: `img/dhm/rainfall-now-1h.jpg`.
- #12300 five-day province maps and #12307 corridor stay the map and timeline. Ask weather answers read the same district and nowcast fields.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-wx-label`

## 2026-09-24-portal-ux · Portal design system, Ask sheet, refresh banner

- Light civic tokens (type scale, card radius, shadow, spacing, semantic colours) apply across pages that share `bulletin.css`. Primary accent `#c41e3a` stays on the brand, the Live chip, and actions. KPI numbers share one size. Notices history cards and pager chips use the same card language. Dark full-bleed alert blocks on the page are light cards.
- Ask is a sheet above the map and the sticky header. The button sits on the left so it does not cover the right-hand fab dock. Answers are a user bubble, then a card with a topic line, source, and action, then follow-ups. FAQ search is always visible and filters as you type; a tap adds that question to the thread.
- A dismissible banner appears when `latest.json` or a waiting service worker is newer than this page: “नयाँ अपडेट उपलब्ध छ। New update available — tap to refresh.” Dismiss lasts for that version in the tab session. The page does not reload by itself.
- DoR NAVIGATE rechecked at 19:33 NPT on 24 Sep 2026 (`getAggregateData`: total 10, closed 6, opened 4, partial 0). New closed section id 899: NH17-002 Jarekhet, Dhading, landslide from 18:30, estimate 20:33, point 27.7686, 84.9408. NH08 is still duplicated on the closed feed, so the chip is 6 and the list shows five unique closures. Weather lead stays DHM **#12300** from `main` (not rewritten). SitRep #16, NCHL (22 Sep 00:00), Fonepay (21 Sep), MoF PMDRF, and name lists were not changed: no newer official board could be verified.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-portal-ux`

## 2026-09-24-dhm-12300 · DHM five-day weather warning #12300

- Live lead is DHM **#12300** (issued Asoj 8 / 24 Sep 2026, 18:00 NPT): five-day weather warning for Asoj 8–12. Official page text is empty; the product is the five day maps. Homepage and `notices.html#alert` read `data/weather-alert.json`. No citizen-reprint line and no bulletin-number badge on the live card.
- Day chips for Asoj 8–12 recolor the map from `img/dhm/warning-12300-day{1,2,3,4,5}.png`. The colour is the highest DHM warning read inside each province. #12299 stays on the timeline as the prior map lead. Corridor companion is Bulletin-26 **#12307** (Asoj 8 night through Asoj 11 morning; Rasuwa, Nuwakot, Dhading, Gorkha, Chitwan). #12296 is off the live timeline. No river gauges.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-dhm-12300`

## 2026-09-24-wx-districts-tiles · High-alert areas and OSM roads

- Homepage and `notices.html#alert` show a compact high-alert card: red areas first, then orange, from the focused day or the four-day highest reading in `data/weather-alert.json`. The Bhotekoshi corridor districts (Rasuwa, Nuwakot, Dhading, Gorkha, Chitwan) stay on that card while companion bulletin #12296 is still inside its timeline window. Names and levels are the published ones, in Nepali and English.
- The weather section heading is **भारी वर्षा चेतावनी** / Heavy Rain Alert. The card itself still uses the published product name from `ui.title`. The card no longer repeats the brand, badge, and issued stack. The issued line stays once, smaller. The no-JS homepage fallback no longer links “पूर्ण बुलेटिन र आधिकारिक नक्सा”; the board replaces that static copy.
- Day chips carry the day's highest warning colour. The timeline fits the phone width.
- DoR NAVIGATE maps use OpenStreetMap tiles from the first paint. Carto Voyager is gone (it was drawing an API-key watermark on HTTP 200). If OSM tiles fail, the map falls back to a plain grid, not another keyed basemap.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-wx-districts-tiles`

## 2026-09-24-dhm-12299 · DHM four-day weather warning #12299

- Live lead is DHM **#12299** (issued Asoj 8 / 24 Sep 2026, 08:00 NPT): four-day weather warning for Asoj 8–11. Official page text is empty; the product is the four day maps. Homepage and `notices.html#alert` read `data/weather-alert.json`. No citizen-reprint line and no `#12299` badge on the live card. Timeline rows cite #12299, #12298, #12297 and #12296.
- Day chips for Asoj 8–11 recolor the map from `img/dhm/warning-12299-day{1,2,3,4}.png`. The colour is the highest DHM warning read inside each province (red take action, orange be prepared, yellow be updated, green no warning). Other colours are named only when they cover a clear share of that province, not a thin border. No new rainfall millimetres and no river gauges.
- Overview is the highest of those four map readings. #12296 (Bhotekoshi corridor, through the morning of Asoj 10) stays on the timeline and the Bagmati callout. #12297 moves to the timeline as the prior lead, not live. #12298 (three-day map, Asoj 7 evening) is on the timeline for Asoj 8–10; its maps are archived. SitRep and cash boards unchanged.
- Short notices update and `latest.json` point at `notices.html#alert` with the DHM MFD link.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-dhm-12299`

## 2026-09-24-ask-panel · Homepage Ask / सोध्नुहोस्

- Homepage FAB **सोध्नुहोस् / Ask** opens a mobile-first sheet. Eight chips (weather, roads, rescue, name search, relief fund, helplines, LPG, road map) and a free-text box answer from the published boards: `data/weather-alert.json`, `data/roads-dor.json`, `api/dashboard.json`, the supply and helpline pages, and the existing names index. No external model and no new figures.
- Relief lines stay the labeled MoF, USD, NCHL, Fonepay, named-handover, and NVIDIA amounts. They are not added together. Name queries open the existing search. Weather and road answers follow province, day, highway code, and place.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-ask-panel`

## 2026-09-24-map-colors · Alert colours, clean map face

- Weather choropleth (homepage and `notices.html#alert`) has no names or figures drawn on the provinces. Hover or tap opens a card with the province, the warning colour, and the existing rainfall or day text. Tap elsewhere or Escape closes it. Day chips still recolor the map; colours ease between red, orange, yellow, and green. Zoom buttons, mouse drag, and a two-finger pinch change the scale. One-finger scroll still moves the page.
- Overview colours follow the printed rainfall category: very heavy is red, heavy to very heavy is orange, heavy is yellow. Day mode still uses the official DHM red / orange / yellow / green reading. The legend is those four swatches in Nepali and English. Gantt bars use the same four colours. Rainfall sentences are unchanged.
- DoR markers are colour dots (closed red, partial orange, open green) with no code printed on the map. The NH42 corridor is green except the closed Syaphrubesi–Rasuwagadhi section in red. Tap still opens the closure card. One-finger drag does not steal page scroll.
- The road basemap is OpenStreetMap France tiles (`{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png`, max zoom 19), with © OpenStreetMap contributors. `tile.openstreetmap.org` answered this network with an access-blocked tile, and Carto Voyager was drawing an API-key watermark. The weather map stays the province drawing and does not use those tiles.
- Weather and road cards paint from `data/weather-alert.json` and `data/roads-dor.json` before any DHM or NAVIGATE request. Those live calls abort after 4 seconds and a failure leaves the local map in place. Leaflet for the road card and the damage-page flood map is `vendor/leaflet/` (no CDN). The damage page was missing the script closers around that map, so the Leaflet tag never ran.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-map-colors`

## 2026-09-24-live-maps · Weather day switcher and DoR map

- Homepage and `notices.html#alert` province map stays on the Friday–Sunday peak outlook by default (Gandaki and Lumbini very heavy with isolated extremely heavy; Koshi, Madhesh, Bagmati and Sudurpaschim heavy to very heavy; Karnali heavy). Provinces are buttons with a clear selected outline. Tapping one updates the detail, including bulletin #12297 and, for Bagmati, corridor #12296.
- Day chips for Asoj 7–11 recolor the choropleth from the official #12297 day maps (`img/dhm/warning-12297-day1.png` … `day5.png`). The colour is the highest DHM warning read inside each province: red take action, orange be prepared, yellow be updated, green no warning. Mixed provinces name the other colours. No new rainfall millimetres. The Gantt stays; #12297 focuses the peak overview and #12296 focuses Bagmati.
- A quiet check of `https://dhm.gov.np/mfd/api/page/12297` compares `update_at` with the cached stamp. A newer stamp shows a notice and the official link. It does not rewrite the reprint.
- `notices.html#roads` and the homepage card plot NAVIGATE closures on a map (Leaflet, Carto/OSM tiles). NH42 is the strategic-road line, with NH42-014 (Syaphrubesi–Rasuwagadhi) in red and the closure point from DoR. Closed and recently opened points open reason, times, and contact. Chips stay 9 / 5 closed / 4 opened / 0 partial unless a live recheck of `Dashboard_api/getAggregateData` disagrees, in which case the chips follow the live feed and say so. Ticker partial NH03 has no public coordinate, so it stays in the list only. Snapshot as of 24 Sep 2026, 09:42 NPT. Dashboard: https://navigate.dor.gov.np/app/dashboard
- Strings for the new controls are Nepali and English in `data/weather-alert.json` and `data/roads-dor.json` and follow the language toggle. SitRep and cash boards unchanged.
- Live weather and road cards do not print the citizen-reprint line or a `#12297` / `#12296` badge in the subtitle, province detail, or disclaimer. Dates and the product name stay. Timeline rows and history cards still cite official IDs. Source lines are `स्रोत: DHM` and `स्रोत: NAVIGATE`.
- Homepage no longer shows the name-search bar (`#home-search`). Name search stays on `names.html` and in the header overlay.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-live-maps-ui`

## 2026-09-24-weather-12297 · DHM Monsoon Bulletin-3 update #12297

- Live lead is DHM **#12297** Monsoon Special Bulletin-3 UPDATE (issued Asoj 7 / 23 Sep 2026, 18:00 NPT), a five-day warning for Asoj 7–11. Homepage and `notices.html#alert` share one infographic from `data/weather-alert.json`: province choropleth, Bhotekoshi corridor callout (#12296), and the same Gantt timeline in Nepali and English.
- Province outlook for the Friday–Sunday peak: Gandaki and Lumbini very heavy with isolated extremely heavy; Koshi, Madhesh, Bagmati and Sudurpaschim heavy to very heavy in a few places; Karnali heavy in a few places. No river-gauge figures.
- Official day maps archived as `img/dhm/warning-12297-day{1,2,3,4,5}.png` and shown on the notices alert section. Short notices update only. Helpline 1155 → `contact.html#helpline`.
- Previous live card #12294 / Bulletin-25 #12296 moved to a history card. Both stay on the timeline (#12294 Asoj 7–9, #12296 Asoj 7 night–10 morning). #12293 is superseded for the Friday–Sunday window. #12290 / Bulletin-24 remain the older history card. SitRep KPIs and cash boards unchanged.
- `index.html#alert`, `#weather` and `#wx` redirect to `notices.html#alert`. Badge is Weather Alert / मौसम चेतावनी. Citizen-bulletin disclaimer stays.
- Last-updated chip is 8 Asoj / 24 Sep. Issue stamp on the card stays 23 Sep 18:00.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-24-weather-12297`
- Department of Roads NAVIGATE snapshot in `data/roads-dor.json` (as of 24 Sep 2026, 09:42 NPT): chips 9 total / 5 closed / 4 opened / 0 partial. Homepage card highlights **NH42 closed** (Galchi–Trishuli–Betrawati–Mailung–Syaphrubesi–Rasuwagadhi, Tibet flood, 26 Aug). `notices.html#roads` lists closed, partial, recently opened, and other ticker openings. NH17 Shital Bazaar stays closed (est. 25 Sep 16:00, Er. Dhiraj Dhakal); the ticker “opened” line is a different cleared section. Citizen reprint; official status is DoR. `index.html#roads` already redirects here.

## 2026-09-23-weather-12294 · DHM warning #12294 + Bulletin-25

- DHM MFD **मौसम चेतावनी #12294** (7 Ashwin 08:00 / 23 Sep): map-based 3-day warning (Ashwin 7–9); official text empty. Maps archived `img/dhm/warning-12294-day{1,2,3}.png`. Citizen reprint with DHM links. NDRRMA shared the maps.
- Same-day **Special Weather Bulletin-25** (#12296, 16:40): many places medium rain Rasuwa/Nuwakot/Dhading/Gorkha/Chitwan from the night of 7 Ashwin through the morning of 10 Ashwin; **heavy rain possible in 1–2 places in each district**. Past 24h: some medium in those districts; Dhading 1–2 places heavy measured. Official district map `img/dhm/bulletin-12296-districts.png` + day/night table on `notices.html#alert`.
- Short notices update (not a long post) points at `#alert` and mentions Monsoon Bulletin-3 update **#12293** (Ashwin 9–11 heavy-rain risk). Homepage weather strip updated. Previous #12290 / Bulletin-24 kept as the labeled history card. SitRep KPIs, MoF/NCHL/Fonepay, markets, LPG unchanged.
- `latest.json` id **2026-09-23-weather-12294** (official DHM only; url `notices.html#alert`). brand_date chip → 7 Ashwin / 23 Sep. No new SitRep figures.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-23-weather-12294`

## 2026-09-22-weather-12290 · DHM warning #12290 + Bulletin-24

- DHM MFD **मौसम चेतावनी #12290** (6 Ashwin 08:00 / 22 Sep): map-based 3-day warning; official text empty. Maps archived `img/dhm/warning-12290-day{1,2,3}.png`. Citizen reprint with DHM links.
- Same-day **Special Weather Bulletin-24** (#12291, 17:00): medium rain possible Rasuwa/Nuwakot/Dhading/Gorkha/Chitwan from night of 6 Ashwin through morning of 9 Ashwin; **heavy rain possible in 1–2 places in all five districts**. Official district map `img/dhm/bulletin-12291-districts.png` + day/night table on `notices.html#alert`. Full text `data/dhm-12291.txt`.
- Homepage weather strip points to `notices.html#alert` with #12290 / Bulletin-24. Older #12284 / Bulletin-22 kept as a labeled history card. SitRep KPIs, MoF/NCHL/Fonepay, markets, LPG unchanged.
- `latest.json` id **2026-09-22-weather-12290** (official DHM only; url `notices.html#alert`). brand_incident + notify unchanged.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-22-weather-12290`

## 2026-09-22-fonepay-21 · Fonepay core till date (yesterday 21 Sep)

- Fonepay CORE CHANNELS for the Prime Minister's Disaster Relief Fund, board dated yesterday **2026-09-21**. Till date: **934,063** txns · **Rs. 2,565,077,401** (~२.५७ अर्ब / रु. २ अर्ब ५७ करोड). Domestic QR 838,162 / 2,255,745,331 · Fonepay Bills 64,065 / 205,134,047 · NPCI 24,012 / 62,000,386 · ALIPAY 4,371 / 22,789,669 · IBFT 3,453 / 19,407,969.
- Yesterday 21 Sep: **760** txns · **Rs. 6,523,383**. Domestic QR 278 / 3,027,981 · Bills 403 / 2,783,450 · NPCI 36 / 529,029 · ALIPAY 43 / 182,923 · IBFT 0 / 0.
- Labeled NCHL+Fonepay **8,999,626,914.61** (~९.०० अर्ब) = live NCHL **6,434,549,513.61** (22 Sep, unchanged) + new Fonepay till-date **2,565,077,401**. Not a mega-total with MoF. MoF 9.99 / USD 23.4m / available 13.57, named handover 2.74, and NCHL's own total stay separately labeled.
- The board TOTAL row is **2,565,077,401**. The five channel amounts as printed sum to 2,565,077,402 (1 rupee). The table and headline use the board's printed figures, including that total row.
- Previous Fonepay (~२.५१ अर्ब · 925,407 / 2,507,249,462) is history. Archive `img/today-2026-09-21-fonepay-core.jpg`. SitRep KPIs, weather, markets, LPG, and named donors unchanged.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-22-fonepay-21`

## 2026-09-22-nchl-0000 · NCHL 22 Sep 00:00

- NCHL channels for the Prime Minister's Disaster Relief Fund at **22 Sep 2026 00:00**: **272,248** txns · **Rs. 6,434,549,513.61** (~६.४३ अर्ब). IPS/Cheque 5,668 / 2,879,233,119.80 · Card-International 103,608 / 1,755,487,707.88 · Online Transfer 17,761 / 1,051,569,724.32 · Domestic QR 116,779 / 425,036,433.55 · Remittance 27,237 / 313,527,437.55 · Int'l QR 730 / 6,380,842.74 · Card-Domestic 465 / 3,314,247.77.
- Labeled NCHL+Fonepay **8,941,798,975.61** (~८.९४ अर्ब) = new NCHL 6.43 + Fonepay till-date **2.51 unchanged**. Not a mega-total with MoF. MoF 9.99 / USD 23.4m / available 13.57, named handover 2.74, and Fonepay's own total stay separately labeled.
- Previous NCHL 14 Sep 00:00 (263,267 / 5,521,433,368.22) is history. Archive `img/today-2026-09-22-nchl-0000.jpg`. SitRep KPIs, weather, markets, and LPG unchanged.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-22-nchl-0000`

## 2026-09-20-weather-12284 · DHM weather warning #12284 + notify

- DHM MFD **मौसम चेतावनी #12284** (4 Ashwin 18:00 / 20 Sep): map-based 3-day warning; official text empty. Maps archived `img/dhm/warning-12284-day{1,2,3}.png`. Citizen reprint with DHM links.
- Same-day **Special Weather Bulletin-22** (#12283, 16:30): medium rain possible Rasuwa/Nuwakot/Dhading/Gorkha/Chitwan through 7 Ashwin morning; heavy rain possible 1–2 places in Gorkha/Rasuwa/Nuwakot/Dhading. Official 5-district map `img/dhm/bulletin-12283-districts.png` + day/night table on `notices.html#alert`. Full text `data/dhm12283.txt`.
- New **मौसम सतर्कता** card at top of `notices.html#alert`; homepage strip links there. Older #alert items stay as history. SitRep #16 KPIs unchanged.
- Restored discreet header **अपडेट अलर्ट On/Off** (`notify.js` + i18n `notify_*`): Notification permission, SW `{type:'check', welcome:true}`, mute/unmute, periodicsync `rasuwa-updates`.
- `latest.json` id **2026-09-20-weather-12284** so opted-in users get a weather push (title/body/url `notices.html#alert`). New notices/SitReps/weather must bump `latest.json` to push.
- `PAGE_VER` / `?v=` / `sw.js` / `latest.json` → `2026-09-20-weather-12284`

## 2026-09-20-2030 · NDRRMA SitRep #16

- NDRRMA / MoHA SitRep #16 · 4 Ashwin 19:00 / 20 Sep: dead **1,451** · rescued **13,784** · currently in treatment **15** (5 hospitals) · security-agency treatment **10,163** · missing ~**5,786** (do not re-sum; 110 identified handovers deducted). Army heli **today 33** (no cumulative printed) · previous Army **1,692** / APF **320** is SitRep #15 history. Holding **20** centers (Rasuwa 786 · Nuwakot 324 · Dhading 121). Security forces mobilised **20,929** (no agency split on this board). Fuel/LPG not printed — previous SitRep #14 60k/12k/4k · LPG **502** is history. District deaths: Chitwan 367 · Nawal E 232 · West 222 · Nuwakot 236 · Rasuwa 203 · Gorkha 79 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2 (sum 1,451). Female 336 · Male 585 · human remains 530. DNA relatives **1,997**. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member · max 6 months · process sent to local governments. Archive `img/today-2026-09-20-ndrrma-sitrep16-1900.jpg`.
- Previous SitRep #15 (1,411 / 13,784 / 18 / 1,692 / holding 24 / Nuwakot 427) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) and markets/LPG/Everest unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-20-2030`

## 2026-09-19-2130 · NDRRMA SitRep #15

- NDRRMA / MoHA SitRep #15 · 3 Ashwin 19:00 / 19 Sep: dead **1,411** · rescued **13,784** · currently in treatment **18** (6 hospitals) · security-agency treatment **10,041** · missing ~**5,875** (do not re-sum; revised after deducting **110** identified bodies). Army heli **1,692** (41 today) · APF **320**. Holding **24** centers (Nuwakot 427 · Rasuwa 794 · Dhading 121). Security forces mobilised **20,935** (no agency split on this board). Fuel/LPG not printed — previous SitRep #14 60k/12k/4k · LPG **502** is history. District deaths: Chitwan 364 · Nawal E 232 · West 222 · Nuwakot 203 · Rasuwa 199 · Gorkha 79 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2. Female 336 · Male 549 · human remains 526. DNA relatives **1,991**. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member. Header now shows incident date **10 Bhadra / 26 Aug**. Archive `img/today-2026-09-19-ndrrma-sitrep15-1900.jpg`.
- Previous SitRep #14 (1,410 / 13,756 / 344 / 1,634 / holding 27 / Nuwakot 832) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) and markets/LPG/Everest unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-19-2130`

## 2026-09-17-2000 · NDRRMA SitRep #14

- NDRRMA / MoHA SitRep #14 · 1 Ashwin 19:00 / 17 Sep: dead **1,410** · rescued **13,756** · treated **344** (19 hospitals) · discharged **290** · security-agency treatment **9,820** · missing ~**6,145** (do not re-sum; revised after deducting **110** identified bodies). Army heli **1,634** (31 today) · APF **320**. Holding **27** centers (Nuwakot 832 · Rasuwa 817 · Dhading 94). Fuel 60k/12k/4k · LPG **502**. District deaths: Chitwan 364 · Nawal E 232 · West 222 · Nuwakot 203 · Rasuwa 199 · Gorkha 78 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2. Female 336 · Male 549 · human remains 525. DNA relatives **1,944**. This board prints no Army/Police/APF/gov/bank missing bars (SitRep #12 agency labels history). Acrow bridge Devighat, Nuwakot operational. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member. Archive `img/today-2026-09-17-ndrrma-sitrep14-1900.jpg`.
- Previous SitRep #13 (1,403 / 13,742 / 344 / 1,603 / holding 29 / Nuwakot 1,185) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) and markets/LPG/Everest unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-17-2000`

## 2026-09-16-2000 · NDRRMA SitRep #13

- NDRRMA / MoHA SitRep #13 · 31 Bhadra 19:00 / 16 Sep: dead **1,403** · rescued **13,742** · treated **344** (19 hospitals) · discharged **289** · security-agency treatment **9,496** · missing ~**6,150** (do not re-sum; revised after deducting **105** identified bodies). Army heli **1,603** (42 today) · APF **320**. Holding **29** centers (Nuwakot 1,185 · Rasuwa 817 · Dhading 94). Fuel 59k/15k/6k · LPG **502**. District deaths: Chitwan 364 · Nawal E 232 · West 222 · Nuwakot 202 · Rasuwa 193 · Gorkha 78 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2. Female 336 · Male 544 · human remains 523. DNA relatives **1,889**. This board prints no Army/Police/APF/gov/bank missing bars (SitRep #12 agency labels history). Acrow bridge Devighat, Nuwakot operational. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member. Archive `img/today-2026-09-16-ndrrma-sitrep13-1900.jpg`.
- Previous SitRep #12 (1,395 / 13,737 / 341 / 1,531 / holding 33 / Nuwakot 1,499) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) and markets/LPG/Everest unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-16-2000`

## 2026-09-15-0015 · Rebase onto main (Everest Gas + markets restyle)

- Rebased markets MoF `/plans/` restyle onto latest `main` (Everest Gas labeled source `2026-09-14-2230`, plus `_shot_*` cleanup).
- Kept both: `markets.html` / homepage `#cat-markets` restyle **and** Everest Gas links on `supply.html` + i18n. SitRep #12 / cash KPIs unchanged.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-15-0015`

## 2026-09-14-2345 · Markets page follows MoF /plans/ IA

- Restyle `markets.html` to the official MoF `/plans/` information design: hero (title · २०८३ भदौ २९ / 14 Sep 2026 · lead), labeled KPI strip (२१ बुँदा · ९ विषय · ६ निकाय · तत्काल ४ · असोज मसान्त · CGT ३.७५%/५% · ४५ दिन), **किन यो कार्ययोजना** preamble, navigable विषय grid, जिम्मेवार निकाय counts (dual-agency counted once each), मार्गचित्र timeline with per-deadline item numbers, and **numbered २१ action items** with agency + deadline chips. Filters click-to-narrow. Official MoF plans page linked as reference.
- Citizen bulletin stays explicit: no MoF logos/branding; source line **नेपाल सरकार, अर्थ मन्त्रालय · मिति २०८३।०५।२९ · यो स्वतन्त्र नागरिक बुलेटिन हो।** SitRep KPIs, cash totals, LPG/Everest source unchanged.
- Homepage `#cat-markets` snap now uses the same KPI language (२१ बुँदा / विषय / CGT / ४५ दिन) plus theme counts.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-2345`

## 2026-09-14-2230 · Everest Gas labeled distribution source

- `supply.html` / i18n: Everest Gas Udhyog / Everest Gas Sansar as a **labeled-separate** bottler reference (official site + Facebook). Not Customs import; not dealer-stock KPI.

## 2026-09-14-2200 · MoF capital-market recovery plan

- New `markets.html`: Government of Nepal, Ministry of Finance **पुँजी बजार सुधार एवं पुनरुत्थान कार्ययोजना** dated **२०८३।०५।२९** (after 10 Bhadra Bhotekoshi flood). Full Nepali plan text in thematic cards (IPO / bonds-ETF-MF / NEPSE / benchmark / NRN / brokers-Act / institutional / tax-CDS-NRB) with deadline chips. EN gists via i18n. Citizen bulletin — not a government site. No invented figures.
- Homepage `#cat-markets` infographic (date · CGT ३.७५%/५% · ४५-दिन floor · theme + month chips) links to `markets.html`.
- Sitewide nav chip **पुँजी बजार पुनरुत्थान** / **Capital market recovery**; hash redirects `#markets` / `#cat-markets` / `#capital` → `markets.html`.
- Archive: `data/mof-capital-market-plan-2083-05-29.md` + `.docx`. SitRep #12 KPIs and cash channels unchanged.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-2200`

## 2026-09-14-2015 · NDRRMA SitRep #12

- NDRRMA / MoHA SitRep #12 · 29 Bhadra 19:00 / 14 Sep: dead **1,395** · rescued **13,737** · treated **341** (19 hospitals) · discharged **278** · security-agency treatment **9,358** · missing ~**5,130** (do not re-sum). Army heli **1,531** (15 today) · APF **320**. Holding **33** centers (Nuwakot 1,499 · Rasuwa 825 · Dhading 94). Fuel 47k/16k/11k · LPG **502**. District deaths: Chitwan 364 · Nawal E 232 · West 222 · Nuwakot 202 · Rasuwa 186 · Gorkha 77 · Dhading 72 · Tanahun 38 · Kathmandu treatment 2. Missing labels this board: Army 25 · Police 73 · APF 45 · gov 12 · bank/FI 26. DNA relatives **1,853**. SAR equipment budget (million NPR): Army 90 · Police 60 · APF 60. Holding-exit cash: NPR 15,000 (≤4) · +2,000/extra member. Archive `img/today-2026-09-14-ndrrma-sitrep12-1900.jpg`.
- Previous SitRep #11 (1,388 / 13,728 / 339 / 1,516 / Nuwakot holding 1,613) moved to history. Cash channels (MoF / NCHL / Fonepay / named handover) unchanged and separately labeled.
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-2015`

## 2026-09-14-1700 · Named handover Excel through Bhadra 28

- `data/pmdrf-named-donors.json`: 492 donors · Rs. 2,737,630,633.82 (Bhadra 11–28); days/totals from Total sheet; MoF/NCHL/Fonepay unchanged and separately labeled.
- donate/index/i18n hero + directory kickers updated; Excel archived under `data/`.

## 2026-09-14-1330 · Merge damage + RDNA + map/timeline

- One `damage.html` page: existing EMS/damage/power, then `#rdna` (unchanged), then `#map` / `#path` moved from `map.html` (unchanged)
- Sitewide nav: single **क्षति मूल्यांकन** chip → `damage.html`; removed top-level `nav_rdna` and `nav_map`
- In-page jump on `damage.html` only: `#ems927` · `#rdna` · `#map`
- Hash redirects: `#map` / `#path` → `damage.html#map` / `#path`; `#rdna` / `#infographics` stay on `damage.html#rdna`
- Thin `map.html` shim → `damage.html#map` (keeps `#path`)
- Title/meta labels cover damage + RDNA + map/timeline; personal bulletin; figures untouched
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-14-1330`

## 2026-09-14-0915 · NDRRMA SitRep #11 + cash boards

- NDRRMA / MoHA SitRep #11 · 28 Bhadra 19:00 / 13 Sep: dead **1,388** · rescued **13,728** · treated **339** (19 hospitals) · discharged **271** · security-agency treatment **9,314** · missing ~**5,130** (do not re-sum). Army heli **1,516** (34 today) · APF **320**. Holding **33** centers (Nuwakot 1,613 · Rasuwa 825 · Dhading 94). Fuel 33k/18k/15k · LPG **502**. Archive `img/today-2026-09-13-ndrrma-sitrep11-1900.jpg`.
- OPMCM PMDRF 2083/05/28 17:00: 9-bank NPR **9,995,024,994** (~9.99bn) · USD **23,441,854** · equiv NPR **3,576,992,569** @152.59 · available **13,572,017,563** (~13.57bn). Not stacked with NCHL/Fonepay/named.
- NCHL 14 Sep 00:00: **263,267** / **5,521,433,368.22** (~5.52bn).
- Fonepay CORE till date: **925,407** / **2,507,249,462** (~2.51bn). Yesterday 13 Sep 1,512 / 8,942,981 (subtitle).
- Labeled NCHL+Fonepay **8,028,682,830.22** (~8.03bn) — not a mega-total with MoF.

## 2026-09-12-1515 · Nepal Police highway blockages

- `notices.html` `#roads`: prepend Nepal Police main-highway board as of BS 2083/05/27 06:40 (archive `img/today-2026-09-12-nepal-police-highway-0640.jpg`); history log + home roads chips; i18n EN roads/hist.

## 2026-09-12-1400 · LPG hoarding transparency

- `supply.html`: `#lpg-scope` disclaimer (Customs totals ≠ hoarding); `#lpg-hoarding` cards for distribution framework + NOC sources, official-source ask, complaint pointers (100 / 1234 / contact helpline), and explicit won’t-do list.
- i18n NE/EN keys; CSS for scope/hoard cards; `latest.json` → `#lpg-hoarding`.

# Changelog — design / layout

## 2026-09-12 · PAGE_VER 1300 — LPG distribution official sources

### supply.html
- New `#lpg-sources` / `.lpg-info` card below customs table/archive
- Labeled channels: Customs import (this page) vs NOC distribution/bottling (separate)
- Links: NOC bottler directory · NOC storage (depot capacity ≠ LPG cylinder stock) · Onlinekhabar news citing NOC (~87,877 cylinders Bhadra 18–20) marked secondary
- Cylinder icon; search/tracker/MT figures unchanged; no auto-fetch; news numbers not merged into KPIs

### i18n
- NE default + EN keys for title, channel labels, and three source links

### CSS
- `.lpg-info` teal source card · dual channel chips · `.lpg-src-list` link list

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1300`

## 2026-09-12 · PAGE_VER 1245 — LPG cylinder icon graphics

### supply.html
- KPI day cards: flat crimson LPG cylinder SVG (`.lpg-kpi-ico`) beside date chip
- Section head: forest dot → cylinder mark (`.lpg-sec-ico`)
- Source line: teal customs-gate icon before source text
- Office rows: map-pin icon before office name (sibling of `data-i18n` span)
- Tracker strip: offices / up / down / stop icons on status cards
- Archive PNG links unchanged; MT/cylinder figures and search/filter unchanged

### index.html
- Home LPG category mark + snap mini cylinder for consistency

### CSS
- `.lpg-ico` / `.lpg-kpi-ico` / `.lpg-off-ico` / `.lpg-track-ico` (~28–40px KPI, ~14–16px rows)
- Nepal crimson `#c41e3a` cylinder body; teal accents; light chip backgrounds only
- Inline SVG only (no new binary assets)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1245`

## 2026-09-12 · PAGE_VER 1230 — LPG search + filter tracker

### supply.html
- Name-list-style search (`.ui-search`) above `.lpg-rows`: filter by Nepali/English office name
- Filter chips: All / Up ▲ / Down ▼ / No entry (Dhangadhi)
- Status tracker strip: कुल नाका ६ · बढेको ३ · घटेको २ · प्रवेश छैन १
- Highlight pills: biggest drop Birgunj ▼62.6% · biggest rise Mechi (existing figures only)
- Row `data-office` / `data-name-ne` / `data-name-en` / `data-trend` + empty state
- Inline filter script only — no Customs auto-fetch; MT/cylinder figures unchanged

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1230`


## 2026-09-12 · PAGE_VER 1045 — chart layout · RDNA palette · donut hole

### Design / layout
- Mobile (≤720px): all `.viz-pie-row` stack — donut centered above, legend full-width below
- Donut size: mobile ≥152px (RDNA ≥156px); desktop ~168–172px side-by-side
- `.viz-donut-hole` solid white disc + dark ink (`clamp` for long crore figures) — no transparent center over blue ring
- RDNA sectors: Social `#f59e0b` · Productive `#dc2626` · Infra `#1d4ed8` · Cross `#0f766e` (stops/figures unchanged)
- Legend swatches ≥10px; cash/ops/named donut hole contrast

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-1045`

## 2026-09-12 · PAGE_VER 0945 — RDNA/LPG separate pages · live header clock

### Pages / IA
- New `supply.html`: full LPG customs board moved off homepage
- `damage.html#rdna`: homepage `.rdna-board` (KPIs, donuts, HH, bullets) above summary table
- Homepage: compact snaps → `supply.html` / `damage.html#rdna`; catalog chips to real pages
- Sitewide nav: `nav_rdna` → `damage.html#rdna`, `nav_supply` → `supply.html` on all pages
- Hash redirects: `#cat-supply`/`#supply`/`#lpg` → supply; `#cat-infographics`/`#infographics` → `damage.html#rdna`

### Header / overview
- Brand stack: live Asia/Kathmandu `brand-now` + `brand_date` last board update (all pages)
- Overview KPI title above `.kpi-row` (`overview_h` / `overview_sub`)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0945`

## 2026-09-12 · PAGE_VER 0930 — brand-date last update · remove sit-chip

- Removed muted sit-chip (`safety-reloc`) from overview + secondary pages; latest NDRRMA board time now in `.brand-date` (NE/EN). `PAGE_VER` → `2026-09-12-0930`.

## 2026-09-12 · PAGE_VER 0915 — color grading · semantic chart tones

### Design / layout
- Death pie + district column chart + progress bars now share the crimson family (no more forest-green death bars)
- `.vchart-bar` default is slate; tones inherit via `.vchart-dead` / `data-tone` / panel context
- Rescue/air teal · injured saffron · missing slate · cash/days teal→forest · relief forest
- Cat nav / menu chips: teal global active, inactive white/gray
- `--viz-dead-1..5` crimson ramp for death donut + legend (percentages unchanged)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0915`

## 2026-09-12 · PAGE_VER 0900 — portal CTA cards + KPI type scale

### Design / layout
- Portal rescue + donate CTA cards: compact stack (kicker → headline → URL → pay logos → yellow CTA); `justify-content: flex-start`; drop equal-height void (`height:100%` / `space-between`)
- Solid saffron `#facc15` CTA chrome; pay logos single compact row; mobile bottom padding clears FAB / browser chrome
- Unified number type scale via `--fs-kpi` / `--fs-kpi-2` / `--fs-kpi-meta` (hero / secondary / meta); tabular-nums + weight 800
- Touch targets ≥44px on CTAs/chips; light hero/menu rhythm tighten (CSS only)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0900`

## 2026-09-12 · PAGE_VER 0830 — LPG customs import day-compare

### Content
- Homepage `#cat-supply` / `#supply`: LPG import KPI cards (BS 2083/05/25 vs 05/26), entry-point compare bars, Dhangadhi zero-entry note
- Source: Department of Customs, Ministry of Finance — not merged into NDRRMA fuel stock or cash/PMDRF KPIs
- Catalog chip + optional nav chip «एलपीजी आयात»; i18n NE+EN
- Archived source graphics under `img/today-2026-09-12-lpg-*` (not live board embeds)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-12-0830`

## 2026-09-11 · PAGE_VER 2145 — RDNA infographics (NPC–NDRRMA)

### Content
- Homepage `#cat-infographics` / `#infographics`: RDNA KPI tiles, sector donuts (effects + recovery), impacted HH strip, labeled qualitative bullets
- `damage.html#rdna`: full summary table (4 sectors + sub-rows + total), HH strip, source line
- Figures as printed from RDNA summary table; not merged into NDRRMA casualty KPIs or cash/PMDRF channels
- Catalog chip + nav chip «इन्फोग्राफिक / RDNA»; i18n NE+EN
- Archived slides under `img/today-2026-09-11-rdna-*.jpg` (not live board graphics)

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-2145`

## 2026-09-11 · PAGE_VER 1915 — light civic polish · safety strip relocated

### Chrome
- Removed crimson `.safety-banner` from sticky menu stack on all pages (header → chips)
- Relocated `data-i18n-html="safety"` wording unchanged:
  - `index.html`: muted `.sit-chip.safety-reloc` at top of `#overview`
  - secondary pages: muted sit-chip under `.brand-date` (not a full-width alert)
- `@media (prefers-color-scheme: dark)` neutralized — body/paper/card stay light (no charcoal)
- Light civic polish: soft paper, white cards, hairline borders, calm chip/nav shadows; helpline useful not screaming
- KPI figures / cash channels / MoF mega-total stacking: untouched

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-1915`


## 2026-09-11 · PAGE_VER 1900 — Phase 2 names + secondary landmarks

Content freeze: no reader-visible text, figures, labels, caveats, sources, or i18n string bodies changed. DIFF vs `/workspace/rasuwa-ui-audit/before/` = CLEAN.

### names.html
- Name-card / `.ns-hit` status accents via `--sem-miss` / `--sem-relief` / `--sem-rescue` / `--sem-inj` / `--sem-dead` (badge text unchanged)
- Tables (`.treat-wrap`): sticky thead, zebra rows, horizontal scroll on mobile; search/filter behaviour untouched
- Shared `.ui-search` look for header / body / overlay / fam search inputs
- Empty-state polish on existing `.ns-empty` / `.fam-empty` hooks only (no invented copy)
- Skip-to-content + `<main id="main">`; focus/touch targets on names controls

### Secondary pages (donate, map, notices, contact, gov, response, photos, damage, about)
- Skip-to-content + `<main id="main" class="page-main">` landmarks
- Nav `is-current`: fixed erroneous about highlight on `response.html` (nav-menu.js still marks the real page)
- `.sec-head` polish using existing headings only
- Footer `href` escapes: confirmed clean in HTML footers (i18n.js JS-string escapes left as-is)
- Overflow / shared tokens only

### Version
- `PAGE_VER` / `?v=` / `latest.json` / `sw.js` → `2026-09-11-1900`

### Deferred
- Duplicate-board accordion (needs confirmed 1:1 duplicates)
- Do not invent loading/empty i18n keys beyond existing hooks
- family.json content untouched

## 2026-09-11 · PAGE_VER 1815 — Phase 1 UI system

Content freeze: no reader-visible text, figures, labels, caveats, sources, or i18n string bodies changed (footer `href` escape bug fixed only).

### Design tokens (`bulletin.css` `:root`)
- Brand: `--crimson` kept
- Semantic: `--sem-dead`, `--sem-miss`, `--sem-inj`, `--sem-rescue`, `--sem-relief`, `--sem-aid`, `--sem-roads`, `--sem-gov`, `--sem-human` (+ soft pairs)
- Spacing: `--space-0`…`--space-6` → 4 / 8 / 12 / 16 / 24 / 32 / 48
- Radius / border / shadow: `--radius*`, `--border`, `--shadow*` , `--shadow-focus`, `--touch` (44px)
- Type scale: `--fs-h1`…`--fs-footnote` with Devanagari-friendly `--lh-*`
- Dark: `@media (prefers-color-scheme: dark)` variable overlays (light remains default)

### Components / chrome
- Skip-to-content (CSS + `aria-label`; `#main` landmark on index)
- Sticky category sub-nav (`.home-cat-nav`) + scroll-spy active state (`#cat-*`)
- Main nav: mid-width horizontal scroll; `is-current` / `aria-current` via `nav-menu.js`
- Helpline strip touch target / sticky feel on mobile
- Focus-visible + 44px touch targets
- `.caveat` / `.info-note` / `.nig-note` muted callouts (CSS icon only)
- Hero: primary KPI band, equal-height cards, label-left / number-right tabular nums
- CTA pair equal-width cards; payment logo chips aligned
- Chart legend / bar polish (numbers & labels untouched)
- Overflow guard 320–400px

### Markup fixes
- `index.html` footer: unescaped `href="tel:+9779851175115"` / `mailto:neerajbhusal@gmail.com` (was broken `href=\"…\"`)
- `i18n.js` `foot_contact` NE+EN: `\"` is correct JS string escaping → left unchanged (runtime HTML is valid)

### Deferred
- Duplicate-board accordion (needs confirmed 1:1 duplicates)
- Phase 2 names.html deep search/table work (light token consistency only if landed)
- Skip/main landmark rollout to every secondary page
