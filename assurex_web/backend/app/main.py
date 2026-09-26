from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.claim_routes import router as claims_router
from app.database import Base, engine
from app.customer_routes import router as customer_router
from app.dashboard_routes import router as dashboard_router
from app.warranty_routes import router as warranty_router


app = FastAPI(
    title="AssureX Claim Engine API",
    version="1.0.0",
    description="Backend API for AssureX warranty claim classification.",
)


@app.on_event("startup")
def initialize_database():
    Base.metadata.create_all(bind=engine)


app.include_router(claims_router)
app.include_router(customer_router)
app.include_router(dashboard_router)


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


@app.get("/api/health")
def api_health():
    return {
        "status": "ok",
        "service": "AssureX Claim Engine",
    }

app.include_router(warranty_router)
