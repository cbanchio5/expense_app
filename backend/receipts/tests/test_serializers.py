from django.test import TestCase

from receipts.models import HouseholdSession
from receipts.serializers import HouseholdCreateSerializer


class HouseholdCreateSerializerTests(TestCase):
    def test_rejects_same_member_names(self):
        serializer = HouseholdCreateSerializer(
            data={
                "household_name": "Brick Home",
                "member_1_name": "Alex",
                "member_2_name": "alex",
                "passcode": "1234",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("Member names must be different.", serializer.errors["non_field_errors"])

    def test_rejects_duplicate_household_name_case_insensitive(self):
        existing = HouseholdSession(
            household_name="Brick Home",
            member_1_name="Alex",
            member_2_name="Jamie",
        )
        existing.set_passcode("1234")
        existing.save()

        serializer = HouseholdCreateSerializer(
            data={
                "household_name": "brick home",
                "member_1_name": "Taylor",
                "member_2_name": "Morgan",
                "passcode": "4321",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("Household name already taken.", serializer.errors["non_field_errors"])
