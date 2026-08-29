from __future__ import annotations

import numpy as np
from sklearn.linear_model import LinearRegression

from .schemas import BusinessInput, ExpenseBreakdown, MonthlyRecord


CURRENCY = "MMK"
HORIZON = 3
MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def next_month_labels(last_month: str, n: int = HORIZON) -> list[str]:
    try:
        idx = MONTH_NAMES.index(last_month)
    except ValueError:
        idx = 7  # August fallback
    return [MONTH_NAMES[(idx + i + 1) % 12] for i in range(n)]


def _series(values: list[float]) -> np.ndarray:
    return np.array(values, dtype=float)


def linear_forecast(values: list[float], steps: int = HORIZON) -> list[float]:
    """Trend forecast from a short history. Labeled as pattern-based, not ML accuracy."""
    y = _series(values)
    n = len(y)
    if n == 0:
        return [0.0] * steps
    if n == 1:
        return [float(y[0])] * steps
    x = np.arange(n).reshape(-1, 1)
    model = LinearRegression().fit(x, y)
    future = np.arange(n, n + steps).reshape(-1, 1)
    pred = model.predict(future)
    # Keep forecasts non-negative for money series
    return [float(max(0.0, p)) for p in pred]


def growth_rate(values: list[float]) -> float | None:
    y = _series(values)
    if len(y) < 2 or y[0] == 0:
        return None
    return float((y[-1] - y[0]) / abs(y[0]))


def latest_mom(values: list[float]) -> float | None:
    y = _series(values)
    if len(y) < 2 or y[-2] == 0:
        return None
    return float((y[-1] - y[-2]) / abs(y[-2]))


def volatility(values: list[float]) -> float:
    y = _series(values)
    if len(y) < 2:
        return 0.0
    mean = float(np.mean(y))
    if mean == 0:
        return 0.0
    return float(np.std(y, ddof=1) / abs(mean))


def annuity_payment(principal: float, annual_rate_pct: float, term_months: int) -> float:
    if principal <= 0 or term_months <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    if r == 0:
        return principal / term_months
    return principal * (r * (1 + r) ** term_months) / ((1 + r) ** term_months - 1)


def status_from_score(score: float) -> str:
    if score >= 75:
        return "healthy"
    if score >= 55:
        return "moderate"
    return "high_risk"


def traffic(kind: str) -> str:
    mapping = {
        "growing": "green",
        "stable": "amber",
        "declining": "red",
        "healthy": "green",
        "moderate": "amber",
        "high_risk": "red",
        "increasing": "amber",
        "controlled": "green",
        "strong": "green",
        "weak": "red",
        "low": "green",
        "high": "red",
    }
    return mapping.get(kind, "amber")


def revenue_trend_label(sales: list[float]) -> str:
    g = growth_rate(sales)
    if g is None:
        return "stable"
    if g > 0.04:
        return "growing"
    if g < -0.04:
        return "declining"
    return "stable"


def profitability_label(margins: list[float]) -> str:
    last = margins[-1] if margins else 0
    if last >= 0.18:
        return "healthy"
    if last >= 0.08:
        return "moderate"
    return "high_risk"


def expense_growth_label(sales: list[float], expenses: list[float]) -> str:
    sg = latest_mom(sales) or 0
    eg = latest_mom(expenses) or 0
    if eg > sg + 0.03:
        return "increasing"
    return "controlled"


def financing_purpose(sales: list[float], expenses: list[float], cash: float, profit: float) -> dict:
    last_sales, last_exp = sales[-1], expenses[-1]
    coverage = (cash + profit) / last_exp if last_exp else 1
    growing = (growth_rate(sales) or 0) > 0.05
    profitable = profit > 0 and (profit / last_sales if last_sales else 0) >= 0.12
    tight = coverage < 0.6 or cash < last_exp * 0.25
    if tight and not profitable:
        return {
            "type": "survival",
            "label": "Survival financing",
            "color": "red",
            "summary": "Cash and recent profit are thin relative to operating expenses. Financing would primarily cover a gap, not expansion.",
        }
    if growing and profitable and not tight:
        return {
            "type": "growth",
            "label": "Growth financing",
            "color": "green",
            "summary": "The business is profitable with rising sales. Financing can support expansion without being required to stay open.",
        }
    return {
        "type": "working_capital",
        "label": "Working-capital financing",
        "color": "amber",
        "summary": "Operations are viable, but the cash buffer is limited. Financing would mainly smooth working capital rather than fund a clear expansion plan.",
    }


