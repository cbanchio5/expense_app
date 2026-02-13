from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import HouseholdNotification, HouseholdSession, Receipt
from .serializers import (
    DashboardSerializer,
    ExpensesOverviewSerializer,
    HouseholdCreateSerializer,
    ManualExpenseCreateSerializer,
    ReceiptAnalysisSerializer,
    ReceiptAnalysesSerializer,
    ReceiptItemAssignmentsUpdateSerializer,
    ReceiptRecordSerializer,
    ReceiptUploadSerializer,
    SettleHouseholdResponseSerializer,
    SessionLoginSerializer,
    SessionStateSerializer,
)
from .services import ReceiptAnalysisError, analyze_receipt_image

ASSIGNED_SHARED = "shared"
SESSION_TOKEN_SALT = "receipts.session-token"


def _valid_user_codes():
    return {Receipt.USER_1, Receipt.USER_2}


def _build_session_token(household: HouseholdSession, user_code: str) -> str:
    return signing.dumps(
        {
            "household_id": household.id,
            "user_code": user_code,
        },
        salt=SESSION_TOKEN_SALT,
    )


def _parse_session_token(token: str):
    if not token:
        return None, None
    try:
        payload = signing.loads(
            token,
            salt=SESSION_TOKEN_SALT,
            max_age=getattr(settings, "SESSION_COOKIE_AGE", 1209600),
        )
    except (signing.BadSignature, signing.SignatureExpired, ValueError, TypeError):
        return None, None

    user_code = payload.get("user_code")
    household_id = payload.get("household_id")
    if user_code not in _valid_user_codes() or not household_id:
        return None, None

    household = HouseholdSession.objects.filter(id=household_id).first()
    if not household:
        return None, None
    return household, user_code


def _session_context(request):
    user_code = request.session.get("user_code")
    household_id = request.session.get("household_id")

    if user_code in _valid_user_codes() and household_id:
        household = HouseholdSession.objects.filter(id=household_id).first()
        if household:
            return household, user_code

    auth_header = request.headers.get("Authorization", "").strip()
    token = ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
    if not token:
        token = request.headers.get("X-Session-Token", "").strip()

    return _parse_session_token(token)


def _parse_receipt_date(value: str | None):
    if not value:
        return None

    parsed = parse_date(value)
    if parsed:
        return parsed

    normalized = value.strip()
    accepted_formats = (
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%m-%d-%Y",
    )
    for date_format in accepted_formats:
        try:
            return datetime.strptime(normalized, date_format).date()
        except ValueError:
            continue
    return None


def _to_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        return None


def _normalize_receipt_items(items):
    normalized_items = []
    for item in items or []:
        if not isinstance(item, dict):
            continue

        assigned_to = item.get("assigned_to")
        if assigned_to not in (ASSIGNED_SHARED, Receipt.USER_1, Receipt.USER_2):
            assigned_to = ASSIGNED_SHARED

        normalized_items.append(
            {
                "name": item.get("name", "Item"),
                "quantity": item.get("quantity"),
                "unit_price": item.get("unit_price"),
                "total_price": item.get("total_price"),
                "assigned_to": assigned_to,
            }
        )
    return normalized_items


