from rest_framework import serializers

from .models import Receipt


class ReceiptUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True)


class ReceiptItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    quantity = serializers.FloatField(required=False, allow_null=True)
    unit_price = serializers.FloatField(required=False, allow_null=True)
    total_price = serializers.FloatField(required=False, allow_null=True)
    assigned_to = serializers.ChoiceField(
        choices=["shared", Receipt.USER_1, Receipt.USER_2],
        required=False,
        default="shared",
    )


class ReceiptAnalysisSerializer(serializers.Serializer):
    vendor = serializers.CharField(required=False, allow_blank=True)
    receipt_date = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.CharField(required=False, allow_blank=True)
    subtotal = serializers.FloatField(required=False, allow_null=True)
    tax = serializers.FloatField(required=False, allow_null=True)
    tip = serializers.FloatField(required=False, allow_null=True)
    total = serializers.FloatField(required=False, allow_null=True)
    items = ReceiptItemSerializer(many=True)
    raw_text = serializers.CharField(required=False, allow_blank=True)


class ReceiptRecordSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    tip = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = [
            "id",
            "uploaded_by",
            "uploaded_by_name",
            "expense_date",
            "vendor",
            "currency",
            "subtotal",
            "tax",
            "tip",
            "total",
            "items",
            "uploaded_at",
        ]

    @staticmethod
    def _to_float(value):
        return float(value) if value is not None else None

    def get_subtotal(self, obj):
        return self._to_float(obj.subtotal)

    def get_tax(self, obj):
        return self._to_float(obj.tax)

    def get_tip(self, obj):
        return self._to_float(obj.tip)

    def get_total(self, obj):
        return self._to_float(obj.total)

    def get_uploaded_by_name(self, obj):
        if obj.household:
            return obj.household.name_for_code(obj.uploaded_by)
        return "Member" if obj.uploaded_by not in (Receipt.USER_1, Receipt.USER_2) else obj.get_uploaded_by_display()


class MonthTotalsSerializer(serializers.Serializer):
    user_1 = serializers.FloatField()
    user_2 = serializers.FloatField()
    combined = serializers.FloatField()


class MonthSummarySerializer(serializers.Serializer):
    month_label = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    totals = MonthTotalsSerializer()
    receipt_count = serializers.IntegerField()


class SettlementSerializer(serializers.Serializer):
    payer = serializers.CharField(allow_blank=True)
    payer_name = serializers.CharField(allow_blank=True)
    payee = serializers.CharField(allow_blank=True)
    payee_name = serializers.CharField(allow_blank=True)
    amount = serializers.FloatField()
    message = serializers.CharField()


class NotificationSerializer(serializers.Serializer):
    user = serializers.CharField()
    message = serializers.CharField()
    read = serializers.BooleanField(default=False)


class MemberNamesSerializer(serializers.Serializer):
    user_1 = serializers.CharField()
    user_2 = serializers.CharField()


class DashboardSerializer(serializers.Serializer):
    household_code = serializers.CharField()
    household_name = serializers.CharField()
    current_user = serializers.CharField()
    current_user_name = serializers.CharField()
    members = MemberNamesSerializer()
    current_date = serializers.DateField()
    current_month = MonthSummarySerializer()
    last_month = MonthSummarySerializer()
    settlement = SettlementSerializer()
    notifications = NotificationSerializer(many=True)
    recent_receipts = ReceiptRecordSerializer(many=True)


class HouseholdCreateSerializer(serializers.Serializer):
    household_name = serializers.CharField(max_length=120)
    member_1_name = serializers.CharField(max_length=64)
    member_2_name = serializers.CharField(max_length=64)
    passcode = serializers.CharField(min_length=4, max_length=128)

    def validate(self, attrs):
        member_1 = attrs["member_1_name"].strip().lower()
        member_2 = attrs["member_2_name"].strip().lower()
        if member_1 == member_2:
            raise serializers.ValidationError("Member names must be different.")
        return attrs


class SessionLoginSerializer(serializers.Serializer):
    household_code = serializers.CharField(max_length=8)
    name = serializers.CharField(max_length=64)
    passcode = serializers.CharField(max_length=128)


class SessionStateSerializer(serializers.Serializer):
    user = serializers.CharField(allow_null=True)
    user_name = serializers.CharField(allow_null=True)
    household_code = serializers.CharField(allow_null=True)
    household_name = serializers.CharField(allow_null=True)
    members = MemberNamesSerializer(required=False)


class ReceiptItemAssignmentSerializer(serializers.Serializer):
    index = serializers.IntegerField(min_value=0)
    assigned_to = serializers.ChoiceField(choices=["shared", Receipt.USER_1, Receipt.USER_2])


class ReceiptItemAssignmentsUpdateSerializer(serializers.Serializer):
    assignments = ReceiptItemAssignmentSerializer(many=True)