def category_insights(months: list[MonthlyRecord]) -> list[dict]:
    if len(months) < 2:
        return []
    sales = [m.sales for m in months]
    sales_g = latest_mom(sales) or 0
    insights = []
    fields = ["inventory", "marketing", "payroll", "operating"]
    for field in fields:
        series = [float(getattr(m.breakdown, field)) for m in months]
        if series[-1] <= 0 and series[0] <= 0:
            continue
        g = latest_mom(series) or 0
        if field == "marketing" and g > 0.1 and sales_g >= g - 0.05:
            insights.append(
                {
                    "severity": "opportunity",
                    "category": field,
                    "title": "Marketing appears to be contributing to growth",
                    "detail": (
                        f"Marketing spend rose {g:.0%} last month while sales rose {sales_g:.0%}. "
                        "This expense looks productive — optimize it, do not cut it first."
                    ),
                }
            )
        elif g > sales_g + 0.08 and series[-1] > 0:
            insights.append(
                {
                    "severity": "alert",
                    "category": field,
                    "title": f"{field.capitalize()} grew faster than sales",
                    "detail": (
                        f"{field.capitalize()} increased {g:.0%} while sales increased {sales_g:.0%}. "
                        "Review purchasing, waste, or unused capacity before taking on more debt."
                    ),
                }
            )
        elif g < -0.05:
            insights.append(
                {
                    "severity": "info",
                    "category": field,
                    "title": f"{field.capitalize()} declined",
                    "detail": f"{field.capitalize()} fell {abs(g):.0%} last month. Confirm this is efficiency, not under-investment that will hurt sales.",
                }
            )
    return insights


def health_score(
    *,
    margin: float,
    sales_growth: float,
    expense_vs_sales: float,
    cash_months: float,
    vol: float,
    repayment_ratio: float,
) -> int:
    score = 50
    score += min(20, max(-20, (margin - 0.15) * 100))
    score += min(15, max(-15, sales_growth * 80))
    score += min(10, max(-15, -expense_vs_sales * 60))
    score += min(15, max(-15, (cash_months - 0.4) * 25))
    score -= min(12, vol * 40)
    if repayment_ratio > 0:
        # repayment / projected monthly cash before debt
        if repayment_ratio < 0.35:
            score += 8
        elif repayment_ratio > 0.7:
            score -= 18
        elif repayment_ratio > 0.5:
            score -= 8
    return int(max(12, min(96, round(score))))


def project_cash_flow(
    current_cash: float,
    revenues: list[float],
    expenses: list[float],
    monthly_repayment: float,
    existing_debt: float,
    loan_inflow: float = 0.0,
) -> list[dict]:
    cash = current_cash + loan_inflow
    rows = []
    for i, (rev, exp) in enumerate(zip(revenues, expenses)):
        debt = monthly_repayment + existing_debt
        opening = cash
        remaining = opening + rev - exp - debt
        buffer = remaining
        if remaining >= exp * 0.35 and remaining >= debt * 1.5:
            risk = "healthy"
        elif remaining > 0:
            risk = "moderate"
        else:
            risk = "high_risk"
        rows.append(
            {
                "month_index": i,
                "opening_cash": round(opening, 0),
                "expected_revenue": round(rev, 0),
                "expected_expenses": round(exp, 0),
                "loan_repayment": round(debt, 0),
                "projected_cash": round(remaining, 0),
                "buffer": round(buffer, 0),
                "risk": risk,
            }
        )
        cash = remaining
    return rows


