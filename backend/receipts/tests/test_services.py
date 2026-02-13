from unittest.mock import patch

from django.test import SimpleTestCase
import requests

from receipts.services import ReceiptAnalysisError, analyze_receipt_image


class _MockResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


class ReceiptServicesTests(SimpleTestCase):
    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "gpt-4o-mini"}, clear=False)
    @patch("receipts.services.requests.post")
    def test_analyze_receipt_accepts_list_content_parts(self, mock_post):
        mock_post.return_value = _MockResponse(
            payload={
                "choices": [
                    {
                        "message": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        '{"vendor":"Store","receipt_date":"2026-02-13","currency":"USD",'
                                        '"category":"other","subtotal":10,"tax":1,"tip":0,"total":11,'
                                        '"items":[{"name":"Milk","quantity":1,"unit_price":3,"total_price":3}],'
                                        '"raw_text":"milk"}'
                                    ),
                                }
                            ]
                        }
                    }
                ]
            }
        )

        parsed = analyze_receipt_image(b"fake-image", "image/jpeg")

        self.assertEqual(parsed["vendor"], "Store")
        self.assertEqual(parsed["currency"], "USD")
        self.assertEqual(parsed["category"], "other")
        self.assertEqual(len(parsed["items"]), 1)

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=False)
    @patch("receipts.services.requests.post")
    def test_analyze_receipt_wraps_network_error(self, mock_post):
        mock_post.side_effect = requests.RequestException("network unreachable")
        with self.assertRaises(ReceiptAnalysisError):
            analyze_receipt_image(b"fake-image", "image/jpeg")

    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=False)
    @patch("receipts.services.requests.post")
    def test_analyze_receipt_raises_on_invalid_json_payload(self, mock_post):
        class BadJsonResponse(_MockResponse):
            def json(self):
                raise ValueError("invalid json")

        mock_post.return_value = BadJsonResponse(status_code=200, text="ok")
        with self.assertRaises(ReceiptAnalysisError):
            analyze_receipt_image(b"fake-image", "image/jpeg")
