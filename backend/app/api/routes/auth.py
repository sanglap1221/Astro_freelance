"""
Authentication API routes: login, change password, get current user.
"""
import os
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv

from app.auth_models import LoginRequest, ChangePasswordRequest, TokenResponse, UserInfo
from app.auth_middleware import create_access_token, get_current_user
from app.db import get_mongo_client, verify_password, hash_password

load_dotenv()

logger = logging.getLogger("astro_app.auth_routes")

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_EXPIRY_DAYS = int(os.getenv("JWT_EXPIRY_DAYS", "7"))
JWT_EXPIRY_SECONDS = JWT_EXPIRY_DAYS * 24 * 60 * 60

MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "astro_freelance")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    """Authenticate user and return JWT token."""
    client = get_mongo_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )

    db = client[MONGODB_DB_NAME]
    user = db.users.find_one({"username": payload.username})

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Create JWT token
    token_data = {
        "sub": user["username"],
        "role": user["role"],
    }
    access_token = create_access_token(token_data, JWT_EXPIRY_SECONDS)

    return TokenResponse(
        access_token=access_token,
        expires_in=JWT_EXPIRY_SECONDS,
        user=UserInfo(
            username=user["username"],
            role=user["role"],
            created_at=user.get("created_at"),
        ),
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change password for the currently authenticated user."""
    client = get_mongo_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )

    db = client[MONGODB_DB_NAME]
    user = db.users.find_one({"username": current_user["sub"]})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify current password
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Update to new password
    new_hash = hash_password(payload.new_password)
    db.users.update_one(
        {"username": current_user["sub"]},
        {"$set": {"password_hash": new_hash}},
    )

    logger.info(f"Password changed for user: {current_user['sub']}")
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserInfo)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return info about the currently authenticated user."""
    client = get_mongo_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )

    db = client[MONGODB_DB_NAME]
    user = db.users.find_one({"username": current_user["sub"]})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserInfo(
        username=user["username"],
        role=user["role"],
        created_at=user.get("created_at"),
    )
