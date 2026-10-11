# Budhi Gandaki flood update

The homepage section and `budhi-gandaki.html` both render from `data/budhi-gandaki.json`. A manual update is an edit to that file. There is no automatic fetch.

The homepage shows a category grid. Contacts with `"home": true` appear there (1234, 102, 100, District Police, and DAO Gorkha). Helicopter and security-force lines live in `rescue`. Counted rescues live in `rescue_update` and are shown next to `missing`, which stays a separate number. The homepage timeline shows the latest four `timeline` entries.

## New counted rescue

Add an object to `rescue_update`. The page adds the `count` values for “Rescued so far” and groups them by agency. Do not add that count to `missing.count`.

```json
{"time_ne": "१०:०७", "time_en": "10:07 AM", "agency_ne": "नेपाली सेना", "agency_en": "Nepali Army", "count": 6, "place_ne": "जगत", "place_en": "Jagat", "method_ne": "हवाई उद्धार", "method_en": "Air rescue", "source_name_ne": "नेपाली सेना", "source_name_en": "Nepali Army", "source_url": "https://x.com/NepaliArmyHQ/status/2109137523494510845"}
```

Extra links for the same rescue go in `sources` as `{"name_ne": "", "name_en": "", "url": ""}` so the people are not counted twice. A count needs the Nepali Army, NDRRMA, the Gorkha DAO, or police. If those accounts have not said it, use at least two independent outlets that name their source and set `label_en` to `reported · sources`. One outlet with no official source does not go on the page. Hamro Patro is an aggregator, so cite the underlying outlet.

## New river reading

Edit `aarughat.latest` (`level_m`, `trend`, `status`, `time_ne`, `time_en`, `at`). Append the same reading to `aarughat.history`. If Devghat, Kali Khola or Bhorle changed, edit that object in `downstream`. Then set `updated_at`, `updated_ne` and `updated_en` to the time you published.

`trend` is `RISING`, `STEADY` or `FALLING`. `status` is `DANGER` or `BELOW`.

## New timeline entry

Add an object to the end of `timeline`:

```json
{"time_ne": "१०:००", "time_en": "10:00 AM", "ne": "छोटो वाक्य।", "en": "One short sentence.", "by_ne": "स्रोत", "by_en": "Source"}
```

Add `"href"` only when there is a link. Keep each sentence short.

Photos belong in `photos` and must be real flood photographs, not screenshots. Put optimized WebP files in `img/budhi/`. A helicopter video belongs in `media` with `"type": "video"`, plus `src`, `poster`, `caption_ne`, `caption_en` and `source_url`.
