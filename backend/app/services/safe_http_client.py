import asyncio
import ipaddress
import logging
import socket
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

FORBIDDEN_HOSTNAMES = {"localhost", "localhost.localdomain", "127.0.0.1", "::1"}


def is_ip_forbidden(ip_str: str) -> bool:
    """
    Checks whether an IP address string belongs to a private, loopback,
    link-local, multicast, or reserved range (RFC1918, 127.0.0.0/8, 169.254.0.0/16, ::1, fc00::/7).
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        return True


async def validate_url_host(url: str) -> str:
    """
    Validates URL scheme, parses hostname, resolves DNS to IP addresses,
    and ensures all resolved IPs are public and not in forbidden ranges.
    Returns normalized target URL.
    """
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https are allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: Missing hostname.")

    if hostname.lower() in FORBIDDEN_HOSTNAMES or hostname.lower().endswith(".internal"):
        raise ValueError(f"Access to forbidden target hostname '{hostname}' is blocked.")

    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    loop = asyncio.get_running_loop()

    try:
        addr_info = await loop.getaddrinfo(
            hostname, port, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP
        )
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve hostname '{hostname}': {exc}") from exc

    resolved_ips = set()
    for item in addr_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        resolved_ips.add(ip_str)

    if not resolved_ips:
        raise ValueError(f"No IP addresses resolved for '{hostname}'.")

    for ip_str in resolved_ips:
        if is_ip_forbidden(ip_str):
            raise ValueError(f"Host '{hostname}' resolves to restricted IP address '{ip_str}'. Fetch blocked for SSRF prevention.")

    return url


class SafeFetchResponse:
    def __init__(self, status_code: int, text: str, headers: dict[str, str], url: str, content: bytes | None = None):
        self.status_code = status_code
        self.text = text
        self.content = content if content is not None else text.encode("utf-8")
        self.headers = headers
        self.url = url

    def raise_for_status(self):
        if not (200 <= self.status_code < 300):
            raise httpx.HTTPStatusError(
                f"HTTP status {self.status_code}",
                request=httpx.Request("GET", self.url),
                response=httpx.Response(self.status_code),
            )


async def safe_fetch_url(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    content: str | bytes | None = None,
    timeout: float = 10.0,
    max_size_bytes: int = 5 * 1024 * 1024,
    max_redirects: int = 5,
) -> SafeFetchResponse:
    """
    Executes an HTTP/HTTPS request with strict SSRF protection:
    - Validates scheme & resolves hostname to IP addresses before fetch.
    - Re-validates resolved IP addresses for every redirect hop.
    - Limits response size stream up to max_size_bytes.
    """
    current_url = url
    headers = dict(headers or {})
    redirect_count = 0

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        while True:
            await validate_url_host(current_url)

            req_content = content
            if isinstance(req_content, str):
                req_content = req_content.encode("utf-8")

            try:
                response = await client.request(
                    method=method,
                    url=current_url,
                    headers=headers,
                    content=req_content,
                )
            except httpx.RequestError as exc:
                raise ValueError(f"Request failed for {current_url}: {exc}") from exc

            # Handle redirects manually to validate destination target
            if response.status_code in (301, 302, 303, 307, 308) and "Location" in response.headers:
                redirect_count += 1
                if redirect_count > max_redirects:
                    raise ValueError(f"Too many redirects (exceeded max {max_redirects}).")

                location = response.headers["Location"]
                current_url = urljoin(current_url, location)
                # Subsequent redirect requests use GET for 301/302/303
                if response.status_code in (301, 302, 303):
                    method = "GET"
                    content = None
                continue

            # Read response body up to max_size_bytes safely
            body_chunks = []
            bytes_read = 0
            async for chunk in response.aiter_bytes():
                bytes_read += len(chunk)
                if bytes_read > max_size_bytes:
                    body_chunks.append(chunk[: max_size_bytes - (bytes_read - len(chunk))])
                    logger.warning(f"Response size exceeded max {max_size_bytes} bytes for {current_url}. Truncating.")
                    break
                body_chunks.append(chunk)

            full_body = b"".join(body_chunks)
            text_body = full_body.decode("utf-8", errors="replace")

            resp_headers = dict(response.headers)
            return SafeFetchResponse(
                status_code=response.status_code,
                text=text_body,
                content=full_body,
                headers=resp_headers,
                url=str(response.url),
            )
