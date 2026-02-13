from django.urls import path

from .views import (
    HouseholdCreateView,
    HouseholdSettleView,
    ManualExpenseCreateView,
    ReceiptAnalyzeView,
    ReceiptAnalysesView,
    ReceiptDashboardView,
    ReceiptExpensesOverviewView,
    ReceiptItemAssignmentsView,
    SessionLoginView,
    SessionLogoutView,
    SessionMeView,
)

urlpatterns = [
    path("households/create/", HouseholdCreateView.as_view(), name="household-create"),
    path("settle/", HouseholdSettleView.as_view(), name="household-settle"),
    path("analyze/", ReceiptAnalyzeView.as_view(), name="receipt-analyze"),
    path("manual/", ManualExpenseCreateView.as_view(), name="expense-manual-create"),
    path("analyses/", ReceiptAnalysesView.as_view(), name="receipt-analyses"),
    path("dashboard/", ReceiptDashboardView.as_view(), name="receipt-dashboard"),
    path("expenses/", ReceiptExpensesOverviewView.as_view(), name="receipt-expenses-overview"),
    path("<int:receipt_id>/items/", ReceiptItemAssignmentsView.as_view(), name="receipt-item-assignments"),
    path("session/login/", SessionLoginView.as_view(), name="session-login"),
    path("session/logout/", SessionLogoutView.as_view(), name="session-logout"),
    path("session/me/", SessionMeView.as_view(), name="session-me"),
]
