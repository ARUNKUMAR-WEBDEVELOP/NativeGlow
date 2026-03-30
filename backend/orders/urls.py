from django.urls import path

from .views import (
    OrderCreateView,
    MyOrderListView,
    MyOrderDetailView,
    OrderPaymentIntentView,
    PublicOrderPlaceView,
    PublicOrderTrackingView,
    PublicOrderTrackingDetailView,
    VendorOrderListView,
    VendorOrderStatusUpdateView,
    BuyerOrderConfirmView,
)

urlpatterns = [
    path('', OrderCreateView.as_view(), name='order-create'),
    path('place/', PublicOrderPlaceView.as_view(), name='order-place-public'),
    path('payment-intent/', OrderPaymentIntentView.as_view(), name='order-payment-intent'),
    path('my-orders/', MyOrderListView.as_view(), name='order-list'),
    path('my-orders/<int:pk>/', MyOrderDetailView.as_view(), name='order-detail'),
    path('track/', PublicOrderTrackingView.as_view(), name='order-track'),
    path('track/<str:order_code>/', PublicOrderTrackingDetailView.as_view(), name='order-track-detail'),
    path('<str:order_code>/buyer-confirm/', BuyerOrderConfirmView.as_view(), name='order-buyer-confirm'),
    path('vendor/', VendorOrderListView.as_view(), name='vendor-orders-list'),
    path('vendor/<int:id>/status/', VendorOrderStatusUpdateView.as_view(), name='vendor-order-status-update'),
]
