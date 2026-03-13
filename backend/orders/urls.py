from django.urls import path

from .views import OrderCreateView, MyOrderListView, MyOrderDetailView, OrderPaymentIntentView

urlpatterns = [
    path('', OrderCreateView.as_view(), name='order-create'),
    path('payment-intent/', OrderPaymentIntentView.as_view(), name='order-payment-intent'),
    path('my-orders/', MyOrderListView.as_view(), name='order-list'),
    path('my-orders/<int:pk>/', MyOrderDetailView.as_view(), name='order-detail'),
]
