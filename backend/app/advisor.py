from __future__ import annotations

import os
from typing import Literal

from .engine import analyze
from .schemas import BusinessInput


def _rule_based_answer(question: str, analysis: dict, role: Literal["sme", "bank"]) -> str:
    q = question.lower()
    loan = analysis["loan"]
    latest = analysis["latest"]
    need = analysis["need_financing"]
    purpose = loan["purpose"]
    cats = analysis["category_insights"]
    alerts = analysis["alerts"]
    cash_rows = analysis["cash_flow"]["rows"]
    tight_month = None
    for row in cash_rows:
        if row["risk"] in ("moderate", "high_risk"):
            tight_month = row["month"]
            if row["risk"] == "high_risk":
                break

    if any(k in q for k in ("need a loan", "do i need", "necessary", "actually need")):
        return need["answer"]

    if any(k in q for k in ("how much", "afford", "borrow", "range", "suggested")):
        rng = loan["range"]
        return (
            f"Recommended financing range: {rng['min']/1e6:.0f}–{rng['max']/1e6:.0f}M MMK. "
            f"{rng['narrative']} The requested {loan['requested']/1e6:.0f}M has {loan['repayment_capacity']} repayment capacity "
            f"with a {loan['monthly_payment']/1e6:.1f}M monthly installment. "
            "Stay inside this range to keep a healthier projected cash-flow buffer — this is not an approval."
        )

    if any(k in q for k in ("repay", "cover the loan", "payment", "installment")):
        actions = []
        for c in cats:
            if c["severity"] == "alert":
                actions.append(c["detail"])
        if not actions:
            actions.append("Protect the current profit margin and keep inventory turning.")
        return (
            f"Your projected repayment is {loan['monthly_payment']/1e6:.1f}M MMK/month. "
            f"{loan['why']} Practical ways to cover it without starving growth: "
            + " ".join(actions[:2])
            + " Prioritize highest-margin products rather than cutting every cost."
        )

    if any(k in q for k in ("tight", "when will", "cash flow become", "run out")):
        if tight_month:
            return (
                f"Cash starts to look tight in {tight_month}. "
                f"{analysis['cash_flow']['explanation']} "
                "Bring inventory purchases in line with sales before that month, not after."
            )
        return "None of the next three months turn negative, but watch the declining buffer — tightness would show up after the forecast window if expense growth continues."

    if any(k in q for k in ("reduce", "cut", "expense", "cost")):
        lines = []
        for c in cats:
            if c["severity"] == "alert":
                lines.append(c["detail"])
            if c["severity"] == "opportunity":
                lines.append(c["detail"])
        if not lines:
            lines.append("Do not cut expenses blindly. Cut unproductive cost; keep spend that is lifting sales.")
        return "Optimize expenses for sustainable growth — do not just minimize them. " + " ".join(lines)

    if any(k in q for k in ("profit", "margin", "improve", "health", "grow")):
        product = analysis.get("product")
        extra = product["message"] if product else ""
        return (
            f"Latest profit is {latest['profit']/1e6:.1f}M MMK ({latest['margin']:.0%} margin). "
            f"{analysis['sme_insight']} {extra}"
        )

    if any(k in q for k in ("risk", "healthy", "credit", "bank")) and role == "bank":
        return analysis["bank_insight"]

    if role == "bank":
        return (
            analysis["bank_insight"]
            + f" Financing character is {purpose['label']}. Suggested range {loan['range']['min']/1e6:.0f}–{loan['range']['max']/1e6:.0f}M MMK."
        )

    # default SME briefing
    alert_txt = alerts[0]["body"] if alerts else analysis["sme_insight"]
    return (
        f"{analysis['sme_insight']} {alert_txt} "
        f"Health score {analysis['health']['score']}/100. "
        f"{purpose['label']}: {purpose['summary']}"
    )


def advise(question: str, business: BusinessInput, role: Literal["sme", "bank"] = "sme") -> dict:
    analysis = analyze(business)
    answer = _rule_based_answer(question, analysis, role)
    source = "rules"

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            import json
            import urllib.request

            payload = {
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "temperature": 0.3,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are Aman, an AI finance copilot for Myanmar SMEs and their banks. "
                            "Use only the provided analysis. Be specific with MMK figures. "
                            "Never approve or reject a loan. Distinguish survival vs growth financing. "
                            "Do not tell the SME to blindly cut costs — optimize for sustainable growth. "
                            "Write 120-180 words."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "role": role,
                                "question": question,
                                "analysis": {
                                    "health": analysis["health"],
                                    "latest": analysis["latest"],
                                    "forecast": analysis["forecast"],
                                    "cash_flow": analysis["cash_flow"],
                                    "loan": {
                                        k: analysis["loan"][k]
                                        for k in (
                                            "requested",
                                            "monthly_payment",
                                            "repayment_capacity",
                                            "risk",
                                            "purpose",
                                            "range",
                                            "why",
                                            "cash_flow_buffer",
                                        )
                                    },
                                    "alerts": analysis["alerts"],
                                    "category_insights": analysis["category_insights"],
                                    "need_financing": analysis["need_financing"],
                                    "sme_insight": analysis["sme_insight"],
                                    "bank_insight": analysis["bank_insight"],
                                },
                            }
                        ),
                    },
                ],
            }
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode(),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode())
            answer = data["choices"][0]["message"]["content"]
            source = "llm"
        except Exception:
            source = "rules"

    return {"answer": answer, "source": source, "analysis_score": analysis["health"]["score"]}