def overall_cash_status(rows: list[dict]) -> str:
    if any(r["projected_cash"] <= 0 for r in rows):
        return "high_risk"
    # shrinking buffer
    buffers = [r["projected_cash"] for r in rows]
    if len(buffers) >= 2 and buffers[-1] < buffers[0] * 0.55:
        return "moderate"
    if all(r["risk"] == "healthy" for r in rows):
        return "healthy"
    return "moderate"


def recommended_range(
    business: BusinessInput,
    sales_f: list[float],
    exp_f: list[float],
    rate: float,
    term: int,
) -> dict:
    """Find loan amounts where post-repayment cash stays in a healthy/moderate band."""
    candidates = [10, 15, 20, 25, 30, 35, 40, 45, 50]
    table = []
    good = []
    for amt_m in candidates:
        principal = amt_m * 1_000_000
        pay = annuity_payment(principal, rate, term)
        rows = project_cash_flow(
            business.current_cash,
            sales_f,
            exp_f,
            pay,
            business.loan.existing_monthly_debt,
            loan_inflow=0.0,
        )
        min_cash = min(r["projected_cash"] for r in rows)
        status = overall_cash_status(rows)
        avg_after = float(np.mean([r["projected_cash"] for r in rows]))
        table.append(
            {
                "amount": principal,
                "repayment": round(pay, 0),
                "cash_after": round(avg_after, 0),
                "min_cash": round(min_cash, 0),
                "risk": status,
            }
        )
        if status in ("healthy", "moderate") and min_cash > 1_500_000:
            if status == "healthy" or (status == "moderate" and min_cash > 3_000_000):
                good.append(principal)
    if good:
        return {
            "min": min(good),
            "max": max(good),
            "table": table,
            "narrative": f"Recommended financing range: {min(good)/1e6:.0f}–{max(good)/1e6:.0f}M {CURRENCY}",
        }
    # fallback: smallest that doesn't go negative
    viable = [t for t in table if t["min_cash"] > 0]
    if viable:
        return {
            "min": viable[0]["amount"],
            "max": viable[-1]["amount"],
            "table": table,
            "narrative": f"Keep financing at or below {viable[-1]['amount']/1e6:.0f}M {CURRENCY} to avoid a negative cash projection.",
        }
    return {
        "min": 0,
        "max": 0,
        "table": table,
        "narrative": "Projected cash flow cannot support additional repayment at these amounts without cost or revenue changes.",
    }


def product_recommendation(products: list) -> dict | None:
    if not products:
        return None
    ranked = sorted(products, key=lambda p: p.margin_pct, reverse=True)
    top = ranked[0]
    sales_g = growth_rate(top.monthly_sales) or 0
    return {
        "name": top.name,
        "margin_pct": top.margin_pct,
        "sales_growth": sales_g,
        "message": (
            f"Highest-margin line is {top.name} ({top.margin_pct:.0%} margin). "
            "If you borrow for growth, allocate working capital toward this product first."
        ),
    }


