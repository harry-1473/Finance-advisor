from app.engine import analyze, annuity_payment, demo_business, linear_forecast


def test_demo_health_and_growth_purpose():
    result = analyze(demo_business())
    assert 50 <= result["health"]["score"] <= 96
    assert result["loan"]["purpose"]["type"] in {"growth", "working_capital", "survival"}
    assert len(result["forecast"]["expenses"]) == 3
    assert result["forecast"]["expenses"][0] > 13_000_000
    assert result["meta"]["disclaimer"]


def test_linear_forecast_rising_series():
    preds = linear_forecast([10, 11, 13], 3)
    assert preds[0] > 13
    assert preds[2] > preds[0]


def test_annuity_payment():
    p = annuity_payment(30_000_000, 12, 12)
    assert 2_500_000 < p < 3_000_000
