# Budhi Gandaki flood update

The homepage section and `budhi-gandaki.html` both render from `data/budhi-gandaki.json`. A manual update is an edit to that file. There is no automatic fetch.

The homepage shows a category grid. Contacts with `"home": true` appear there (1234, 102, 100, District Police, and DAO Gorkha). The rescue lines live in `rescue`. The homepage timeline shows the latest four `timeline` entries.

## New river reading

Edit `aarughat.latest` (`level_m`, `trend`, `status`, `time_ne`, `time_en`, `at`). Append the same reading to `aarughat.history`. If Devghat, Kali Khola or Bhorle changed, edit that object in `downstream`. Then set `updated_at`, `updated_ne` and `updated_en` to the time you published.

`trend` is `RISING`, `STEADY` or `FALLING`. `status` is `DANGER` or `BELOW`.

## New timeline entry

Add an object to the end of `timeline`:

```json
{"time_ne": "१०:००", "time_en": "10:00 AM", "ne": "छोटो वाक्य।", "en": "One short sentence.", "by_ne": "स्रोत", "by_en": "Source"}
```

Add `"href"` only when there is a link. Keep each sentence short.

Photos belong in `photos` and must be real flood photographs, not screenshots. Put optimized WebP files in `img/budhi/`.
