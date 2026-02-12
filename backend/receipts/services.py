import base64
import json
import os
import re
from typing import Any

import requests

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"


class ReceiptAnalysisError(Exception):
    pass


def _extract_json(content: str) -> dict[str, Any]:
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```json\s*(\{.*?\})\s*```", content, flags=re.DOTALL)
    if fenced_match:
        return json.loads(fenced_match.group(1))

    object_match = re.search(r"(\{.*\})", content, flags=re.DOTALL)
    if object_match:
        return json.loads(object_match.group(1))

    raise ReceiptAnalysisError("Could not parse JSON from model response")


def analyze_receipt_image(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
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
        "Use null when values are missing. Keep currency as ISO code when possible."
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

    response = requests.post(
        OPENAI_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )

    if response.status_code >= 400:
        raise ReceiptAnalysisError(f"OpenAI request failed: {response.status_code} {response.text}")

    data = response.json()
    try:
        message_content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ReceiptAnalysisError("Unexpected response format from OpenAI") from exc

    parsed = _extract_json(message_content)
    parsed.setdefault("items", [])
    return parsed
