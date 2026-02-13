from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from receipts.models import HouseholdNotification, HouseholdSession, Receipt


class ReceiptApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.household = HouseholdSession(
            household_name="Brick House",
            member_1_name="Alex",
            member_2_name="Jamie",
        )
        self.household.set_passcode("1234")
        self.household.save()

        self.login_url = reverse("session-login")
        self.me_url = reverse("session-me")
        self.dashboard_url = reverse("receipt-dashboard")
        self.expenses_url = reverse("receipt-expenses-overview")
        self.manual_url = reverse("expense-manual-create")
        self.settle_url = reverse("household-settle")

    def _set_session(self, client: APIClient, user_code: str):
        session = client.session
        session["household_id"] = self.household.id
        session["user_code"] = user_code
        session.save()

    def _create_receipt(
        self,
        uploaded_by: str,
        total: str,
        is_saved: bool = True,
        items=None,
        expense_date=None,
    ):
        return Receipt.objects.create(
            household=self.household,
            uploaded_by=uploaded_by,
            expense_date=expense_date or timezone.localdate(),
            vendor="Store",
            currency="USD",
            total=total,
            items=items or [],
            is_saved=is_saved,
        )

    def test_login_returns_session_token(self):
        response = self.client.post(
            self.login_url,
            {"household_name": "Brick House", "name": "Alex", "passcode": "1234"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"], Receipt.USER_1)
        self.assertIn("session_token", response.data)
        self.assertTrue(response.data["session_token"])

    def test_session_me_works_with_bearer_token_without_cookie(self):
        login_response = self.client.post(
            self.login_url,
            {"household_name": "Brick House", "name": "Alex", "passcode": "1234"},
            format="json",
        )
        token = login_response.data["session_token"]

        fresh_client = APIClient()
        response = fresh_client.get(self.me_url, HTTP_AUTHORIZATION=f"Bearer {token}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user_name"], "Alex")
        self.assertEqual(response.data["household_name"], "Brick House")

    def test_manual_expense_requires_authentication(self):
        response = self.client.post(
            self.manual_url,
            {"vendor": "Cafe", "total": 20.5, "currency": "USD"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manual_expense_creates_saved_receipt(self):
        self._set_session(self.client, Receipt.USER_1)

        response = self.client.post(
            self.manual_url,
            {"vendor": "Cafe", "total": 20.5, "currency": "USD"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        receipt = Receipt.objects.get(id=response.data["receipt"]["id"])
        self.assertTrue(receipt.is_saved)
        self.assertEqual(receipt.uploaded_by, Receipt.USER_1)

    def test_dashboard_recent_receipts_limit_is_four(self):
        self._set_session(self.client, Receipt.USER_1)
        for amount in ["10.00", "20.00", "30.00", "40.00", "50.00"]:
            self._create_receipt(uploaded_by=Receipt.USER_1, total=amount, is_saved=True)

        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["recent_receipts"]), 4)

    def test_expenses_overview_returns_current_last_and_six_month_trend(self):
        self._set_session(self.client, Receipt.USER_1)
        today = timezone.localdate()
        current_start = today.replace(day=1)
        last_month_day = current_start - timedelta(days=1)

        self._create_receipt(uploaded_by=Receipt.USER_1, total="30.00", is_saved=True, expense_date=today)
        self._create_receipt(
            uploaded_by=Receipt.USER_2,
            total="20.00",
            is_saved=True,
            expense_date=last_month_day,
        )

        response = self.client.get(self.expenses_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["six_month_trend"]), 6)
        self.assertEqual(response.data["current_month"]["totals"]["combined"], 30.0)
        self.assertEqual(response.data["last_month"]["totals"]["combined"], 20.0)

    def test_receipt_item_assignment_marks_receipt_saved(self):
        self._set_session(self.client, Receipt.USER_1)
        receipt = self._create_receipt(
            uploaded_by=Receipt.USER_1,
            total="12.00",
            is_saved=False,
            items=[{"name": "Milk", "total_price": 12, "assigned_to": "shared"}],
        )

        response = self.client.patch(
            reverse("receipt-item-assignments", kwargs={"receipt_id": receipt.id}),
            {"assignments": [{"index": 0, "assigned_to": Receipt.USER_2}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        receipt.refresh_from_db()
        self.assertTrue(receipt.is_saved)
        self.assertEqual(receipt.items[0]["assigned_to"], Receipt.USER_2)

    def test_settle_marks_receipts_and_creates_notifications(self):
        self._set_session(self.client, Receipt.USER_1)
        self._create_receipt(uploaded_by=Receipt.USER_1, total="100.00")
        self._create_receipt(uploaded_by=Receipt.USER_2, total="20.00")

        response = self.client.post(self.settle_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["settlement"]["amount"], 40.0)

        open_receipts = self.household.receipts.filter(settled_at__isnull=True, is_saved=True)
        self.assertEqual(open_receipts.count(), 0)
        self.assertEqual(HouseholdNotification.objects.filter(household=self.household).count(), 2)
