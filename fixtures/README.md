# Sample labels

These are designed label images, not photographs of commercial bottles. The printed text is known, so matcher tests stay stable.

Images live in `fixtures/images/` and are copied to `public/samples/` so the app can serve them. Regenerate with:

```bash
npm run generate-labels
```

## Bundled cases

| id | What it proves |
|---|---|
| `spirits_clean` | Full match on a bourbon label |
| `brand_casing` | `STONE'S THROW` vs `Stone's Throw` is a match |
| `abv_mismatch` | Wrong alcohol content fails |
| `warning_title_case` | `Government Warning:` fails |
| `warning_missing` | No warning on the image fails |
| `wine_clean` | Wine match, including `750 mL` vs `75 cl` |
| `beer_abv_optional` | Beer ABV on the form but not the label needs review |
| `unreadable` | Glare needs review, not a fake fail |

## Adding a real TTB COLA later

Rejected applications are not in the [Public COLA Registry](https://ttbonline.gov/colasonline/publicSearchColasBasic.do). Approved records are presumed matches.

To add one:

1. Search the registry and open the COLA detail page.
2. Save the printable label image(s) into `public/samples/`.
3. Copy brand, class/type, alcohol, and net contents from the COLA into a new row in `fixtures/cases.json`.
4. For fail cases, keep the real image and change one application field.

Do not scrape `ttbonline.gov` in bulk. It is a Treasury system.
