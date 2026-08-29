from fastapi.testclient import TestClient
from app.main import app
from app.engine import demo_business

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "aman"}


def test_demo_endpoint():
    response = client.get("/api/demo")
    assert response.status_code == 200
    data = response.json()
    assert "business" in data
    assert "analysis" in data
    assert data["business"]["name"] == "Golden Grain Trading"
    assert "health" in data["analysis"]
    assert "score" in data["analysis"]["health"]


def test_analyze_endpoint():
    business = demo_business()
    response = client.post("/api/analyze", json=business.model_dump())
    assert response.status_code == 200
    data = response.json()
    assert data["health"]["score"] > 0
    assert "indicators" in data
    assert "cash_flow" in data


def test_simulate_endpoint():
    business = demo_business()
    payload = {
        "business": business.model_dump(),
        "amount": 25000000,
        "annual_rate_pct": 10.0,
        "term_months": 12,
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["loan"]["requested"] == 25000000


def test_advisor_endpoint_rules_fallback():
    business = demo_business()
    # Testing SME role
    payload_sme = {
        "question": "How much can I afford to borrow?",
        "business": business.model_dump(),
        "role": "sme",
    }
    res_sme = client.post("/api/advisor", json=payload_sme)
    assert res_sme.status_code == 200
    assert "answer" in res_sme.json()

    # Testing Bank role
    payload_bank = {
        "question": "Is this SME financially healthy?",
        "business": business.model_dump(),
        "role": "bank",
    }
    res_bank = client.post("/api/advisor", json=payload_bank)
    assert res_bank.status_code == 200
    assert "answer" in res_bank.json()
