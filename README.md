# MagicBI Explorer

A small full-stack analytics explorer for the supplied `orders.csv` exercise. The backend serves deterministic aggregation results from normalized source rows; the frontend provides a polished, responsive charting experience and an audit panel explaining every data decision.

## Run locally

```bash
npm install
npm run dev
```

Run these commands from the project root, `D:\AmiteshCodes\app`. Open the URL printed by Next.js (usually http://localhost:3000). The `backend` and `frontend` folders contain the earlier prototype; the current UI lives in `app/`.

## Dashboard interactions

- Switch the measure and grouping, compare bars or donut shares, and export the displayed groups as CSV.
- Open **Inspect row-level audit** to see all 12 source rows in a modal. Search orders, filter changed rows, switch between original and cleaned values, and inspect the normalization policies.
- Escape, the close button, Done inspecting, and a click outside the dialog all dismiss it. Keyboard focus returns to the opening button.
- Loading skeletons, abortable requests, retryable errors, and reduced-motion preferences are supported.

## Browser verification

```powershell
$env:NEXT_DIST_DIR='.next-verification'
npm run build
npx playwright test
```

Install the test browser once with `npx playwright install chromium`. Verification uses port 3107 and a separate build directory so an existing development server does not need to be stopped.

## Data policy

Regions are normalized (`west`/`W` → `West`, etc.). Revenue is parsed into integer cents. Blank revenue remains unknown and is excluded from revenue totals. The duplicate `1001` row is retained in the audit trail but counted once. Negative revenue is preserved as a refund. `01/12/2024` is interpreted as January 12, 2024.

Known net revenue is $9,045.75 across 11 unique orders; the source contains one blank revenue and one duplicate row.
