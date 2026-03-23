"""
URL configuration for admin endpoints.

All routes are prefixed with /api/admin/ in the main urls.py
using: path('api/admin/', include('admins.urls'))
"""

from django.urls import path
from .views import (
    # Authentication
    AdminLoginView,
    AdminProfileView,
    # Vendor Management
    AdminVendorListView,
    AdminVendorDetailView,
    AdminVendorApproveView,
    AdminVendorDeactivateView,
    AdminVendorMaintenanceView,
    # Product Approval
    AdminProductListView,
    AdminProductDetailView,
    AdminProductApproveView,
    # Order & Sales Monitoring
    AdminOrderListView,
    AdminOrderDetailView,
    AdminMonthlySalesView,
    AdminVendorMonthlySalesView,
    # Maintenance Fees
    MaintenanceFeeListView,
    MaintenanceFeeGenerateView,
    MaintenanceFeeDetailView,
    MaintenanceFeeMarkPaidView,
    MaintenanceFeeSummaryView,
    AdminMaintenancePendingVerificationListView,
    AdminMaintenanceVerifyView,
    # Dashboard
    AdminDashboardStatsView,
    # Public Payment Details
    PlatformPaymentDetailsView,
)

urlpatterns = [
    # Authentication Endpoints
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('me/', AdminProfileView.as_view(), name='admin-profile'),

    # Vendor Management Endpoints
    path('vendors/', AdminVendorListView.as_view(), name='admin-vendors-list'),
    path('vendors/<int:id>/', AdminVendorDetailView.as_view(), name='admin-vendors-detail'),
    path('vendors/<int:id>/approve/', AdminVendorApproveView.as_view(), name='admin-vendors-approve'),
    path('vendors/<int:id>/deactivate/', AdminVendorDeactivateView.as_view(), name='admin-vendors-deactivate'),
    path('vendors/<int:id>/maintenance/', AdminVendorMaintenanceView.as_view(), name='admin-vendors-maintenance'),

    # Product Approval Endpoints
    path('products/', AdminProductListView.as_view(), name='admin-products-list'),
    path('products/<int:id>/', AdminProductDetailView.as_view(), name='admin-products-detail'),
    path('products/<int:id>/approve/', AdminProductApproveView.as_view(), name='admin-products-approve'),

    # Order & Sales Monitoring Endpoints (READ-ONLY)
    path('orders/', AdminOrderListView.as_view(), name='admin-orders-list'),
    path('orders/<int:id>/', AdminOrderDetailView.as_view(), name='admin-orders-detail'),
    path('sales/monthly/', AdminMonthlySalesView.as_view(), name='admin-sales-monthly'),
    path('sales/vendor/<int:id>/monthly/', AdminVendorMonthlySalesView.as_view(), name='admin-sales-vendor-monthly'),

    # Maintenance Fee Endpoints
    path('maintenance/', MaintenanceFeeListView.as_view(), name='admin-maintenance-list'),
    path('maintenance/generate/', MaintenanceFeeGenerateView.as_view(), name='admin-maintenance-generate'),
    path('maintenance/pending-verification/', AdminMaintenancePendingVerificationListView.as_view(), name='admin-maintenance-pending-verification'),
    path('maintenance/<int:id>/', MaintenanceFeeDetailView.as_view(), name='admin-maintenance-detail'),
    path('maintenance/<int:fee_id>/verify/', AdminMaintenanceVerifyView.as_view(), name='admin-maintenance-verify'),
    path('maintenance/<int:id>/mark-paid/', MaintenanceFeeMarkPaidView.as_view(), name='admin-maintenance-mark-paid'),
    path('maintenance/summary/', MaintenanceFeeSummaryView.as_view(), name='admin-maintenance-summary'),

    # Dashboard Statistics Endpoint
    path('dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),

    # Public Payment Details Endpoint (no auth required)
    path('payment-details/', PlatformPaymentDetailsView.as_view(), name='payment-details'),
]
