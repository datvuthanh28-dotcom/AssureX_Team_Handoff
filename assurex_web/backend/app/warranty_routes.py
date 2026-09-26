import hashlib
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)

from app.ocr.ocr_service import (
    extract_warranty_image,
)


router = APIRouter(
    prefix="/api/customer/warranty",
    tags=["Customer Warranty"],
)


UPLOAD_DIR = Path(
    "app/uploads/warranty_cards"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_FILE_SIZE = (
    8 * 1024 * 1024
)


@router.post("/extract")
async def extract_warranty_card(
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only JPG, PNG and WEBP "
                "images are supported."
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Maximum file size is 8 MB.",
        )

    sha256 = hashlib.sha256(
        content
    ).hexdigest()

    document_id = (
        "WAR-"
        + uuid.uuid4().hex[:12].upper()
    )

    extension = ALLOWED_TYPES[
        file.content_type
    ]

    path = (
        UPLOAD_DIR
        / f"{document_id}{extension}"
    )

    path.write_bytes(content)

    try:
        result = extract_warranty_image(
            path
        )
    except Exception as exc:
        path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=500,
            detail=f"OCR failed: {exc}",
        ) from exc

    extracted = result[
        "extracted_data"
    ]

    extracted_count = sum(
        value not in (
            None,
            "",
        )
        for value in extracted.values()
    )

    return {
        "document_id": document_id,
        "filename": file.filename,
        "sha256": sha256,
        "ocr_confidence":
            result["ocr_confidence"],
        "extracted_fields":
            extracted_count,
        "extracted_data":
            extracted,
        "text_preview":
            result["raw_text"][:500],
    }
