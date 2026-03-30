"""
URL configuration for nativeglow_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import os

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from orders.views import PublicOrderPlaceView, VendorOrderListView, VendorOrderStatusUpdateView, BuyerOrderConfirmView
from vendors.views import VendorRegisterView, VendorLoginView, VendorProfileView, VendorActivateView, VendorApprovalStatusView
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
    PublicVendorSiteView,
    PublicVendorSiteProductsView,
    PublicVendorSiteAboutView,
)


def root_status(_request):
    return JsonResponse(
        {
            'service': 'nativeglow-backend',
            'status': 'ok',
            'google_login_configured': bool(os.environ.get('GOOGLE_CLIENT_ID', '').strip()),
        }
    )

urlpatterns = [
    path('', root_status, name='root-status'),
    path('healthz/', root_status, name='healthz'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/vendor/register/', VendorRegisterView.as_view(), name='vendor-register-public'),
    path('api/vendor/login/', VendorLoginView.as_view(), name='vendor-login-public'),
    path('api/vendor/activate/', VendorActivateView.as_view(), name='vendor-activate-public'),
    path('api/vendor/approval-status/', VendorApprovalStatusView.as_view(), name='vendor-approval-status-public'),
    path('api/vendor/me/', VendorProfileView.as_view(), name='vendor-me-public'),
    path('api/vendor/products/add/', VendorProductCreateView.as_view(), name='vendor-product-create-public'),
    path('api/vendor/products/', VendorProductListView.as_view(), name='vendor-products-list-public'),
    path('api/vendor/products/<int:id>/edit/', VendorProductEditView.as_view(), name='vendor-product-edit-public'),
    path('api/vendor/products/<int:id>/delete/', VendorProductDeleteView.as_view(), name='vendor-product-delete-public'),
    path('api/vendor/products/<int:id>/status/', VendorProductStatusView.as_view(), name='vendor-product-status-public'),
    path('api/vendor/products/<int:id>/quantity/', VendorProductQuantityView.as_view(), name='vendor-product-quantity-public'),
    path('api/vendor/products/<int:id>/discount/', VendorProductDiscountView.as_view(), name='vendor-product-discount-public'),
    path('api/vendor/products/<int:id>/visibility/', VendorProductVisibilityView.as_view(), name='vendor-product-visibility-public'),
    path('api/vendor/products/<int:id>/feature/', VendorProductFeatureView.as_view(), name='vendor-product-feature-public'),
    path('api/vendor/products/reorder/', VendorProductReorderView.as_view(), name='vendor-product-reorder-public'),
    path('api/order/place/', PublicOrderPlaceView.as_view(), name='order-place-public'),
    path('api/order/<str:order_code>/buyer-confirm/', BuyerOrderConfirmView.as_view(), name='order-buyer-confirm-public'),
    path('api/site/<slug:vendor_slug>/', PublicVendorSiteView.as_view(), name='site-home-public'),
    path('api/site/<slug:vendor_slug>/products/', PublicVendorSiteProductsView.as_view(), name='site-products-public'),
    path('api/site/<slug:vendor_slug>/about/', PublicVendorSiteAboutView.as_view(), name='site-about-public'),
    path('api/vendor/orders/', VendorOrderListView.as_view(), name='vendor-orders-list'),
    path('api/vendor/orders/<int:id>/status/', VendorOrderStatusUpdateView.as_view(), name='vendor-order-status-update'),
    path('api/admin/', include('admins.urls')),
    path('api/buyers/', include('buyers.urls')),
    path('api/vendors/', include('vendors.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
]
