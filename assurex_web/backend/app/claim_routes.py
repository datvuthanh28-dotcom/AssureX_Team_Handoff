from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Claim, ClaimAnalysis, ClaimEvidence
from app.services.decision_service import analyze_claim_data


router = APIRouter(prefix="/api/claims", tags=["Claims"])


class ClaimCreate(BaseModel):
    claim_id: str = Field(min_length=1, max_length=50)
    input_data: dict[str, Any]


def serialize_analysis(analysis: ClaimAnalysis | None):
    if analysis is None:
        return None

    return {
        "ml_prediction": analysis.ml_prediction,
        "ml_confidence": analysis.ml_confidence,
        "probabilities": analysis.probabilities,
        "final_decision": analysis.final_decision,
        "rule_triggered": analysis.rule_triggered,
        "decision_reasons": analysis.decision_reasons,
        "model_version": analysis.model_version,
        "analyzed_at": analysis.analyzed_at,
    }


def serialize_claim(claim: Claim, analysis: ClaimAnalysis | None = None):
    return {
        "id": claim.id,
        "claim_id": claim.claim_id,
        "input_data": claim.input_data,
        "predicted_class": claim.predicted_class,
        "confidence": claim.confidence,
        "model_name": claim.model_name,
        "final_decision": (
            analysis.final_decision if analysis else None
        ),
        "decision_reasons": (
            analysis.decision_reasons if analysis else []
        ),
        "latest_analysis": serialize_analysis(analysis),
        "created_at": claim.created_at,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_claim(payload: ClaimCreate, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(Claim).where(Claim.claim_id == payload.claim_id)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Claim already exists")

    claim = Claim(claim_id=payload.claim_id, input_data=payload.input_data)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return serialize_claim(claim)


@router.get("")
def list_claims(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    decision: str | None = None,
    customer_id: str | None = None,
    product_id: str | None = None,
    db: Session = Depends(get_db),
):
    claims = db.scalars(
        select(Claim).order_by(Claim.created_at.desc())
    ).all()
    results = []

    for claim in claims:
        analysis = db.scalar(
            select(ClaimAnalysis).where(
                ClaimAnalysis.claim_id == claim.claim_id
            )
        )
        data = claim.input_data or {}
        final_decision = analysis.final_decision if analysis else "Pending"

        if status_filter and final_decision.lower() != status_filter.lower():
            continue
        if decision and final_decision.lower() != decision.lower():
            continue
        if customer_id and str(
            data.get("CustomerID", data.get("customer_id", ""))
        ) != customer_id:
            continue
        if product_id and str(
            data.get("ProductID", data.get("product_id", ""))
        ) != product_id:
            continue
        if search:
            searchable = f"{claim.claim_id} {data}".casefold()
            if search.casefold() not in searchable:
                continue

        results.append(serialize_claim(claim, analysis))

    start = (page - 1) * page_size
    return results[start : start + page_size]


@router.get("/{claim_id}")
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.scalar(select(Claim).where(Claim.claim_id == claim_id))
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    analysis = db.scalar(
        select(ClaimAnalysis).where(ClaimAnalysis.claim_id == claim_id)
    )
    evidence = db.scalars(
        select(ClaimEvidence)
        .where(ClaimEvidence.claim_id == claim_id)
        .order_by(ClaimEvidence.created_at.asc())
    ).all()
    result = serialize_claim(claim, analysis)
    result["evidence"] = [
        {
            "id": item.id,
            "document_type": item.document_type,
            "document_name": item.document_name,
            "document_status": item.document_status,
            "ocr_status": item.ocr_status,
            "ocr_confidence": item.ocr_confidence,
            "created_at": item.created_at,
        }
        for item in evidence
    ]
    return result


@router.delete("/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.scalar(select(Claim).where(Claim.claim_id == claim_id))
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    db.query(ClaimEvidence).filter_by(claim_id=claim_id).delete()
    db.query(ClaimAnalysis).filter_by(claim_id=claim_id).delete()
    db.delete(claim)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{claim_id}/analyze")
def analyze_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.scalar(select(Claim).where(Claim.claim_id == claim_id))
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    try:
        result = analyze_claim_data(claim.input_data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    analysis = db.scalar(
        select(ClaimAnalysis).where(ClaimAnalysis.claim_id == claim_id)
    )
    if analysis is None:
        analysis = ClaimAnalysis(claim_id=claim_id)
        db.add(analysis)

    analysis.ml_prediction = result["ml_prediction"]
    analysis.ml_confidence = result["ml_confidence"]
    analysis.probabilities = result["probabilities"]
    analysis.final_decision = result["final_decision"]
    analysis.rule_triggered = result["rule_triggered"]
    analysis.decision_reasons = result["decision_reasons"]
    analysis.model_version = result["model_version"]
    analysis.analyzed_at = datetime.utcnow()

    claim.predicted_class = result["ml_prediction"]
    claim.confidence = result["ml_confidence"]
    claim.model_name = result["model_version"]
    db.commit()
    db.refresh(analysis)

    return {
        "claim_id": claim_id,
        **serialize_analysis(analysis),
    }


@router.post("/predict")
def legacy_predict(payload: ClaimCreate, db: Session = Depends(get_db)):
    create_claim(payload, db)
    return analyze_claim(payload.claim_id, db)