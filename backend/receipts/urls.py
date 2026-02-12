from django.urls import path

from .views import (
    HouseholdCreateView,
    ReceiptAnalyzeView,
    ReceiptDashboardView,
    ReceiptItemAssignmentsView,
    SessionLoginView,
    SessionLogoutView,
    SessionMeView,
)

urlpatterns = [
    path("households/create/", HouseholdCreateView.as_view(), name="household-create"),
    path("analyze/", ReceiptAnalyzeView.as_view(), name="receipt-analyze"),
    path("dashboard/", ReceiptDashboardView.as_view(), name="receipt-dashboard"),
    path("<int:receipt_id>/items/", ReceiptItemAssignmentsView.as_view(), name="receipt-item-assignments"),
    path("session/login/", SessionLoginView.as_view(), name="session-login"),
    path("session/logout/", SessionLogoutView.as_view(), name="session-logout"),
    path("session/me/", SessionMeView.as_view(), name="session-me"),
]
