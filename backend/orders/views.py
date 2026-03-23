from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Order
from .payment import create_stub_payment_intent
from .serializers import (
    OrderCreateSerializer,
    OrderReadSerializer,
    PaymentIntentSerializer,
    PublicOrderPlaceSerializer,
    PublicOrderTrackingSerializer,
    PublicOrderTrackingDetailSerializer,
    VendorOrderListSerializer,
    VendorOrderStatusUpdateSerializer,
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
    serializer_class = PublicOrderPlaceSerializer


class VendorOrderListView(generics.ListAPIView):
    """
    GET /api/vendor/orders/
    JWT-protected vendor endpoint to list own orders only.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
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
    authentication_classes = (JWTAuthentication,)
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
