from app.ml.decision_service import apply_business_rules
from app.ml.model_service import predict_claim


def analyze_claim_data(input_data: dict) -> dict:
    prediction = predict_claim(input_data)
    decision = apply_business_rules(
        input_data,
        prediction["predicted_class"],
        prediction["confidence"],
    )
    reasons = decision["decision_reasons"]

    return {
        "ml_prediction": prediction["predicted_class"],
        "ml_confidence": prediction["confidence"],
        "probabilities": prediction["probabilities"],
        "final_decision": decision["final_decision"],
        "rule_triggered": bool(reasons),
        "decision_reasons": reasons,
        "model_version": prediction["model_name"],
    }