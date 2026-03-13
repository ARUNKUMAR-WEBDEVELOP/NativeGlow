from rest_framework import generics, permissions, response, status

from .models import Order
from .payment import create_stub_payment_intent
from .serializers import OrderCreateSerializer, OrderReadSerializer, PaymentIntentSerializer


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
