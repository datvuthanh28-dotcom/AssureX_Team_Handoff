from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    claim_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    input_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    predicted_class: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    model_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )



class CustomerClaim(Base):
    __tablename__ = "customer_claims"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    claim_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    customer_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    product_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    serial_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    purchase_date: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    claim_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    fault_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="Under Review",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )



class CustomerClaimDecision(Base):
    __tablename__ = "customer_claim_decisions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    claim_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    ml_prediction: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    ml_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    probabilities: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    final_decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    requires_admin_review: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    decision_reasons: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    raw_input: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    model_features: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    derived_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    reviewer_decision: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    reviewer_comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
