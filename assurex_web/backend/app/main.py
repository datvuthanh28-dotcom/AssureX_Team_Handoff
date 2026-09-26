from app.warranty_routes import router as warranty_router
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.ml.model_service import predict_claim
from app.models import Claim
from app.customer_routes import router as customer_router


app = FastAPI(
    title="AssureX Claim Engine API",
    version="1.0.0",
    description="Backend API for AssureX warranty claim classification.",
)


app.include_router(customer_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClaimPredictRequest(BaseModel):
    claim_id: str
    input_data: dict[str, Any]


@app.get("/")
def root():
    return {
        "app": "AssureX Claim Engine API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }


@app.post("/api/claims/predict")
def predict(
    request: ClaimPredictRequest,
    db: Session = Depends(get_db),
):
    existing_claim = db.scalar(
        select(Claim).where(
            Claim.claim_id == request.claim_id
        )
    )

    if existing_claim:
        raise HTTPException(
            status_code=409,
            detail=f"ClaimID {request.claim_id} already exists.",
        )

    try:
        result = predict_claim(request.input_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    claim = Claim(
        claim_id=request.claim_id,
        input_data=request.input_data,
        predicted_class=result["predicted_class"],
        confidence=result["confidence"],
        model_name=result["model_name"],
    )

    db.add(claim)
    db.commit()
    db.refresh(claim)

    return {
        "id": claim.id,
        "claim_id": claim.claim_id,
        "predicted_class": result["predicted_class"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "model_name": result["model_name"],
        "created_at": claim.created_at,
    }


@app.get("/api/claims")
def get_claims(
    db: Session = Depends(get_db),
):
    claims = db.scalars(
        select(Claim).order_by(
            Claim.created_at.desc()
        )
    ).all()

    return [
        {
            "id": claim.id,
            "claim_id": claim.claim_id,
            "predicted_class": claim.predicted_class,
            "confidence": claim.confidence,
            "model_name": claim.model_name,
            "created_at": claim.created_at,
        }
        for claim in claims
    ]


@app.get("/api/claims/{claim_id}")
def get_claim_detail(
    claim_id: str,
    db: Session = Depends(get_db),
):
    claim = db.scalar(
        select(Claim).where(
            Claim.claim_id == claim_id
        )
    )

    if claim is None:
        raise HTTPException(
            status_code=404,
            detail=f"ClaimID {claim_id} not found.",
        )

    return {
        "id": claim.id,
        "claim_id": claim.claim_id,
        "input_data": claim.input_data,
        "predicted_class": claim.predicted_class,
        "confidence": claim.confidence,
        "model_name": claim.model_name,
        "created_at": claim.created_at,
    }

app.include_router(warranty_router)
