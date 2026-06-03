import os
import json
import logging
import uuid
from datetime import datetime
from io import BytesIO
from typing import Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import pymongo
from pymongo import MongoClient
import cloudinary
import cloudinary.uploader

# Load environment variables
load_dotenv()

logger = logging.getLogger("astro_app.db")

# Configurations
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "astro_freelance")
MAX_MONGODB_SIZE_BYTES = int(os.getenv("MAX_MONGODB_SIZE_BYTES", str(450 * 1024 * 1024)))

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
    secure=True
)

class AstroDataDocument(BaseModel):
    report_no: str
    customer_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    input_details: dict[str, Any]
    is_offloaded: bool = False
    offload_url: Optional[str] = None
    calculated_chart: Optional[dict[str, Any]] = None


def get_mongo_client() -> Optional[MongoClient]:
    """Helper to initialize client with a short timeout to handle failures gracefully."""
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        # Force a quick server selection check to see if database is reachable
        client.admin.command('ping')
        return client
    except Exception as exc:
        logger.warning(f"Failed to connect to MongoDB at {MONGODB_URI}: {exc}")
        return None


def get_collection_size(db: Any, collection_name: str) -> int:
    """Retrieve collection size in bytes, defaulting to 0 on failure or if collection doesn't exist."""
    try:
        stats = db.command("collStats", collection_name)
        return stats.get("size", 0)
    except Exception as exc:
        logger.debug(f"Could not retrieve collStats for {collection_name}: {exc}")
        return 0


def upload_to_cloudinary(payload_dict: dict[str, Any], report_no: str) -> Optional[str]:
    """Serialize payload and upload to Cloudinary raw folder. Return secure URL if successful."""
    # Check if Cloudinary credentials are set before attempting upload
    if not (os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET")):
        logger.warning("Cloudinary environment variables are missing. Skipping upload.")
        return None

    try:
        json_data = json.dumps(payload_dict, default=str)
        file_stream = BytesIO(json_data.encode("utf-8"))
        
        # Raw upload for JSON data
        upload_result = cloudinary.uploader.upload(
            file_stream,
            resource_type="raw",
            public_id=f"astro_reports/report_{report_no}_{uuid.uuid4().hex}.json"
        )
        return upload_result.get("secure_url")
    except Exception as exc:
        logger.error(f"Error uploading report payload to Cloudinary: {exc}")
        return None


def to_bson_compatible(data: Any) -> Any:
    """Recursively convert custom objects (like datetime.date, datetime.time, etc.) to standard BSON-serializable types."""
    if data is None:
        return None
    return json.loads(json.dumps(data, default=str))


def save_astro_data(
    report_no: str,
    customer_name: str,
    input_details: dict[str, Any],
    calculated_chart: dict[str, Any]
) -> Optional[str]:
    """
    Save the calculations and input data. If the MongoDB collection exceeds 450MB,
    offload the full calculation payload to Cloudinary and store the URL ref in MongoDB.
    
    If MongoDB is down, fails gracefully by logging a warning/error without raising exception.
    """
    try:
        client = get_mongo_client()
        if client is None:
            logger.warning("Database unavailable, calculation data will not be persisted.")
            return None

        db = client[MONGODB_DB_NAME]
        collection = db["reports"]

        # 1. Check size of collection
        col_size = get_collection_size(db, "reports")
        logger.info(f"Current reports collection size: {col_size} bytes (Threshold: {MAX_MONGODB_SIZE_BYTES} bytes)")

        should_offload = col_size >= MAX_MONGODB_SIZE_BYTES
        offload_url = None
        is_offloaded = False

        # Convert date, time, and custom objects inside inputs and chart to BSON-compatible values
        bson_input_details = to_bson_compatible(input_details)
        bson_calculated_chart = to_bson_compatible(calculated_chart)

        if should_offload:
            logger.info("MongoDB threshold exceeded. Attempting to offload data to Cloudinary...")
            payload = {
                "report_no": report_no,
                "customer_name": customer_name,
                "input_details": bson_input_details,
                "calculated_chart": bson_calculated_chart,
                "created_at": datetime.utcnow().isoformat()
            }
            offload_url = upload_to_cloudinary(payload, report_no)
            if offload_url:
                is_offloaded = True
                logger.info(f"Successfully offloaded report to Cloudinary: {offload_url}")
            else:
                logger.warning("Cloudinary upload failed. Falling back to local MongoDB storage.")

        # 2. Build the document model
        doc = AstroDataDocument(
            report_no=report_no,
            customer_name=customer_name,
            input_details=bson_input_details,
            is_offloaded=is_offloaded,
            offload_url=offload_url,
            calculated_chart=None if is_offloaded else bson_calculated_chart
        )

        # 3. Save to MongoDB
        insert_result = collection.insert_one(doc.dict())
        inserted_id = str(insert_result.inserted_id)
        logger.info(f"Successfully saved report data. ID: {inserted_id}, Offloaded: {is_offloaded}")
        return inserted_id

    except Exception as exc:
        logger.error(f"Graceful error inside save_astro_data: {exc}")
        return None

