# MagicBI Explorer

MagicBI Explorer is a small, full-stack analytics dashboard that turns a deliberately messy set of order records into traceable revenue and order-count summaries. It demonstrates a key analytics principle: every number in a chart should be explainable back to a source row and a documented cleaning decision.

The current application is built with Next.js 14, React 18, and TypeScript. It has no database or external service dependency; the demonstration dataset is deterministic and is processed on each API request.

## Quick start

Requirements: Node.js 18.17 or later and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Next.js, normally [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run build
npm start
```

## What the dashboard does

- Groups the cleaned orders by **region** or **category**.
- Switches between **known net revenue** and **unique order count**.
- Shows the same result as a bar chart, a donut chart when values permit it, and a detail table.
- Exports the currently displayed aggregate groups as CSV.
- Provides a searchable row-level audit that compares original and normalized values.
- Handles loading, failed requests, retrying, keyboard dialog dismissal, focus restoration, and reduced-motion preferences.

## Architecture and data flow

```text
Browser UI (app/page.tsx)
        |
        | GET /api/aggregate?measure=<revenue|orders>&groupBy=<region|category>
        v
Next.js route handler (app/api/aggregate/route.ts)
        |
        v
Aggregation service (lib/aggregate.ts)
        |
        v
Cleaning + audit metadata (lib/clean.ts)
        |
        v
In-memory demo order records
```

The UI is intentionally a thin client: it owns presentation, interaction state, CSV download, and error/loading states. Cleaning rules and calculations live on the server-side path so the chart, table, KPI cards, and audit panel all receive one consistent result.

## Project structure

```text
app/
  layout.tsx                    Root HTML layout and page metadata
  page.tsx                      Client dashboard, charts, export, and audit dialog
  globals.css                   Responsive styles, animations, and accessibility styles
  api/aggregate/route.ts        Validates query parameters and returns aggregate JSON

lib/
  clean.ts                      Types, field normalization, de-duplication, and row flags
  aggregate.ts                  Demo records, grouping logic, totals, and policy text

data/orders.csv                 Source-data reference copy for the exercise
tests/dashboard.spec.ts         Playwright browser coverage for main user flows

backend/                        Earlier standalone Node prototype (not used by npm run dev)
frontend/                       Earlier static-browser prototype (not used by npm run dev)
```

`npm run dev`, `npm run build`, and `npm start` operate on the Next.js application at the repository root. The files in `backend/` and `frontend/` are retained as historical prototypes; they duplicate some logic and are not part of the current runtime.

## Core concepts

### Cleaned rows versus audit rows

`cleanOrders` transforms every input row into a `CleanOrder` containing normalized fields, the original record, its one-based source-row number, and decision flags. It returns two views:

- `audit`: all source rows, including records excluded from metrics.
- `rows`: only rows eligible for metrics. At present, exact duplicate order IDs are excluded here.

This split means removing a duplicate from a KPI never hides it from a user reviewing the source data.

### Money is represented as cents

Revenue strings such as `$1,240.00`, `860`, and `2,015.50` are parsed into integer cents. Aggregating integers avoids floating-point rounding errors. The UI converts cents back to USD only when displaying or exporting values.

### Measures and grouping

The API accepts two query parameters:

| Parameter | Allowed values | Meaning |
| --- | --- | --- |
| `measure` | `revenue`, `orders` | Sum known net revenue in cents, or count eligible orders. |
| `groupBy` | `region`, `category` | Field used to create aggregate groups. |

An invalid value returns HTTP 400. A successful response includes ordered group data, the selected measure/grouping, dataset statistics, the complete audit trail, and the human-readable cleaning decisions used by the UI.

## Data policy

The project is explicit about how it treats imperfect data:

| Situation | Rule | Effect on metrics |
| --- | --- | --- |
| Region spelling/case | Normalize known aliases, for example `west` and `W` to `West`. | Included in the canonical region. |
| Date formats | Normalize ISO-like, US numeric, and long month-name dates to `YYYY-MM-DD`. | Preserved for audit; dates are not currently used to group data. |
| Blank revenue | Treat as unknown (`null`). | Counts as an order but contributes nothing to revenue totals. |
| Duplicate order ID | Keep the first record and flag later occurrences. | Later occurrence is excluded from metrics but remains in the audit. |
| Negative revenue | Preserve as a refund. | Reduces net revenue. |

`01/12/2024` is interpreted as January 12, 2024 (US month/day/year). With the included demonstration data, the result is **11 unique orders**, **1 unknown revenue value**, and **$9,045.75 known net revenue** after refunds.

> Note: `data/orders.csv` is the human-readable source-data reference. The current Next.js demo fixture is declared in `lib/aggregate.ts`; keep those records synchronized if the sample data changes. A production evolution would replace that fixture with CSV parsing or a database repository while preserving the `cleanOrders` and `aggregate` boundary.

## API example

```http
GET /api/aggregate?measure=revenue&groupBy=region
```

The response shape is conceptually:

```ts
{
  measure: 'revenue',
  groupBy: 'region',
  currency: 'USD',
  data: [{ label, value, orders, missingRevenue }], // value is cents for revenue
  total,
  stats: { totalIn, uniqueOrders, duplicatesRemoved, missingRevenue, knownRevenue },
  audit: CleanOrder[],
  decisions: string[]
}
```

## Verification

The Playwright suite checks the audit dialog, normalization views, filters, chart selectors, totals, CSV export, retry behavior, responsive layout, and reduced-motion behavior.

```powershell
$env:NEXT_DIST_DIR='.next-verification'
npm run build
npx playwright install chromium   # first time only
npx playwright test
```

The test configuration uses port `3107` and a separate build folder, so it can run without replacing a development build.

## Extending the application

When adding a source field or cleaning policy, update the `RawOrder`/`CleanOrder` types and `cleanOrders` first, then expose the needed grouping or metric from `aggregate`. Finally, update the UI and its Playwright coverage. Keeping business rules in `lib/` prevents display-specific calculations from drifting apart across the dashboard.
