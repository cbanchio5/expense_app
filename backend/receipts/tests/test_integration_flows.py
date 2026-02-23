from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from receipts.models import Receipt
from receipts.services import ReceiptAnalysisError


class ReceiptIntegrationFlowTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.household_create_url = reverse("household-create")
        self.login_url = reverse("session-login")
        self.me_url = reverse("session-me")
        self.manual_url = reverse("expense-manual-create")
        self.dashboard_url = reverse("receipt-dashboard")
        self.analyses_url = reverse("receipt-analyses")
        self.bulk_analyze_url = reverse("receipt-analyze-bulk")
        self.settle_url = reverse("household-settle")

    @staticmethod
    def _auth_headers(token: str) -> dict[str, str]:
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _create_household(self) -> dict:
        response = self.client.post(
            self.household_create_url,
            {
                "household_name": "Integration House",
                "member_1_name": "Alex",
                "member_2_name": "Jamie",
                "passcode": "1234",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def _login(self, household_name: str, name: str, passcode: str) -> dict:
        response = self.client.post(
            self.login_url,
            {"household_name": household_name, "name": name, "passcode": passcode},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_create_household_then_bearer_manual_dashboard_and_analyses_flow(self):
        create_data = self._create_household()
        token = create_data["session_token"]
        headers = self._auth_headers(token)

        me_response = self.client.get(self.me_url, **headers)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["user"], Receipt.USER_1)
        self.assertEqual(me_response.data["user_name"], "Alex")
        self.assertEqual(me_response.data["household_name"], "Integration House")

        manual_response = self.client.post(
            self.manual_url,
            {"vendor": "Power Co", "total": 89.25, "currency": "USD", "category": "bills"},
            format="json",
            **headers,
        )
        self.assertEqual(manual_response.status_code, status.HTTP_201_CREATED)
        receipt_id = manual_response.data["receipt"]["id"]
        self.assertTrue(manual_response.data["receipt"]["is_saved"])

        dashboard_response = self.client.get(self.dashboard_url, **headers)
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_response.data["current_month"]["totals"]["user_1"], 89.25)
        self.assertEqual(dashboard_response.data["current_month"]["totals"]["combined"], 89.25)
        self.assertTrue(any(receipt["id"] == receipt_id for receipt in dashboard_response.data["recent_receipts"]))

        analyses_response = self.client.get(self.analyses_url, **headers)
        self.assertEqual(analyses_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(analyses_response.data["analyses"]), 1)
        self.assertEqual(analyses_response.data["analyses"][0]["id"], receipt_id)

    @patch("receipts.views.analyze_receipt_image")
    def test_bulk_upload_partial_failure_then_save_updates_dashboard_flow(self, mock_analyze):
        create_data = self._create_household()
        token = create_data["session_token"]
        headers = self._auth_headers(token)

        mock_analyze.side_effect = [
            {
                "vendor": "Market A",
                "receipt_date": str(timezone.localdate()),
                "currency": "USD",
                "category": "supermarket",
                "subtotal": 9.0,
                "tax": 1.0,
                "tip": 0.0,
                "total": 10.0,
                "items": [{"name": "Bread", "quantity": 1, "unit_price": 10.0, "total_price": 10.0}],
                "raw_text": "Bread",
            },
            ReceiptAnalysisError("Could not parse ticket."),
        ]

        image_ok = SimpleUploadedFile("ok.jpg", b"fake-ok", content_type="image/jpeg")
        image_bad = SimpleUploadedFile("bad.jpg", b"fake-bad", content_type="image/jpeg")

        bulk_response = self.client.post(
            self.bulk_analyze_url,
            {"images": [image_ok, image_bad]},
            format="multipart",
            **headers,
        )
        self.assertEqual(bulk_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(bulk_response.data["processed_count"], 1)
        self.assertEqual(bulk_response.data["failed_count"], 1)
        self.assertEqual(bulk_response.data["failed"][0]["filename"], "bad.jpg")
        receipt_id = bulk_response.data["receipts"][0]["id"]

        dashboard_before_save = self.client.get(self.dashboard_url, **headers)
        self.assertEqual(dashboard_before_save.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_before_save.data["current_month"]["receipt_count"], 0)
        self.assertEqual(dashboard_before_save.data["current_month"]["totals"]["combined"], 0.0)

        save_response = self.client.patch(
            reverse("receipt-item-assignments", kwargs={"receipt_id": receipt_id}),
            {"assignments": [{"index": 0, "assigned_to": "shared"}], "category": "supermarket"},
            format="json",
            **headers,
        )
        self.assertEqual(save_response.status_code, status.HTTP_200_OK)
        self.assertTrue(save_response.data["receipt"]["is_saved"])

        dashboard_after_save = self.client.get(self.dashboard_url, **headers)
        self.assertEqual(dashboard_after_save.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_after_save.data["current_month"]["receipt_count"], 1)
        self.assertEqual(dashboard_after_save.data["current_month"]["totals"]["combined"], 10.0)

    def test_two_users_manual_expenses_then_settlement_flow(self):
        create_data = self._create_household()
        household_name = create_data["household_name"]

        token_user_1 = create_data["session_token"]
        user_2_login_data = self._login(household_name=household_name, name="Jamie", passcode="1234")
        token_user_2 = user_2_login_data["session_token"]

        user_1_headers = self._auth_headers(token_user_1)
        user_2_headers = self._auth_headers(token_user_2)
        client_user_1 = APIClient()
        client_user_2 = APIClient()

        expense_user_1 = client_user_1.post(
            self.manual_url,
            {"vendor": "Store A", "total": 100.0, "currency": "USD"},
            format="json",
            **user_1_headers,
        )
        self.assertEqual(expense_user_1.status_code, status.HTTP_201_CREATED)

        expense_user_2 = client_user_2.post(
            self.manual_url,
            {"vendor": "Store B", "total": 20.0, "currency": "USD"},
            format="json",
            **user_2_headers,
        )
        self.assertEqual(expense_user_2.status_code, status.HTTP_201_CREATED)

        settle_response = client_user_1.post(self.settle_url, {}, format="json", **user_1_headers)
        self.assertEqual(settle_response.status_code, status.HTTP_200_OK)
        self.assertEqual(settle_response.data["settlement"]["payer"], Receipt.USER_2)
        self.assertEqual(settle_response.data["settlement"]["payee"], Receipt.USER_1)
        self.assertEqual(settle_response.data["settlement"]["amount"], 40.0)

        unsettled_receipts = Receipt.objects.filter(household__household_name="Integration House", settled_at__isnull=True)
        self.assertEqual(unsettled_receipts.count(), 0)
