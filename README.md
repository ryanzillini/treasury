# Label Check

A standalone prototype for TTB agents: upload one alcohol label image, enter the application fields, and see whether they match. The app reads the label once with a vision model, then compares fields in code. It does not store uploads and does not connect to COLAs Online.

## Setup

Requires Node.js 22+.

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose a sample, then press **Check label**.

### Environment

Set `VISION_PROVIDER` to `openai` (default), `google`, or `anthropic`, and provide the matching key:

| Provider | Env var | Model |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `gpt-5-nano` |
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.5-flash` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |

Only one key is required for the provider you choose. Production on Azure would swap this factory for Azure OpenAI without changing the matcher.

If no key is set, bundled samples still run the matcher against recorded label text so you can try the UI. Your own photos need a vision key.

### Deploy

Live demo: [https://ttb-label-check-beta.vercel.app](https://ttb-label-check-beta.vercel.app)

```bash
npx vercel --prod
```

Set the same env vars in the Vercel project. The verify route is capped at 15 seconds.

## How to review

Open [https://ttb-label-check-beta.vercel.app](https://ttb-label-check-beta.vercel.app). Use **Load a sample**, then press **Check label**. Each sample shows what it should return.

Confirm the footer says `openai (gpt-5-nano)`, not `fixture (recorded)`. That means the photo was read, not the recorded text. Results should come back in about five seconds.

The government warning is not a field on the application form. It is checked against [27 CFR 16.21](https://www.law.cornell.edu/cfr/text/27/16.21).

## Approach

Two steps, always:

1. **Extract** — one vision call returns structured fields and the warning text.
2. **Match** — TypeScript compares those fields to the application and to the statutory warning.

A second model call would add latency and make results harder to explain. Sarah Chen’s team abandoned a scanner that took 30–40 seconds; this path is built to stay near five seconds. Matching rules are unit-tested with no API calls, so we can tell a matcher bug from a reading error.

## Stakeholder decisions

| Person | What they asked | What we did |
|---|---|---|
| Sarah Chen | Results in about 5 seconds; UI her 73-year-old mother could use | One vision call, elapsed time on screen, large type, one button |
| Sarah / Janet | Batch of 200–300 applications | Out of scope for this prototype. Documented below |
| Marcus Williams | Standalone PoC, no COLA integration, don’t store sensitive files, government networks block random ML endpoints | No database, no COLA client, images stay in memory, provider is swappable so production can use Azure OpenAI |
| Dave Morrison | `STONE'S THROW` vs `Stone's Throw` needs judgment, not a false fail | Fuzzy name matching and a **Needs review** status |
| Jenny Park | Warning must be exact, including all-caps `GOVERNMENT WARNING:`; bad photos happen | Warning is checked against [27 CFR 16.21](https://www.law.cornell.edu/cfr/text/27/16.21); unreadable images need review instead of a fake pass |

The original assignment notes are in [docs/assignment.md](docs/assignment.md).

## Matching rules (short)

- **Brand / bottler / origin:** ignore case and punctuation. Very close names match. Similar-but-uncertain names need review.
- **Class / type:** same, and “Bourbon” matches “Kentucky Straight Bourbon Whiskey”.
- **Alcohol:** compare the percent (and proof when both are present). Wine and spirits must show it. Beer may omit it — that needs review, not a fail.
- **Net contents:** compare milliliters (`750 mL` = `75 cl` = `0.75 L`).
- **Government warning:** label vs statute, not vs the application. Wording must match. `Government Warning:` in title case fails. Bold type is required by regulation but this prototype cannot see type weight.

Overall: any fail → **Does not match**. Else any needs-review → **Needs review**. Else **Match**. Unreadable image → **Needs review** with no field-by-field fails.

## Sample labels

The **Load a sample** menu is the intended review path. Cases:

| Sample | Expected |
|---|---|
| Bourbon — everything matches | Match |
| Brand name casing only (Stone's Throw) | Match |
| Wrong alcohol content | Does not match |
| Warning in title case | Does not match |
| Warning missing from the image | Does not match |
| Wine — everything matches | Match |
| Beer — ABV on the form, not on the label | Needs review |
| Glare — cannot read the label | Needs review |

See [fixtures/README.md](fixtures/README.md) for how they were made.

## Assumptions and limits

- This is a proof of concept, not a legal determination and not COLAs Online.
- The warning may be on a back or neck label. If it is not in the uploaded image, the app says so.
- There is no warning field on the application form. Jenny’s check is label vs statute.
- Bold type on `GOVERNMENT WARNING` is not checked.
- Beer alcohol content is treated as optional on the label.
- Batch upload is not built. The same extract-then-match function could run over a folder later; a working core mattered more.
- Public COLA records are approved only, so fail cases in this demo are constructed.

## Production note

Keep the matcher. Point the vision factory at Azure OpenAI (FedRAMP) on the existing Azure network. Do not call public model endpoints from a locked-down government network. Still do not store label images unless records retention requires it.
