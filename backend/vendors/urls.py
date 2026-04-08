from django.urls import path
from .views import (
    VendorListView,
    VendorDetailView,
    VendorSiteDirectoryView,
    ApplyAsVendorView,
    MyApplicationView,
    MyVendorAnalyticsView,
    AdminVendorApplicationListView,
    ReviewApplicationView,
    VendorRegisterView,
    VendorLoginView,
    VendorApprovalStatusView,
    VendorProfileView,
    VendorMaintenanceListView,
    VendorMaintenancePayView,
)
from products.views import (
    VendorProductCreateView,
    VendorProductListView,
    VendorProductEditView,
    VendorProductDeleteView,
    VendorProductStatusView,
    VendorProductQuantityView,
    VendorProductDiscountView,
    VendorProductVisibilityView,
    VendorProductFeatureView,
    VendorProductReorderView,
)

urlpatterns = [
    path('site-urls/', VendorSiteDirectoryView.as_view(), name='vendor-site-urls'),

    # Vendor Authentication
    path('register/', VendorRegisterView.as_view(), name='vendor-register'),
    path('login/', VendorLoginView.as_view(), name='vendor-login'),
    path('approval-status/', VendorApprovalStatusView.as_view(), name='vendor-approval-status'),
    path('me/', VendorProfileView.as_view(), name='vendor-me'),
    path('me/update/', VendorProfileView.as_view(), name='vendor-me-update'),

    # Vendor Maintenance Fees
    path('maintenance/', VendorMaintenanceListView.as_view(), name='vendor-maintenance-list'),
    path('maintenance/<int:fee_id>/pay/', VendorMaintenancePayView.as_view(), name='vendor-maintenance-pay'),

    # Vendor Product Management
    path('products/add/', VendorProductCreateView.as_view(), name='vendor-product-create'),
    path('products/', VendorProductListView.as_view(), name='vendor-products-list'),
    path('products/<int:id>/edit/', VendorProductEditView.as_view(), name='vendor-product-edit'),
    path('products/<int:id>/delete/', VendorProductDeleteView.as_view(), name='vendor-product-delete'),
    path('products/<int:id>/status/', VendorProductStatusView.as_view(), name='vendor-product-status'),
    path('products/<int:id>/quantity/', VendorProductQuantityView.as_view(), name='vendor-product-quantity'),
    path('products/<int:id>/discount/', VendorProductDiscountView.as_view(), name='vendor-product-discount'),
    path('products/<int:id>/visibility/', VendorProductVisibilityView.as_view(), name='vendor-product-visibility'),
    path('products/<int:id>/feature/', VendorProductFeatureView.as_view(), name='vendor-product-feature'),
    path('products/reorder/', VendorProductReorderView.as_view(), name='vendor-product-reorder'),

    # Existing endpoints
    path('', VendorListView.as_view(), name='vendor-list'),
    path('<int:pk>/', VendorDetailView.as_view(), name='vendor-detail'),
    path('apply/', ApplyAsVendorView.as_view(), name='vendor-apply'),
    path('my-application/', MyApplicationView.as_view(), name='vendor-my-application'),
    path('my-analytics/', MyVendorAnalyticsView.as_view(), name='vendor-my-analytics'),
    path('applications/', AdminVendorApplicationListView.as_view(), name='vendor-application-list'),
    path(
        'applications/<int:pk>/review/',
        ReviewApplicationView.as_view(),
        name='vendor-application-review',
    ),
]
