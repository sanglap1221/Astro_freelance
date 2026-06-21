import os
import json
import logging
import uuid
from datetime import datetime, timezone
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

# ── Password Hashing ──

def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly."""
    # pyrefly: ignore [missing-import]
    import bcrypt
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    # pyrefly: ignore [missing-import]
    import bcrypt
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


# ── Database Connection ──

_mongo_client: Optional[MongoClient] = None

def get_mongo_client() -> Optional[MongoClient]:
    """Helper to initialize client with a short timeout to handle failures gracefully, caching the client for reuse."""
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        # Force a quick server selection check to see if database is reachable on first connect
        client.admin.command('ping')
        _mongo_client = client
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


# ── Default Admin Initialization ──

def init_default_admin():
    """
    Create a default admin user if NO admin exists in the database.
    Default credentials: admin / 123456
    Checks for role == 'admin' (not username), so deleting/renaming admins
    won't accidentally recreate this default.
    """
    try:
        client = get_mongo_client()
        if client is None:
            logger.warning("Database unavailable — cannot initialize default admin.")
            return

        db = client[MONGODB_DB_NAME]

        # Create unique index on username
        db.users.create_index("username", unique=True)

        # Create indexes on reports for fast queries
        db.reports.create_index([("created_at", pymongo.DESCENDING)])
        db.reports.create_index("name")
        db.reports.create_index("mobile")
        db.reports.create_index("dob")

        # Rename username 'admin' to 'Sagar Ghosh' if it exists in DB to migrate smoothly
        admin_user = db.users.find_one({"username": "admin"})
        if admin_user:
            db.users.update_one({"_id": admin_user["_id"]}, {"$set": {"username": "Sagar Ghosh"}})
            logger.info("Default admin migrated from 'admin' to 'Sagar Ghosh'")

        # Check if ANY admin exists, not just username 'admin'
        existing_admin = db.users.find_one({"role": "admin"})
        if existing_admin:
            logger.info(f"Admin user already exists: {existing_admin['username']}. Skipping default admin creation.")
            return

        # Create default admin — fixed username for single-owner system
        admin_doc = {
            "username": "Sagar Ghosh",
            "password_hash": hash_password("123456"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        }
        db.users.insert_one(admin_doc)
        logger.info("Default admin user created: Sagar Ghosh / 123456")

    except Exception as exc:
        logger.error(f"Error initializing default admin: {exc}")


# ── Cloudinary Upload ──

def upload_to_cloudinary(payload_dict: dict[str, Any], report_no: str) -> Optional[str]:
    """Serialize payload and upload to Cloudinary raw folder. Return secure URL if successful."""
    # Check if Cloudinary credentials are set before attempting upload
    if not (os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET")):
        logger.warning("Cloudinary environment variables are missing. Skipping upload.")
        return None

    try:
        from io import BytesIO
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


# ── Save Lightweight Customer Record ──

def save_customer_record(
    report_id: str,
    name: str,
    father_name: str,
    mobile: str,
    dob: str,
    tob: str,
    birth_place: str,
    created_by: str,
    latitude: float | None = None,
    longitude: float | None = None,
    timezone_str: str | None = None,
) -> Optional[str]:
    """
    Save only lightweight customer birth data to MongoDB.
    NO PDFs, NO chart images, NO large HTML.
    The chart is regenerated on demand when viewing old reports.
    """
    try:
        client = get_mongo_client()
        if client is None:
            logger.warning("Database unavailable, customer record will not be persisted.")
            return None

        db = client[MONGODB_DB_NAME]
        collection = db["reports"]

        doc = {
            "report_id": report_id,
            "name": name,
            "father_name": father_name or "",
            "mobile": mobile or "",
            "dob": str(dob),
            "tob": str(tob),
            "birth_place": birth_place,
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_str or "Asia/Kolkata",
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc),
        }

        insert_result = collection.insert_one(doc)
        inserted_id = str(insert_result.inserted_id)
        logger.info(f"Saved customer record: {name} — ID: {inserted_id}")
        return inserted_id

    except Exception as exc:
        logger.error(f"Error saving customer record: {exc}")
        return None


# ── Legacy save_astro_data (kept for backward compatibility, now delegates to save_customer_record) ──

def save_astro_data(
    report_no: str,
    customer_name: str,
    input_details: dict[str, Any],
    calculated_chart: dict[str, Any],
    created_by: str = "system",
) -> Optional[str]:
    """
    Legacy wrapper — now saves only lightweight customer record.
    The calculated_chart is NOT stored in the database.
    """
    return save_customer_record(
        report_id=report_no,
        name=customer_name,
        father_name=input_details.get("father_name", ""),
        mobile=input_details.get("mobile", ""),
        dob=str(input_details.get("dob", "")),
        tob=str(input_details.get("time", "")),
        birth_place=input_details.get("place", ""),
        created_by=created_by,
        latitude=input_details.get("latitude"),
        longitude=input_details.get("longitude"),
        timezone_str=input_details.get("timezone"),
    )


# ── Admin Query Functions ──

def get_dashboard_stats() -> dict[str, Any]:
    """Return dashboard statistics: total reports, today's reports."""
    try:
        client = get_mongo_client()
        if client is None:
            return {"total_reports": 0, "today_reports": 0}

        db = client[MONGODB_DB_NAME]
        total_reports = db.reports.count_documents({})

        # Today's reports (UTC date)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_reports = db.reports.count_documents({"created_at": {"$gte": today_start}})

        return {
            "total_reports": total_reports,
            "today_reports": today_reports,
        }
    except Exception as exc:
        logger.error(f"Error fetching dashboard stats: {exc}")
        return {"total_reports": 0, "today_reports": 0}


