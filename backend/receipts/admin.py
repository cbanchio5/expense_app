from django.contrib import admin

from .models import HouseholdSession, Receipt


@admin.register(HouseholdSession)
class HouseholdSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "household_name", "code", "member_1_name", "member_2_name", "created_at")
    search_fields = ("household_name", "code", "member_1_name", "member_2_name")


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("id", "household", "uploaded_by", "vendor", "expense_date", "total", "uploaded_at")
    list_filter = ("uploaded_by", "expense_date", "household")
    search_fields = ("vendor", "raw_text", "household__household_name", "household__code")
