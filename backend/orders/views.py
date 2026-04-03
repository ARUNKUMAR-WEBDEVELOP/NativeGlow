from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import Order
from .payment import create_stub_payment_intent
from buyers.authentication import BuyerJWTAuthentication
from vendors.authentication import VendorJWTAuthentication
from .serializers import (
    OrderCreateSerializer,
    OrderReadSerializer,
    PaymentIntentSerializer,
    PublicOrderPlaceSerializer,
    PublicOrderTrackingSerializer,
    PublicOrderTrackingDetailSerializer,
    VendorOrderListSerializer,
    VendorOrderStatusUpdateSerializer,
    BuyerConfirmDeliverySerializer,
)


class OrderCreateView(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = OrderCreateSerializer


class MyOrderListView(generics.ListAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = OrderReadSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class MyOrderDetailView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = OrderReadSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderPaymentIntentView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = PaymentIntentSerializer

    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        order = Order.objects.filter(user=request.user, id=order_id).first()
        if not order:
            return response.Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        payment_intent = create_stub_payment_intent(order_id=order.id, amount=order.total)
        order.payment_provider = payment_intent['provider']
        order.payment_reference = payment_intent['reference']
        order.payment_status = payment_intent['status']
        order.save(update_fields=['payment_provider', 'payment_reference', 'payment_status'])

        serializer = self.get_serializer(
            {
                'order_id': order.id,
                'client_secret': payment_intent['client_secret'],
                'reference': payment_intent['reference'],
                'provider': payment_intent['provider'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
            }
        )
        return response.Response(serializer.data)


class PublicOrderPlaceView(generics.CreateAPIView):
    """
    POST /api/order/place/
    Public endpoint for buyer order placement (no login required).
    """
    permission_classes = (permissions.AllowAny,)
    authentication_classes = (BuyerJWTAuthentication,)
    serializer_class = PublicOrderPlaceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        order = serializer.instance
        self._notify_vendor_new_order(order)

        headers = self.get_success_headers(serializer.data)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _notify_vendor_new_order(self, order):
        vendor = order.vendor
        if not vendor:
            return

        product_name = order.product.name if order.product else 'N/A'
        payload = {
            'type': 'new_order',
            'order_code': order.order_code,
            'product_name': product_name,
            'quantity': order.quantity,
            'total_amount': float(order.total_amount),
            'buyer_name': order.buyer_name,
            'buyer_phone': order.buyer_phone,
            'buyer_address': order.buyer_address,
            'payment_method': (order.payment_method or '').upper(),
            'payment_reference': order.payment_reference,
            'timestamp': timezone.localtime(order.created_at).strftime('%Y-%m-%d %H:%M'),
        }

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f'vendor_{vendor.id}',
                    {
                        'type': 'new_order_notification',
                        'payload': payload,
                    },
                )
            except Exception:
                # Keep order flow resilient even if WebSocket push fails.
                pass

        if vendor.email:
            send_mail(
                subject=f'New Order Received - {order.order_code}',
                message=(
                    f'Order Code: {order.order_code}\n'
                    f'Product: {product_name}\n'
                    f'Quantity: {order.quantity}\n'
                    f'Total: Rs {order.total_amount}\n'
                    f'Buyer: {order.buyer_name}\n'
                    f'Phone: {order.buyer_phone}\n'
                    f'Address: {order.buyer_address}\n'
                    f'Payment Method: {(order.payment_method or "").upper()}\n'
                    f'Payment Ref: {order.payment_reference}'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[vendor.email],
                fail_silently=True,
            )


class BuyerOrderConfirmView(APIView):
    """
    PATCH /api/order/<order_code>/buyer-confirm/
    Buyer confirms delivery for own order.
    """

    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (BuyerJWTAuthentication,)

    def patch(self, request, order_code):
        buyer = getattr(request, 'buyer', None)
        order = Order.objects.filter(order_code=order_code, buyer=buyer).select_related('vendor').first()
        if not order:
            return response.Response(
                {'detail': 'Order not found for this buyer.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BuyerConfirmDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order.buyer_confirmed_delivery = True
        order.buyer_confirmed_at = timezone.now()
        order.buyer_confirmation_note = serializer.validated_data.get('note', '').strip()
        order.delivery_rating = serializer.validated_data.get('rating')
        order.order_status = 'delivered'
        order.status = 'delivered'
        if not order.delivered_at:
            order.delivered_at = timezone.now()
        order.save(
            update_fields=[
                'buyer_confirmed_delivery',
                'buyer_confirmed_at',
                'buyer_confirmation_note',
                'delivery_rating',
                'order_status',
                'status',
                'delivered_at',
                'updated_at',
            ]
        )

        self._send_vendor_confirmation_email(order)

        return response.Response(
            {
                'message': f'Buyer confirmed delivery for {order.order_code}',
                'order_code': order.order_code,
                'buyer_confirmed_delivery': order.buyer_confirmed_delivery,
            },
            status=status.HTTP_200_OK,
        )

    def _send_vendor_confirmation_email(self, order):
        vendor = order.vendor
        if not vendor or not vendor.email:
            return

        send_mail(
            subject=f'Buyer confirmed delivery for {order.order_code}',
            message=(
                f'Order {order.order_code} was marked delivered by buyer confirmation.\n\n'
                f'Buyer: {order.buyer_name}\n'
                f'Rating: {order.delivery_rating or "Not provided"}\n'
                f'Note: {order.buyer_confirmation_note or "No note"}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[vendor.email],
            fail_silently=True,
        )


class VendorOrderListView(generics.ListAPIView):
    """
    GET /api/vendor/orders/
    JWT-protected vendor endpoint to list own orders only.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)
    serializer_class = VendorOrderListSerializer

    def get_queryset(self):
        vendor_id = None
        if self.request.auth:
            vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
        if not vendor_id:
            return Order.objects.none()
        return Order.objects.filter(vendor_id=vendor_id).select_related('product').prefetch_related('product__images').order_by('-created_at')


class VendorOrderStatusUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/vendor/orders/<id>/status/
    JWT-protected vendor endpoint to update own order status.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)
    serializer_class = VendorOrderStatusUpdateSerializer
    lookup_field = 'id'

    def get_queryset(self):
        vendor_id = None
        if self.request.auth:
            vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
        if not vendor_id:
            return Order.objects.none()
        return Order.objects.filter(vendor_id=vendor_id)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


# ============================================================================
# PUBLIC ORDER TRACKING VIEWS (NO AUTHENTICATION)
# ============================================================================

class PublicOrderTrackingView(APIView):
    """
    GET /api/order/track/?phone=9876543210
    List all orders for a phone number (no authentication required).
    Returns: orders with order_code, product_name, vendor_name, quantity, amount, status, created_at
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        """Get all orders for a phone number."""
        phone = request.query_params.get('phone', '').strip()
        
        if not phone:
            return response.Response(
                {'detail': 'Phone number is required. Use ?phone=9876543210'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove non-digits and validate 10 digits
        phone_digits = ''.join(filter(str.isdigit, phone))
        if len(phone_digits) != 10:
            return response.Response(
                {'detail': 'Phone number must be 10 digits.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Search by phone
        orders = Order.objects.filter(
            buyer_phone__icontains=phone_digits
        ).select_related('product', 'vendor').prefetch_related('product__images').order_by('-created_at')
        
        if not orders.exists():
            return response.Response(
                {'detail': f'No orders found for phone number {phone}.', 'results': []},
                status=status.HTTP_200_OK
            )
        
        serializer = PublicOrderTrackingSerializer(orders, many=True)
        return response.Response({
            'count': len(serializer.data),
            'results': serializer.data,
        }, status=status.HTTP_200_OK)


class PublicOrderTrackingDetailView(APIView):
    """
    GET /api/order/track/<order_code>/
    Get single order detail by order code (no authentication required).
    Includes vendor contact details (WhatsApp) for buyer communication.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, order_code):
        """Retrieve order details by public order code."""
        order = Order.objects.filter(order_code=order_code).select_related(
            'product', 'vendor'
        ).prefetch_related('product__images').first()
        
        if not order:
            return response.Response(
                {'detail': f'Order {order_code} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PublicOrderTrackingDetailSerializer(order)
        return response.Response(serializer.data, status=status.HTTP_200_OK)