def analyze(business: BusinessInput) -> dict:
    months = business.months
    sales = [m.sales for m in months]
    expenses = [m.expenses for m in months]
    profits = [m.sales - m.expenses for m in months]
    margins = [(p / s if s else 0) for p, s in zip(profits, sales)]

    labels = next_month_labels(months[-1].month)
    sales_f = linear_forecast(sales)
    exp_f = linear_forecast(expenses)
    profit_f = [s - e for s, e in zip(sales_f, exp_f)]

    pay = annuity_payment(
        business.loan.amount, business.loan.annual_rate_pct, business.loan.term_months
    )
    # Conservative view: can operations service the debt from cash flow?
    # Loan proceeds are not mixed into the 3-month operating projection.
    cash_rows = project_cash_flow(
        business.current_cash,
        sales_f,
        exp_f,
        pay,
        business.loan.existing_monthly_debt,
        loan_inflow=0.0,
    )
    cash_status = overall_cash_status(cash_rows)

    sales_g = growth_rate(sales) or 0
    exp_g = growth_rate(expenses) or 0
    mom_s = latest_mom(sales) or 0
    mom_e = latest_mom(expenses) or 0
    vol = volatility(profits)
    avg_cf_before_debt = float(np.mean(profit_f))
    repay_ratio = pay / avg_cf_before_debt if avg_cf_before_debt > 0 else 9.0
    cash_months = business.current_cash / expenses[-1] if expenses[-1] else 0

    score = health_score(
        margin=margins[-1],
        sales_growth=sales_g,
        expense_vs_sales=mom_e - mom_s,
        cash_months=cash_months,
        vol=vol,
        repayment_ratio=repay_ratio,
    )

    rev_lbl = revenue_trend_label(sales)
    profit_lbl = profitability_label(margins)
    exp_lbl = expense_growth_label(sales, expenses)
    vol_lbl = "low" if vol < 0.12 else "moderate" if vol < 0.28 else "high"

    if repay_ratio < 0.4 and cash_status != "high_risk":
        repay_lbl = "strong"
    elif repay_ratio < 0.65 and cash_status != "high_risk":
        repay_lbl = "moderate"
    else:
        repay_lbl = "weak"

    purpose = financing_purpose(sales, expenses, business.current_cash, profits[-1])
    cats = category_insights(months)
    rec = recommended_range(
        business, sales_f, exp_f, business.loan.annual_rate_pct, business.loan.term_months
    )
    product = product_recommendation(business.products)

    expense_faster = mom_e > mom_s + 0.02
    alerts = []
    if expense_faster:
        alerts.append(
            {
                "type": "alert",
                "title": "Expense growth is faster than revenue growth",
                "body": (
                    f"Expenses rose {mom_e:.0%} last month while sales rose {mom_s:.0%}. "
                    "That compresses margin, shrinks the repayment buffer, and is the main watch-item for both the owner and the bank."
                ),
            }
        )
    if cash_status == "moderate":
        alerts.append(
            {
                "type": "watch",
                "title": "Cash-flow buffer is shrinking",
                "body": "Projected cash stays positive for the next three months, but expense growth is reducing the repayment buffer.",
            }
        )
    if cash_status == "high_risk":
        alerts.append(
            {
                "type": "alert",
                "title": "Projected cash may not cover expenses or repayment",
                "body": "At least one of the next three months shows insufficient cash after operating costs and debt service.",
            }
        )
    if product and (growth_rate(sales) or 0) > 0.08:
        alerts.append(
            {
                "type": "opportunity",
                "title": "Revenue has increased consistently",
                "body": product["message"],
            }
        )

    bank_insight = _bank_narrative(
        score, rev_lbl, profit_lbl, expense_faster, cash_status, repay_lbl, purpose, business
    )
    sme_insight = _sme_narrative(
        expense_faster, cash_status, pay, purpose, cats, product
    )

    avg_monthly_cf = float(np.mean([r["projected_cash"] for r in cash_rows]))
    buffer = avg_monthly_cf - 0  # remaining cash is the buffer after all outflows
    # cash flow buffer vs repayment: last month operating surplus minus repayment
    avg_surplus = float(np.mean(profit_f)) - pay - business.loan.existing_monthly_debt

    indicators = [
        {"key": "revenue_trend", "label": "Revenue trend", "result": rev_lbl, "tone": traffic(rev_lbl)},
        {"key": "profitability", "label": "Profitability", "result": profit_lbl, "tone": traffic(profit_lbl)},
        {"key": "cash_flow", "label": "Cash flow", "result": cash_status, "tone": traffic(cash_status)},
        {"key": "expense_growth", "label": "Expense growth", "result": exp_lbl, "tone": traffic(exp_lbl)},
        {
            "key": "repayment_capacity",
            "label": "Repayment capacity",
            "result": repay_lbl,
            "tone": traffic(repay_lbl),
        },
        {
            "key": "volatility",
            "label": "Cash-flow volatility",
            "result": vol_lbl,
            "tone": traffic(vol_lbl),
        },
    ]

    latest = months[-1]
    return {
        "meta": {
            "name": business.name,
            "sector": business.sector,
            "location": business.location,
            "currency": business.currency,
            "forecast_method": "Linear trend on the last 3 months. This is a historical-pattern forecast, not a high-accuracy ML model.",
            "disclaimer": "Decision support only — not an automated credit approval or rejection.",
        },
        "latest": {
            "month": latest.month,
            "revenue": latest.sales,
            "expenses": latest.expenses,
            "profit": latest.sales - latest.expenses,
            "margin": margins[-1],
            "cash": business.current_cash,
        },
        "history": [
            {
                "month": m.month,
                "sales": m.sales,
                "expenses": m.expenses,
                "profit": m.sales - m.expenses,
                "margin": (m.sales - m.expenses) / m.sales if m.sales else 0,
                "breakdown": m.breakdown.model_dump(),
            }
            for m in months
        ],
        "health": {
            "score": score,
            "label": status_from_score(score),
        },
        "indicators": indicators,
        "forecast": {
            "months": labels,
            "revenue": [round(x, 0) for x in sales_f],
            "expenses": [round(x, 0) for x in exp_f],
            "profit": [round(x, 0) for x in profit_f],
            "expense_note": (
                f"Expected expenses: {exp_f[0]/1e6:.1f}M, {exp_f[1]/1e6:.1f}M, {exp_f[2]/1e6:.1f}M {CURRENCY}"
                if len(exp_f) >= 3
                else ""
            ),
        },
        "cash_flow": {
            "status": cash_status,
            "rows": [{**r, "month": labels[r["month_index"]]} for r in cash_rows],
            "explanation": _cash_explanation(cash_status),
        },
        "loan": {
            "requested": business.loan.amount,
            "annual_rate_pct": business.loan.annual_rate_pct,
            "term_months": business.loan.term_months,
            "monthly_payment": round(pay, 0),
            "existing_monthly_debt": business.loan.existing_monthly_debt,
            "projected_cash_avg": round(avg_monthly_cf, 0),
            "cash_flow_buffer": round(avg_surplus, 0),
            "repayment_capacity": repay_lbl,
            "risk": cash_status,
            "purpose": purpose,
            "range": rec,
            "why": _loan_why(repay_lbl, expense_faster, cash_status, pay, avg_surplus),
        },
        "alerts": alerts,
        "category_insights": cats,
        "product": product,
        "bank_insight": bank_insight,
        "sme_insight": sme_insight,
        "need_financing": _need_financing(purpose, cash_months, profits[-1]),
        "growth_rates": {
            "sales_3m": sales_g,
            "expenses_3m": exp_g,
            "sales_mom": mom_s,
            "expenses_mom": mom_e,
        },
    }


