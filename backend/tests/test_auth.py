import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.user import User


@pytest.mark.asyncio
async def test_auth_register_and_login():
    fake_user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password=hash_password("secretpass123"),
        full_name="Test User",
        is_active=True,
        created_at=datetime.utcnow()
    )

    mock_db = AsyncMock()

    # Mock execute result (none existing for register)
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None

    # Mock execute result (user found for login)
    mock_res_user = MagicMock()
    mock_res_user.scalar_one_or_none.return_value = fake_user

    mock_db.execute.side_effect = [mock_res_none, mock_res_user, mock_res_user]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register
        reg_payload = {"email": "test@example.com", "password": "secretpass123", "full_name": "Test User"}
        res_reg = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert res_reg.status_code == 201
        data_reg = res_reg.json()
        assert "access_token" in data_reg
        assert data_reg["user"]["email"] == "test@example.com"

        token = data_reg["access_token"]

        # 2. Login
        login_payload = {"email": "test@example.com", "password": "secretpass123"}
        res_login = await ac.post("/api/v1/auth/login", json=login_payload)
        assert res_login.status_code == 200
        data_login = res_login.json()
        assert "access_token" in data_login

        # 3. Get /me with Bearer token
        headers = {"Authorization": f"Bearer {token}"}
        res_me = await ac.get("/api/v1/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == "test@example.com"

    app.dependency_overrides.clear()
