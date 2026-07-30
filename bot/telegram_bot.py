"""
Telegram Bot service for Credo Credibility Verification.

Users can send text, links, or screenshots directly to the Telegram bot,
which triggers Credo analysis and returns a formatted Credibility Card.

Run via:
    python -m bot.telegram_bot
"""

import asyncio
import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

CREDO_API_BASE = os.getenv("CREDO_API_BASE", "http://localhost:8000/api/v1")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "MOCK_TELEGRAM_BOT_TOKEN")


class CredoTelegramBot:
    def __init__(self, api_base: str = CREDO_API_BASE, token: str = TELEGRAM_BOT_TOKEN):
        self.api_base = api_base.rstrip("/")
        self.token = token

    async def analyze_submission(self, text_or_url: str, modality: str = "text") -> dict:
        """Sends content item to Credo backend for analysis."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "text_content": text_or_url if modality == "text" else None,
                "url": text_or_url if modality == "url" else None,
                "modality": modality,
            }
            res = await client.post(f"{self.api_base}/content", json=payload)
            res.raise_for_status()
            data = res.json()
            content_id = data.get("id")

            # Fetch analysis result
            for _ in range(10):
                await asyncio.sleep(1)
                res_check = await client.get(f"{self.api_base}/content/{content_id}")
                if res_check.status_code == 200:
                    analysis = res_check.json()
                    if analysis.get("analysis_result"):
                        return analysis

            return {"error": "Analysis timed out or pending."}

    def format_credibility_card(self, analysis_data: dict) -> str:
        """Formats analysis result into a clean Telegram Markdown message."""
        if "error" in analysis_data:
            return f"⚠️ *Credo Analysis Warning*\n\n{analysis_data['error']}"

        result = analysis_data.get("analysis_result", {})
        score = result.get("composite_score", 0.0)
        dimensions = result.get("dimension_scores", {})
        reasoning = result.get("reasoning_chain", {})

        score_emoji = "🟢" if score >= 70 else ("🟡" if score >= 40 else "🔴")
        verdict = "LIKELY CREDIBLE" if score >= 70 else ("NEEDS CAUTION" if score >= 40 else "HIGH RISK / MISINFORMATION")

        card = f"{score_emoji} *CREDO CREDIBILITY CARD*\n"
        card += f"━━━━━━━━━━━━━━━━━━━━━\n"
        card += f"*Overall Score:* `{score:.1f}/100` ({verdict})\n\n"
        card += f"*Dimension Breakdown:*\n"
        card += f"• Source Reputation: `{dimensions.get('source_reputation', 0):.1f}/100`\n"
        card += f"• Corroboration: `{dimensions.get('corroboration', 0):.1f}/100`\n"
        card += f"• Claim Authenticity: `{dimensions.get('claim_veracity', 0):.1f}/100`\n"
        card += f"• Linguistic Integrity: `{dimensions.get('linguistic_integrity', 0):.1f}/100`\n\n"

        summary = reasoning.get("summary") or reasoning.get("narrative_summary") or "Analysis completed successfully."
        card += f"*Key Takeaway:*\n_{summary}_\n\n"
        card += f"🔗 _Verified by Credo Engine v{result.get('model_version', '1.0.0')}_"

        return card

    async def handle_message(self, message_text: str) -> str:
        """Entry point for incoming text/url messages."""
        modality = "url" if message_text.startswith("http://") or message_text.startswith("https://") else "text"
        analysis = await self.analyze_submission(message_text, modality=modality)
        return self.format_credibility_card(analysis)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logger.info("Initializing Credo Telegram Bot service...")
    bot = CredoTelegramBot()
    print("Credo Telegram Bot service ready.")
