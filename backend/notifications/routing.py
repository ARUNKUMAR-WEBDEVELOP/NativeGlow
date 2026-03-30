from django.urls import path

from .consumers import VendorNotificationConsumer


websocket_urlpatterns = [
    path('ws/vendor/notifications/', VendorNotificationConsumer.as_asgi()),
]