def _cash_explanation(status: str) -> str:
    if status == "healthy":
        return "Cash flow comfortably covers expenses and expected repayment."
    if status == "moderate":
        return "Projected cash flow remains positive for the next three months, but expense growth is reducing your repayment buffer."
    return "Projected cash flow may become insufficient for expenses or repayment."


def _loan_why(repay_lbl: str, expense_faster: bool, cash_status: str, pay: float, surplus: float) -> str:
    base = (
        f"The business currently generates sufficient projected cash flow to cover the estimated repayment of {pay/1e6:.1f}M {CURRENCY}/month."
        if repay_lbl in ("strong", "moderate")
        else f"Projected operating surplus may not comfortably cover the {pay/1e6:.1f}M {CURRENCY} monthly repayment."
    )
    if expense_faster:
        base += " However, expenses are increasing faster than revenue, so maintaining the current profit margin is important."
    if cash_status == "high_risk":
        base += " At this loan size, the cash-flow buffer is too thin."
    elif surplus > 0:
        base += f" Average cash-flow buffer after repayment is about {surplus/1e6:.1f}M {CURRENCY} per month."
    return base


def _bank_narrative(score, rev, profit, expense_faster, cash_status, repay, purpose, business) -> str:
    parts = [
        f"{business.name} scores {score}/100 on the shared health model.",
        f"Revenue is {rev} and profitability is {profit}.",
        f"Repayment capacity at the requested {business.loan.amount/1e6:.0f}M {CURRENCY} is {repay}.",
    ]
    if expense_faster:
        parts.append("Expense growth should be monitored because it is reducing the cash-flow buffer.")
    parts.append(f"Financing character: {purpose['label']} — {purpose['summary']}")
    parts.append("This is credit decision support, not an automated approve/reject.")
    return " ".join(parts)


