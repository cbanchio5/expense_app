from django.urls import path

from .views import (
    HouseholdCreateView,
    HouseholdSettleView,
    ManualExpenseCreateView,
    ReceiptAnalyzeView,
    ReceiptBulkAnalyzeView,
    ReceiptAnalysesView,
    ReceiptDashboardView,
    ReceiptDeleteView,
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
    path("analyze/bulk/", ReceiptBulkAnalyzeView.as_view(), name="receipt-analyze-bulk"),
    path("manual/", ManualExpenseCreateView.as_view(), name="expense-manual-create"),
    path("analyses/", ReceiptAnalysesView.as_view(), name="receipt-analyses"),
    path("dashboard/", ReceiptDashboardView.as_view(), name="receipt-dashboard"),
    path("expenses/", ReceiptExpensesOverviewView.as_view(), name="receipt-expenses-overview"),
    path("<int:receipt_id>/", ReceiptDeleteView.as_view(), name="receipt-delete"),
    path("<int:receipt_id>/delete/", ReceiptDeleteView.as_view(), name="receipt-delete-post"),
    path("<int:receipt_id>/items/", ReceiptItemAssignmentsView.as_view(), name="receipt-item-assignments"),
    path("session/login/", SessionLoginView.as_view(), name="session-login"),
    path("session/logout/", SessionLogoutView.as_view(), name="session-logout"),
    path("session/me/", SessionMeView.as_view(), name="session-me"),
]
