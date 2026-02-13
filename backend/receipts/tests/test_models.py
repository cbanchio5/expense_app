from django.test import TestCase

from receipts.models import HouseholdSession, Receipt


class HouseholdSessionModelTests(TestCase):
    def test_set_passcode_hashes_and_verifies(self):
        household = HouseholdSession(
            household_name="Brick Home",
            member_1_name="Alex",
            member_2_name="Jamie",
        )
        household.set_passcode("1234")
        household.save()

        self.assertNotEqual(household.passcode_hash, "1234")
        self.assertTrue(household.verify_passcode("1234"))
        self.assertFalse(household.verify_passcode("wrong"))

    def test_resolve_user_code_from_name_is_case_insensitive(self):
        household = HouseholdSession.objects.create(
            household_name="Brick Home",
            member_1_name="Alex",
            member_2_name="Jamie",
            passcode_hash="unused",
        )

        self.assertEqual(household.resolve_user_code_from_name("  alex  "), Receipt.USER_1)
        self.assertEqual(household.resolve_user_code_from_name("JAMIE"), Receipt.USER_2)
        self.assertIsNone(household.resolve_user_code_from_name("Chris"))

    def test_receipt_category_defaults_to_other(self):
        household = HouseholdSession.objects.create(
            household_name="Brick Home",
            member_1_name="Alex",
            member_2_name="Jamie",
            passcode_hash="unused",
        )
        receipt = Receipt.objects.create(
            household=household,
            uploaded_by=Receipt.USER_1,
            vendor="Store",
            total="10.00",
        )
        self.assertEqual(receipt.category, Receipt.CATEGORY_OTHER)
