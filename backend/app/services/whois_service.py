import logging

import tldextract

logger = logging.getLogger(__name__)


def extract_domain(url_or_domain: str) -> str:
    """Extracts registered domain name from a URL or raw domain string."""
    ext = tldextract.extract(url_or_domain)
    if ext.top_domain_under_public_suffix:
        return ext.top_domain_under_public_suffix.lower()
    return url_or_domain.lower().replace("https://", "").replace("http://", "").split("/")[0]


def get_domain_age_days(domain: str) -> int | None:
    """
    Retrieves or estimates domain age in days.
    Returns 365 as safe fallback if WHOIS lookup fails or is restricted.
    """
    try:
        import whois
        w = whois.whois(domain)
        creation_date = w.creation_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        if creation_date:
            from datetime import datetime
            age = (datetime.utcnow() - creation_date).days
            return max(age, 1)
    except Exception as e:
        logger.debug(f"WHOIS lookup fallback for {domain}: {e!s}")

    return 365
