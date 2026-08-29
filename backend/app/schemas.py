from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExpenseBreakdown(BaseModel):
    inventory: float = 0
    payroll: float = 0
    marketing: float = 0
    operating: float = 0


class ProductLine(BaseModel):
    name: str
    monthly_sales: list[float]
    margin_pct: float


class MonthlyRecord(BaseModel):
    month: str
    sales: float
    expenses: float
    breakdown: ExpenseBreakdown = Field(default_factory=ExpenseBreakdown)

    @property
    def profit(self) -> float:
        return self.sales - self.expenses


class LoanRequest(BaseModel):
    amount: float = 30_000_000
    annual_rate_pct: float = 12.0
    term_months: int = 12
    existing_monthly_debt: float = 0


class BusinessInput(BaseModel):
    name: str = "Golden Grain Trading"
    sector: str = "Wholesale food distribution"
    location: str = "Yangon"
    currency: str = "MMK"
    current_cash: float = 8_000_000
    months: list[MonthlyRecord]
    products: list[ProductLine] = Field(default_factory=list)
    loan: LoanRequest = Field(default_factory=LoanRequest)


class ChatRequest(BaseModel):
    question: str
    business: BusinessInput
    role: Literal["sme", "bank"] = "sme"


class SimulateRequest(BaseModel):
    business: BusinessInput
    amount: float | None = None
    annual_rate_pct: float | None = None
    term_months: int | None = None
