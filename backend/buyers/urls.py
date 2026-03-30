from django.urls import path

from .views import BuyerGoogleLoginView, BuyerMeView, BuyerMeUpdateView, BuyerOrderListView


urlpatterns = [
    path('google-login/', BuyerGoogleLoginView.as_view(), name='buyer-google-login'),
    path('me/', BuyerMeView.as_view(), name='buyer-me'),
    path('me/update/', BuyerMeUpdateView.as_view(), name='buyer-me-update'),
    path('orders/', BuyerOrderListView.as_view(), name='buyer-orders'),
]