def _item_amount(item):
    total_price = _to_decimal(item.get("total_price"))
    if total_price is not None:
        return total_price

    quantity = _to_decimal(item.get("quantity"))
    unit_price = _to_decimal(item.get("unit_price"))
    if quantity is not None and unit_price is not None:
        return (quantity * unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return Decimal("0.00")


def _receipt_effective_total(receipt: Receipt) -> Decimal:
    if receipt.total is not None:
        return receipt.total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    items_total = sum((_item_amount(item) for item in (receipt.items or [])), Decimal("0.00"))
    if items_total > Decimal("0.00"):
        return items_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    subtotal = receipt.subtotal or Decimal("0.00")
    tax = receipt.tax or Decimal("0.00")
    tip = receipt.tip or Decimal("0.00")
    computed = subtotal + tax + tip
    return computed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calculate_balances(receipts):
    paid_totals = {
        Receipt.USER_1: Decimal("0.00"),
        Receipt.USER_2: Decimal("0.00"),
    }
    owed_totals = {
        Receipt.USER_1: Decimal("0.00"),
        Receipt.USER_2: Decimal("0.00"),
    }

    for receipt in receipts:
        receipt_total = _receipt_effective_total(receipt)
        covered_by_items = Decimal("0.00")
        for item in receipt.items or []:
            amount = _item_amount(item)
            if amount <= Decimal("0.00"):
                continue

            covered_by_items += amount
            assigned_to = item.get("assigned_to", ASSIGNED_SHARED)
            if assigned_to == Receipt.USER_1:
                owed_totals[Receipt.USER_1] += amount
            elif assigned_to == Receipt.USER_2:
                owed_totals[Receipt.USER_2] += amount
            else:
                half = (amount / 2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                owed_totals[Receipt.USER_1] += half
                owed_totals[Receipt.USER_2] += amount - half

        paid_totals[receipt.uploaded_by] += receipt_total

        remainder = receipt_total - covered_by_items
        if remainder != Decimal("0.00"):
            half = (remainder / 2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            owed_totals[Receipt.USER_1] += half
            owed_totals[Receipt.USER_2] += remainder - half

    net_balances = {
        Receipt.USER_1: (paid_totals[Receipt.USER_1] - owed_totals[Receipt.USER_1]).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
        Receipt.USER_2: (paid_totals[Receipt.USER_2] - owed_totals[Receipt.USER_2]).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
    }
    return net_balances


def _sum_by_user(queryset):
    totals = {
        Receipt.USER_1: Decimal("0.00"),
        Receipt.USER_2: Decimal("0.00"),
    }

    for receipt in queryset:
        totals[receipt.uploaded_by] += _receipt_effective_total(receipt)

    totals[Receipt.USER_1] = totals[Receipt.USER_1].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    totals[Receipt.USER_2] = totals[Receipt.USER_2].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return totals


def _build_month_summary(queryset, start_date, end_date):
    totals = _sum_by_user(queryset)
    summary = {
        "month_label": start_date.strftime("%B %Y"),
        "start_date": start_date,
        "end_date": end_date,
        "totals": {
            "user_1": float(totals[Receipt.USER_1]),
            "user_2": float(totals[Receipt.USER_2]),
            "combined": float(totals[Receipt.USER_1] + totals[Receipt.USER_2]),
        },
        "receipt_count": queryset.count(),
    }
    return summary, totals


def _month_start_with_offset(reference_start: date, month_offset: int) -> date:
    month_index = (reference_start.year * 12 + reference_start.month - 1) + month_offset
    year, month_zero_index = divmod(month_index, 12)
    return date(year, month_zero_index + 1, 1)


def _month_end(month_start: date) -> date:
    next_month_start = _month_start_with_offset(month_start, 1)
    return next_month_start - timedelta(days=1)


def _build_settlement(net_balances, household: HouseholdSession):
    if net_balances[Receipt.USER_1] == Decimal("0.00") and net_balances[Receipt.USER_2] == Decimal("0.00"):
        return {
            "payer": "",
            "payer_name": "",
            "payee": "",
            "payee_name": "",
            "amount": 0.0,
            "message": "No transfer needed. Spending is currently balanced.",
        }

    if net_balances[Receipt.USER_1] > net_balances[Receipt.USER_2]:
        payer = Receipt.USER_2
        payee = Receipt.USER_1
        amount_to_transfer = min(
            net_balances[Receipt.USER_1],
            net_balances[Receipt.USER_2].copy_abs(),
        )
    else:
        payer = Receipt.USER_1
        payee = Receipt.USER_2
        amount_to_transfer = min(
            net_balances[Receipt.USER_2],
            net_balances[Receipt.USER_1].copy_abs(),
        )

    amount_to_transfer = amount_to_transfer.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if amount_to_transfer <= Decimal("0.00"):
        return {
            "payer": "",
            "payer_name": "",
            "payee": "",
            "payee_name": "",
            "amount": 0.0,
            "message": "No transfer needed. Spending is currently balanced.",
        }

    payer_name = household.name_for_code(payer)
    payee_name = household.name_for_code(payee)

    return {
        "payer": payer,
        "payer_name": payer_name,
        "payee": payee,
        "payee_name": payee_name,
        "amount": float(amount_to_transfer),
        "message": f"{payer_name} should pay {payee_name} {amount_to_transfer:.2f}.",
    }


def _build_notifications(settlement, currency: str, household: HouseholdSession):
    amount = settlement["amount"]
    members = household.member_names()

    if amount <= 0:
        return [
            {
                "user": members[Receipt.USER_1],
                "message": "You are all settled up for the current month.",
                "read": False,
            },
            {
                "user": members[Receipt.USER_2],
                "message": "You are all settled up for the current month.",
                "read": False,
            },
        ]

    payer_name = settlement["payer_name"]
    payee_name = settlement["payee_name"]
    return [
        {
            "user": payer_name,
            "message": f"Payment due: send {amount:.2f} {currency} to {payee_name}.",
            "read": False,
        },
        {
            "user": payee_name,
            "message": f"Incoming payment: receive {amount:.2f} {currency} from {payer_name}.",
            "read": False,
        },
    ]


def _latest_notifications_by_user(household: HouseholdSession):
    notifications = []
    for user_code, user_name in household.member_names().items():
        record = household.notifications.filter(user_code=user_code).order_by("-created_at").first()
        if not record:
            continue
        notifications.append(
            {
                "user": user_name,
                "message": record.message,
                "read": record.read,
            }
        )
    return notifications


def _build_session_state(household: HouseholdSession | None, user_code: str | None):
    if not household or not user_code:
        return {
            "user": None,
            "user_name": None,
            "household_code": None,
            "household_name": None,
            "session_token": None,
        }

    return {
        "user": user_code,
        "user_name": household.name_for_code(user_code),
        "household_code": household.code,
        "household_name": household.household_name,
        "session_token": _build_session_token(household, user_code),
        "members": household.member_names(),
    }


@method_decorator(csrf_exempt, name="dispatch")
class HouseholdCreateView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = HouseholdCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        household = HouseholdSession(
            household_name=serializer.validated_data["household_name"].strip(),
            member_1_name=serializer.validated_data["member_1_name"].strip(),
            member_2_name=serializer.validated_data["member_2_name"].strip(),
        )
        household.set_passcode(serializer.validated_data["passcode"])
        household.save()

        request.session["household_id"] = household.id
        request.session["user_code"] = Receipt.USER_1
        request.session.cycle_key()

        payload = _build_session_state(household, Receipt.USER_1)
        response_serializer = SessionStateSerializer(data=payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.validated_data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class ReceiptAnalyzeView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        household, user_code = _session_context(request)
        if not household or not user_code:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        upload_serializer = ReceiptUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)

        image = upload_serializer.validated_data["image"]
        image_bytes = image.read()
        mime_type = image.content_type or "image/jpeg"

        try:
            analysis = analyze_receipt_image(image_bytes=image_bytes, mime_type=mime_type)
        except ReceiptAnalysisError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = ReceiptAnalysisSerializer(data=analysis)
        output_serializer.is_valid(raise_exception=True)
        parsed_analysis = output_serializer.validated_data
        expense_date = _parse_receipt_date(parsed_analysis.get("receipt_date")) or timezone.localdate()
        image.seek(0)

        receipt = Receipt.objects.create(
            household=household,
            uploaded_by=user_code,
            image=image,
            expense_date=expense_date,
            vendor=parsed_analysis.get("vendor", ""),
            currency=parsed_analysis.get("currency") or "USD",
            subtotal=_to_decimal(parsed_analysis.get("subtotal")),
            tax=_to_decimal(parsed_analysis.get("tax")),
            tip=_to_decimal(parsed_analysis.get("tip")),
            total=_to_decimal(parsed_analysis.get("total")),
            items=_normalize_receipt_items(parsed_analysis.get("items", [])),
            raw_text=parsed_analysis.get("raw_text", ""),
            is_saved=False,
        )

        receipt_serializer = ReceiptRecordSerializer(receipt)
        return Response({"receipt": receipt_serializer.data}, status=status.HTTP_201_CREATED)


class ReceiptDashboardView(APIView):
    def get(self, request, *args, **kwargs):
        household, user_code = _session_context(request)
        if not household or not user_code:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        today = timezone.localdate()
        current_start = today.replace(day=1)
        last_end = current_start - timedelta(days=1)
        last_start = last_end.replace(day=1)

        saved_receipts = household.receipts.filter(is_saved=True)
        current_month_qs = saved_receipts.filter(expense_date__range=(current_start, today))
        last_month_qs = saved_receipts.filter(expense_date__range=(last_start, last_end))

        current_month, current_totals = _build_month_summary(current_month_qs, current_start, today)
        last_month, _ = _build_month_summary(last_month_qs, last_start, last_end)

        unsettled_current_month_qs = current_month_qs.filter(settled_at__isnull=True)
        net_balances = _calculate_balances(unsettled_current_month_qs)
        settlement = _build_settlement(net_balances, household)
        currency = (
            unsettled_current_month_qs.exclude(currency__exact="")
            .values_list("currency", flat=True)
            .first()
            or current_month_qs.exclude(currency__exact="").values_list("currency", flat=True).first()
            or "USD"
        )
        if unsettled_current_month_qs.exists():
            notifications = _build_notifications(settlement, currency, household)
        else:
            notifications = _latest_notifications_by_user(household) or _build_notifications(settlement, currency, household)
        recent_receipts = saved_receipts[:4]

        payload = {
            "household_code": household.code,
            "household_name": household.household_name,
            "current_user": user_code,
            "current_user_name": household.name_for_code(user_code),
            "members": household.member_names(),
            "current_date": today,
            "current_month": current_month,
            "last_month": last_month,
            "settlement": settlement,
            "notifications": notifications,
            "recent_receipts": ReceiptRecordSerializer(recent_receipts, many=True).data,
        }

        serializer = DashboardSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ReceiptExpensesOverviewView(APIView):
    def get(self, request, *args, **kwargs):
        household, _ = _session_context(request)
        if not household:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        today = timezone.localdate()
        current_start = today.replace(day=1)
        last_end = current_start - timedelta(days=1)
        last_start = last_end.replace(day=1)

        saved_receipts = household.receipts.filter(is_saved=True)
        current_month_qs = saved_receipts.filter(expense_date__range=(current_start, today))
        last_month_qs = saved_receipts.filter(expense_date__range=(last_start, last_end))

        current_month, _ = _build_month_summary(current_month_qs, current_start, today)
        last_month, _ = _build_month_summary(last_month_qs, last_start, last_end)

        six_month_trend = []
        for offset in range(-5, 1):
            month_start = _month_start_with_offset(current_start, offset)
            month_end = today if offset == 0 else _month_end(month_start)
            month_qs = saved_receipts.filter(expense_date__range=(month_start, month_end))
            month_summary, _ = _build_month_summary(month_qs, month_start, month_end)
            six_month_trend.append(month_summary)

        payload = {
            "household_code": household.code,
            "household_name": household.household_name,
            "current_date": today,
            "members": household.member_names(),
            "current_month": current_month,
            "last_month": last_month,
            "six_month_trend": six_month_trend,
        }

        serializer = ExpensesOverviewSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class HouseholdSettleView(APIView):
    def post(self, request, *args, **kwargs):
        household, _ = _session_context(request)
        if not household:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        today = timezone.localdate()
        current_start = today.replace(day=1)
        open_receipts = household.receipts.filter(
            is_saved=True,
            settled_at__isnull=True,
            expense_date__range=(current_start, today),
        )

        net_balances = _calculate_balances(open_receipts)
        settlement = _build_settlement(net_balances, household)
        currency = (
            open_receipts.exclude(currency__exact="")
            .values_list("currency", flat=True)
            .first()
            or "USD"
        )

        with transaction.atomic():
            open_receipts.update(settled_at=timezone.now())

            if settlement["amount"] > 0:
                payer = settlement["payer"]
                payee = settlement["payee"]
                amount = settlement["amount"]
                payer_message = (
                    f"Settlement completed: You paid {amount:.2f} {currency} to {household.name_for_code(payee)}."
                )
                payee_message = (
                    f"Settlement completed: You received {amount:.2f} {currency} from {household.name_for_code(payer)}."
                )
            else:
                payer_message = "Settlement completed: No payment was required."
                payee_message = "Settlement completed: No payment was required."

            HouseholdNotification.objects.create(
                household=household,
                user_code=Receipt.USER_1,
                message=payer_message if Receipt.USER_1 == settlement.get("payer") else payee_message,
                read=False,
            )
            HouseholdNotification.objects.create(
                household=household,
                user_code=Receipt.USER_2,
                message=payer_message if Receipt.USER_2 == settlement.get("payer") else payee_message,
                read=False,
            )

        notifications = _latest_notifications_by_user(household)
        response_payload = {
            "detail": "Current month expenses settled and notifications sent.",
            "settlement": settlement,
            "notifications": notifications,
        }
        serializer = SettleHouseholdResponseSerializer(data=response_payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class ManualExpenseCreateView(APIView):
    def post(self, request, *args, **kwargs):
        household, user_code = _session_context(request)
        if not household or not user_code:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ManualExpenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        total = _to_decimal(payload.get("total"))
        if total is None:
            return Response({"detail": "Total is required."}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = _to_decimal(payload.get("subtotal"))
        if subtotal is None:
            subtotal = total

        tax = _to_decimal(payload.get("tax"))
        tip = _to_decimal(payload.get("tip"))
        currency = (payload.get("currency") or "USD").strip().upper()
        expense_date = payload.get("expense_date") or timezone.localdate()

        receipt = Receipt.objects.create(
            household=household,
            uploaded_by=user_code,
            image=None,
            expense_date=expense_date,
            vendor=payload.get("vendor", "").strip(),
            currency=currency or "USD",
            subtotal=subtotal,
            tax=tax,
            tip=tip,
            total=total,
            items=_normalize_receipt_items(payload.get("items", [])),
            raw_text=payload.get("notes", "").strip(),
            is_saved=True,
        )

        output_serializer = ReceiptRecordSerializer(receipt)
        return Response({"receipt": output_serializer.data}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name="dispatch")
class ReceiptItemAssignmentsView(APIView):
    def patch(self, request, receipt_id, *args, **kwargs):
        household, _ = _session_context(request)
        if not household:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        receipt = household.receipts.filter(id=receipt_id).first()
        if not receipt:
            return Response({"detail": "Receipt not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReceiptItemAssignmentsUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = list(receipt.items or [])
        for assignment in serializer.validated_data["assignments"]:
            index = assignment["index"]
            if index >= len(items):
                return Response(
                    {"detail": f"Item index {index} is out of range."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item = dict(items[index])
            item["assigned_to"] = assignment["assigned_to"]
            items[index] = item

        receipt.items = _normalize_receipt_items(items)
        receipt.is_saved = True
        receipt.save(update_fields=["items", "is_saved"])

        output_serializer = ReceiptRecordSerializer(receipt)
        return Response({"receipt": output_serializer.data}, status=status.HTTP_200_OK)


class ReceiptAnalysesView(APIView):
    def get(self, request, *args, **kwargs):
        household, _ = _session_context(request)
        if not household:
            return Response({"detail": "Authentication required. Login first."}, status=status.HTTP_401_UNAUTHORIZED)

        analyses = household.receipts.all()
        payload = {"analyses": ReceiptRecordSerializer(analyses, many=True).data}
        serializer = ReceiptAnalysesSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class SessionLoginView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = SessionLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        household_name = serializer.validated_data["household_name"].strip()
        name = serializer.validated_data["name"]
        passcode = serializer.validated_data["passcode"]

        matches = HouseholdSession.objects.filter(household_name__iexact=household_name)
        if not matches.exists():
            return Response({"detail": "Household name not found."}, status=status.HTTP_404_NOT_FOUND)
        if matches.count() > 1:
            return Response(
                {"detail": "Multiple households found with this name. Rename one and try again."},
                status=status.HTTP_409_CONFLICT,
            )
        household = matches.first()

        if not household.verify_passcode(passcode):
            return Response({"detail": "Invalid passcode."}, status=status.HTTP_401_UNAUTHORIZED)

        user_code = household.resolve_user_code_from_name(name)
        if not user_code:
            return Response(
                {
                    "detail": f"Name not recognized. Use {household.member_1_name} or {household.member_2_name}."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.session["household_id"] = household.id
        request.session["user_code"] = user_code
        request.session.cycle_key()

        payload = _build_session_state(household, user_code)
        response_serializer = SessionStateSerializer(data=payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class SessionLogoutView(APIView):
    def post(self, request, *args, **kwargs):
        request.session.flush()
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class SessionMeView(APIView):
    def get(self, request, *args, **kwargs):
        household, user_code = _session_context(request)
        payload = _build_session_state(household, user_code)
        serializer = SessionStateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
