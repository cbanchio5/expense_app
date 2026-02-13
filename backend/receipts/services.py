import base64
import json
import os
import re
from typing import Any

import requests

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
CATEGORY_SUPERMARKET = "supermarket"
CATEGORY_BILLS = "bills"
CATEGORY_TAXES = "taxes"
CATEGORY_ENTERTAINMENT = "entertainment"
CATEGORY_OTHER = "other"
ALLOWED_CATEGORIES = {
    CATEGORY_SUPERMARKET,
    CATEGORY_BILLS,
    CATEGORY_TAXES,
    CATEGORY_ENTERTAINMENT,
    CATEGORY_OTHER,
}


class ReceiptAnalysisError(Exception):
    pass


def _coerce_content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        text_value = content.get("text")
        return text_value if isinstance(text_value, str) else json.dumps(content)
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text_value = item.get("text")
                if isinstance(text_value, str):
                    parts.append(text_value)
        return "\n".join(parts)
    return str(content)


def _extract_json(content: Any) -> dict[str, Any]:
    content_text = _coerce_content_to_text(content).strip()
    if not content_text:
        raise ReceiptAnalysisError("OpenAI returned an empty response")

    try:
        parsed_direct = json.loads(content_text)
        if isinstance(parsed_direct, dict):
            return parsed_direct
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```json\s*(\{.*?\})\s*```", content_text, flags=re.DOTALL)
    if fenced_match:
        return json.loads(fenced_match.group(1))

    object_match = re.search(r"(\{.*\})", content_text, flags=re.DOTALL)
    if object_match:
        return json.loads(object_match.group(1))

    raise ReceiptAnalysisError("Could not parse JSON from model response")


def _normalize_category(value: Any) -> str:
    if not isinstance(value, str):
        return CATEGORY_OTHER
    normalized = value.strip().lower()
    return normalized if normalized in ALLOWED_CATEGORIES else CATEGORY_OTHER


def _infer_category_from_text(parsed: dict[str, Any]) -> str:
    vendor = str(parsed.get("vendor") or "").lower()
    raw_text = str(parsed.get("raw_text") or "").lower()
    item_names = " ".join(str(item.get("name") or "").lower() for item in (parsed.get("items") or []) if isinstance(item, dict))
    text = " ".join([vendor, raw_text, item_names])

    if any(keyword in text for keyword in ("tax", "irs", "property tax", "sales tax", "taxes")):
        return CATEGORY_TAXES
    if any(
        keyword in text
        for keyword in (
            "electric",
            "water",
            "gas bill",
            "internet",
            "phone bill",
            "utility",
            "rent",
            "mortgage",
            "insurance",
        )
    ):
        return CATEGORY_BILLS
    if any(
        keyword in text
        for keyword in (
            "movie",
            "cinema",
            "netflix",
            "spotify",
            "concert",
            "bar",
            "pub",
            "game",
            "tickets",
            "entertainment",
        )
    ):
        return CATEGORY_ENTERTAINMENT
    if any(
        keyword in text
        for keyword in (
            "grocery",
            "supermarket",
            "market",
            "walmart",
            "costco",
            "target",
            "aldi",
            "trader joe",
            "whole foods",
            "safeway",
            "kroger",
        )
    ):
        return CATEGORY_SUPERMARKET
    return CATEGORY_OTHER


def analyze_receipt_image(
    image_bytes: bytes,
    mime_type: str,
    *,
    bulk_index: int | None = None,
    bulk_total: int | None = None,
) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ReceiptAnalysisError("OPENAI_API_KEY is not set")

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "You are a receipt parser. Extract line items and totals from this receipt image. "
        "Return only valid JSON with this exact schema: "
        "{"
        '"vendor": string, '
        '"receipt_date": string, '
        '"currency": string, '
        '"category": "supermarket"|"bills"|"taxes"|"entertainment"|"other", '
        '"subtotal": number|null, '
        '"tax": number|null, '
        '"tip": number|null, '
        '"total": number|null, '
        '"items": ['
        "{"
        '"name": string, "quantity": number|null, "unit_price": number|null, "total_price": number|null'
        "}"
        "], "
        '"raw_text": string'
        "}. "
        "Use null when values are missing. Keep currency as ISO code when possible. "
        "Pick category carefully based on vendor and items."
    )
    if bulk_index is not None and bulk_total is not None:
        prompt += (
            f" This image is receipt {bulk_index} of {bulk_total} from a bulk upload. "
            "Treat each image independently and do not merge values from other receipts."
        )

    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_b64}",
                        },
                    },
                ],
            }
        ],
    }

    try:
        response = requests.post(
            OPENAI_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        raise ReceiptAnalysisError("Could not reach OpenAI receipt service.") from exc

    if response.status_code >= 400:
        raise ReceiptAnalysisError(f"OpenAI request failed: {response.status_code} {response.text}")

    try:
        data = response.json()
    except ValueError as exc:
        raise ReceiptAnalysisError("OpenAI returned an invalid JSON payload.") from exc
    try:
        message_content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ReceiptAnalysisError("Unexpected response format from OpenAI") from exc

    parsed = _extract_json(message_content)
    parsed.setdefault("items", [])
    parsed["category"] = _normalize_category(parsed.get("category")) or _infer_category_from_text(parsed)
    if parsed["category"] == CATEGORY_OTHER:
        parsed["category"] = _infer_category_from_text(parsed)
    return parsed
