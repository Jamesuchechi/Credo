import pytest
from app.services.safe_http_client import is_ip_forbidden, validate_url_host, safe_fetch_url


def test_is_ip_forbidden():
    assert is_ip_forbidden("127.0.0.1") is True
    assert is_ip_forbidden("10.0.0.1") is True
    assert is_ip_forbidden("172.16.0.5") is True
    assert is_ip_forbidden("192.168.1.100") is True
    assert is_ip_forbidden("169.254.169.254") is True
    assert is_ip_forbidden("::1") is True
    assert is_ip_forbidden("8.8.8.8") is False
    assert is_ip_forbidden("1.1.1.1") is False


@pytest.mark.asyncio
async def test_validate_url_host_blocks_private():
    with pytest.raises(ValueError, match="blocked|restricted|Invalid"):
        await validate_url_host("http://localhost:8000")

    with pytest.raises(ValueError, match="blocked|restricted|Invalid"):
        await validate_url_host("http://127.0.0.1/admin")

    with pytest.raises(ValueError, match="blocked|restricted|Invalid"):
        await validate_url_host("http://169.254.169.254/latest/meta-data")

    with pytest.raises(ValueError, match="Invalid URL scheme"):
        await validate_url_host("ftp://example.com/file")


@pytest.mark.asyncio
async def test_safe_fetch_url_blocks_internal():
    with pytest.raises(ValueError):
        await safe_fetch_url("http://127.0.0.1:6379")