def get_all_reports(page: int = 1, limit: int = 20) -> dict[str, Any]:
    """Get paginated list of all reports, newest first."""
    try:
        client = get_mongo_client()
        if client is None:
            return {"reports": [], "total": 0, "page": page, "limit": limit}

        db = client[MONGODB_DB_NAME]
        total = db.reports.count_documents({})
        skip = (page - 1) * limit

        cursor = db.reports.find(
            {},
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("created_at", pymongo.DESCENDING).skip(skip).limit(limit)

        reports = []
        for doc in cursor:
            # Convert datetime to string for JSON serialization
            if "created_at" in doc and isinstance(doc["created_at"], datetime):
                doc["created_at"] = doc["created_at"].isoformat()
            reports.append(doc)

        return {
            "reports": reports,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
        }
    except Exception as exc:
        logger.error(f"Error fetching reports: {exc}")
        return {"reports": [], "total": 0, "page": page, "limit": limit}


def search_reports(
    name: str | None = None,
    mobile: str | None = None,
    date: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    """Search reports by name, mobile, or date."""
    try:
        client = get_mongo_client()
        if client is None:
            return {"reports": [], "total": 0, "page": page, "limit": limit}

        db = client[MONGODB_DB_NAME]
        query: dict[str, Any] = {}

        if name:
            query["name"] = {"$regex": name, "$options": "i"}
        if mobile:
            query["mobile"] = {"$regex": mobile}
        if date:
            query["dob"] = date

        total = db.reports.count_documents(query)
        skip = (page - 1) * limit

        cursor = db.reports.find(
            query,
            {"_id": 0}
        ).sort("created_at", pymongo.DESCENDING).skip(skip).limit(limit)

        reports = []
        for doc in cursor:
            if "created_at" in doc and isinstance(doc["created_at"], datetime):
                doc["created_at"] = doc["created_at"].isoformat()
            reports.append(doc)

        return {
            "reports": reports,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
        }
    except Exception as exc:
        logger.error(f"Error searching reports: {exc}")
        return {"reports": [], "total": 0, "page": page, "limit": limit}


def get_report_by_id(report_id: str) -> Optional[dict[str, Any]]:
    """Get a single report by report_id."""
    try:
        client = get_mongo_client()
        if client is None:
            return None

        db = client[MONGODB_DB_NAME]
        doc = db.reports.find_one({"report_id": report_id}, {"_id": 0})
        if doc and "created_at" in doc and isinstance(doc["created_at"], datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        return doc
    except Exception as exc:
        logger.error(f"Error fetching report {report_id}: {exc}")
        return None


def clear_all_reports() -> int:
    """Delete all customer reports from the reports collection."""
    try:
        client = get_mongo_client()
        if client is None:
            return 0

        db = client[MONGODB_DB_NAME]
        result = db.reports.delete_many({})
        logger.info(f"Cleared all customer reports history. Deleted count: {result.deleted_count}")
        return result.deleted_count
    except Exception as exc:
        logger.error(f"Error clearing reports history: {exc}")
        return 0


def delete_report_by_id(report_id: str) -> bool:
    """Delete a single report by its report_id. Return True if deleted, False otherwise."""
    try:
        client = get_mongo_client()
        if client is None:
            return False

        db = client[MONGODB_DB_NAME]
        result = db.reports.delete_one({"report_id": report_id})
        logger.info(f"Deleted report {report_id}. Deleted count: {result.deleted_count}")
        return result.deleted_count > 0
    except Exception as exc:
        logger.error(f"Error deleting report {report_id}: {exc}")
        return False
