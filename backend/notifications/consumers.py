import json
from urllib.parse import parse_qs

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


class VendorNotificationConsumer(WebsocketConsumer):
    """WebSocket consumer for vendor-scoped real-time notifications."""

    def connect(self):
        self.vendor_group_name = None

        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)

        vendor_id = self._extract_vendor_id(query_params)
        if not vendor_id:
            self.close(code=4001)
            return

        self.vendor_group_name = f'vendor_{vendor_id}'
        async_to_sync(self.channel_layer.group_add)(self.vendor_group_name, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        if self.vendor_group_name:
            async_to_sync(self.channel_layer.group_discard)(self.vendor_group_name, self.channel_name)

    def receive(self, text_data=None, bytes_data=None):
        # Read-only notification socket.
        return

    def new_order_notification(self, event):
        payload = event.get('payload', {})
        self.send(text_data=json.dumps(payload))

    def _extract_vendor_id(self, query_params):
        token = (query_params.get('token') or [None])[0]
        if token:
            try:
                parsed = AccessToken(token)
                vendor_id = parsed.get('vendor_id') or parsed.get('user_id')
                if vendor_id:
                    return int(vendor_id)
            except (TokenError, ValueError, TypeError):
                pass

        raw_vendor_id = (query_params.get('vendor_id') or [None])[0]
        if raw_vendor_id and str(raw_vendor_id).isdigit():
            return int(raw_vendor_id)
        return None
