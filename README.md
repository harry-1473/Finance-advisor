# Aman Copilot

AI financial copilot for SMEs and relationship banks. One set of books produces **SME advice** and **bank credit insight** — forecasts, repayment capacity, and a financing simulator. It is **decision support**, not an automated approve/reject engine.

Golden Grain Trading (Yangon wholesale) is loaded as the demo: three months of MMK sales and expenses, a 30M loan request, and category-level costs so the advisor can tell productive marketing spend from inventory that is growing faster than sales.

## What it does

- **Expense and revenue forecast** for the next three months from a linear trend on the last three (labeled as a historical-pattern forecast, not a high-accuracy ML model).
- **Cash-flow projection**: opening cash + expected revenue − expenses − repayment.
- **Risk indicator**: healthy / moderate / high risk, with a shrinking-buffer watch.
- **Loan simulator**: 10–50M MMK, rate and term, comparison table, suggested range.
- **Survival vs growth financing**: whether the SME needs money to stay open or can borrow to expand.
- **Advisor**: grounded answers for both the owner and the credit analyst. Uses OpenAI if `OPENAI_API_KEY` is set; otherwise a rules engine on the same analysis.

## Run locally

Requires Python 3.12+ and Node 22+.

```bash
# API — http://127.0.0.1:8766
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8766

# UI — http://127.0.0.1:43123
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the FastAPI process.

Optional: `export OPENAI_API_KEY=...` for LLM-written advisor replies.

## Tests

```bash
cd backend && source .venv/bin/activate && PYTHONPATH=. pytest -q
```

## Stack

React + TypeScript + Tailwind on the dashboard. FastAPI, pandas/numpy, scikit-learn `LinearRegression`, and Pydantic on the API.
