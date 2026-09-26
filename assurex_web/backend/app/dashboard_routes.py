from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Claim,
    ClaimAnalysis,
    CustomerClaim,
    CustomerClaimDecision,
)


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    claim_count = len(db.scalars(select(Claim)).all())
    customer_claim_count = len(db.scalars(select(CustomerClaim)).all())
    analyses = db.scalars(select(ClaimAnalysis)).all()
    customer_decisions = db.scalars(
        select(CustomerClaimDecision)
    ).all()
    decisions = [
        analysis.final_decision for analysis in analyses
    ] + [
        decision.final_decision for decision in customer_decisions
    ]
    total = claim_count + customer_claim_count

    return {
        "total_claims": total,
        "valid_claims": decisions.count("Valid Claim"),
        "invalid_claims": decisions.count("Invalid Claim"),
        "manual_review": decisions.count("Manual Review"),
        "pending_claims": max(total - len(decisions), 0),
    }