def _sme_narrative(expense_faster, cash_status, pay, purpose, cats, product) -> str:
    bits = []
    if expense_faster:
        bits.append(
            "Your business is profitable, but expenses are increasing faster than sales. Reducing unproductive costs could improve your cash buffer."
        )
    else:
        bits.append("Sales and costs are moving in a more balanced way. Protect that ratio while you grow.")
    bits.append(f"Projected repayment is {pay/1e6:.1f}M {CURRENCY}/month. {purpose['summary']}")
    alerts = [c["detail"] for c in cats if c["severity"] == "alert"]
    opps = [c["detail"] for c in cats if c["severity"] == "opportunity"]
    if alerts:
        bits.append(alerts[0])
    if opps:
        bits.append(opps[0])
    if product:
        bits.append(product["message"])
    return " ".join(bits)


def _need_financing(purpose: dict, cash_months: float, profit: float) -> dict:
    if purpose["type"] == "survival":
        return {
            "needed": True,
            "urgency": "high",
            "answer": "Yes — current cash is thin relative to costs. Treat this as gap coverage, not expansion, until margins stabilize.",
        }
    if purpose["type"] == "growth":
        return {
            "needed": False,
            "urgency": "optional",
            "answer": "You do not need a loan to stay open. Borrowing is optional and should be tied to a growth use of funds (inventory of high-margin products, equipment, or reachable demand).",
        }
    return {
        "needed": cash_months < 0.5,
        "urgency": "medium",
        "answer": "A modest working-capital facility could smooth timing gaps, but size it to cash-flow capacity rather than the maximum you can obtain.",
    }


def demo_business() -> BusinessInput:
    return BusinessInput(
        name="Golden Grain Trading",
        sector="Wholesale rice and cooking oil",
        location="Yangon",
        currency="MMK",
        current_cash=8_000_000,
        months=[
            MonthlyRecord(
                month="June",
                sales=15_000_000,
                expenses=10_000_000,
                breakdown=ExpenseBreakdown(
                    inventory=6_000_000, payroll=2_500_000, marketing=800_000, operating=700_000
                ),
            ),
            MonthlyRecord(
                month="July",
                sales=17_000_000,
                expenses=11_000_000,
                breakdown=ExpenseBreakdown(
                    inventory=6_200_000, payroll=2_500_000, marketing=1_200_000, operating=1_100_000
                ),
            ),
            MonthlyRecord(
                month="August",
                sales=19_000_000,
                expenses=13_000_000,
                breakdown=ExpenseBreakdown(
                    inventory=7_800_000, payroll=2_600_000, marketing=1_400_000, operating=1_200_000
                ),
            ),
        ],
        products=[
            {
                "name": "Premium rice (Product A)",
                "monthly_sales": [6_200_000, 7_400_000, 8_600_000],
                "margin_pct": 0.28,
            },
            {
                "name": "Cooking oil",
                "monthly_sales": [5_500_000, 5_800_000, 6_000_000],
                "margin_pct": 0.12,
            },
            {
                "name": "Pulse packs",
                "monthly_sales": [3_300_000, 3_800_000, 4_400_000],
                "margin_pct": 0.18,
            },
        ],
        loan={
            "amount": 30_000_000,
            "annual_rate_pct": 12.0,
            "term_months": 12,
            "existing_monthly_debt": 0,
        },
    )
