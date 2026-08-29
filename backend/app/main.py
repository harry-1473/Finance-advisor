from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .advisor import advise
from .engine import analyze, demo_business
from .schemas import BusinessInput, ChatRequest, SimulateRequest

app = FastAPI(
    title="Aman Copilot",
    description="AI financial copilot for SMEs and banks — decision support, not automated approval.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "aman"}


@app.get("/api/demo")
def demo():
    business = demo_business()
    return {"business": business.model_dump(), "analysis": analyze(business)}


@app.post("/api/analyze")
def analyze_endpoint(business: BusinessInput):
    return analyze(business)


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    business = req.business.model_copy(deep=True)
    if req.amount is not None:
        business.loan.amount = req.amount
    if req.annual_rate_pct is not None:
        business.loan.annual_rate_pct = req.annual_rate_pct
    if req.term_months is not None:
        business.loan.term_months = req.term_months
    return analyze(business)


@app.post("/api/advisor")
def advisor(req: ChatRequest):
    return advise(req.question, req.business, req.role)


@app.get("/")
def root():
    return {"name": "Aman Copilot", "docs": "/docs"}
