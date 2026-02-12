import secrets
import string

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class HouseholdSession(models.Model):
    code = models.CharField(max_length=8, unique=True, db_index=True)
    household_name = models.CharField(max_length=120)
    member_1_name = models.CharField(max_length=64)
    member_2_name = models.CharField(max_length=64)
    passcode_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.household_name} ({self.code})"

    @classmethod
    def _generate_code(cls) -> str:
        alphabet = string.ascii_uppercase + string.digits
        for _ in range(30):
            code = "".join(secrets.choice(alphabet) for _ in range(6))
            if not cls.objects.filter(code=code).exists():
                return code
        raise RuntimeError("Unable to generate a unique household code")

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def set_passcode(self, raw_passcode: str):
        self.passcode_hash = make_password(raw_passcode)

    def verify_passcode(self, raw_passcode: str) -> bool:
        return check_password(raw_passcode, self.passcode_hash)

    def member_names(self) -> dict[str, str]:
        return {
            Receipt.USER_1: self.member_1_name,
            Receipt.USER_2: self.member_2_name,
        }

    def name_for_code(self, user_code: str) -> str:
        names = self.member_names()
        return names.get(user_code, user_code)

    def resolve_user_code_from_name(self, name: str) -> str | None:
        normalized = name.strip().lower()
        if not normalized:
            return None

        names = self.member_names()
        for user_code, member_name in names.items():
            if member_name.lower() == normalized:
                return user_code
        return None


class Receipt(models.Model):
    USER_1 = "user_1"
    USER_2 = "user_2"
    USER_CHOICES = [
        (USER_1, "User 1"),
        (USER_2, "User 2"),
    ]

    household = models.ForeignKey(
        HouseholdSession,
        on_delete=models.CASCADE,
        related_name="receipts",
        null=True,
        blank=True,
    )
    uploaded_by = models.CharField(max_length=16, choices=USER_CHOICES)
    image = models.ImageField(upload_to="receipts/")

    expense_date = models.DateField(default=timezone.localdate, db_index=True)
    vendor = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=8, blank=True, default="USD")

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tax = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tip = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    items = models.JSONField(default=list, blank=True)
    raw_text = models.TextField(blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-expense_date", "-uploaded_at"]

    def __str__(self) -> str:
        household_label = self.household.household_name if self.household else "No Household"
        return f"{household_label}: {self.get_uploaded_by_display()} - {self.vendor or 'Receipt'} ({self.expense_date})"
