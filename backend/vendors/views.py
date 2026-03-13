from django.utils import timezone
from django.utils.text import slugify
from django.db.models import Sum
from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Vendor, VendorApplication
from orders.models import OrderItem
from .serializers import (
    VendorSerializer,
    VendorApplicationSerializer,
    VendorApplicationReviewSerializer,
)


class VendorListView(generics.ListAPIView):
    """GET /api/vendors/  — list all active approved vendors."""
    serializer_class = VendorSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Vendor.objects.filter(status='approved')


class VendorDetailView(generics.RetrieveAPIView):
    """GET /api/vendors/<pk>/  — public vendor profile."""
    serializer_class = VendorSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Vendor.objects.filter(status='approved')


class ApplyAsVendorView(generics.CreateAPIView):
    """
    POST /api/vendors/apply/
    Any registered user who sells natural products can apply to
    collaborate with NativeGlow.
    """
    serializer_class = VendorApplicationSerializer
    permission_classes = (permissions.AllowAny,)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        if not user:
            contact_email = serializer.validated_data.get('contact_email', '').strip().lower()
            username_base = contact_email.split('@')[0][:120] or 'seller'
            username = username_base
            index = 2
            while User.objects.filter(username=username).exclude(email=contact_email).exists():
                username = f'{username_base[:100]}_{index}'
                index += 1
            user, _ = User.objects.get_or_create(
                email=contact_email,
                defaults={'username': username},
            )
            if not user.has_usable_password():
                user.set_unusable_password()
                user.save(update_fields=['password'])
        serializer.save(user=user)


class AdminVendorApplicationListView(generics.ListAPIView):
    """GET /api/vendors/applications/?status=pending  — admin review queue."""

    serializer_class = VendorApplicationSerializer
    permission_classes = (permissions.IsAdminUser,)

    def get_queryset(self):
        qs = VendorApplication.objects.all()
        status_value = self.request.query_params.get('status')
        if status_value:
            qs = qs.filter(status=status_value)
        return qs


def _build_unique_vendor_slug(brand_name):
    base_slug = slugify(brand_name) or 'vendor'
    slug = base_slug
    index = 2
    while Vendor.objects.filter(slug=slug).exists():
        slug = f'{base_slug}-{index}'
        index += 1
    return slug


class MyApplicationView(generics.RetrieveAPIView):
    """GET /api/vendors/my-application/  — check own latest application status."""
    serializer_class = VendorApplicationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return VendorApplication.objects.filter(
            user=self.request.user
        ).order_by('-applied_at').first()

    def get(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            return Response(
                {'detail': 'No application found.'}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(VendorApplicationSerializer(obj).data)


class ReviewApplicationView(APIView):
    """
    PUT /api/vendors/applications/<pk>/review/
    Admin-only: approve or reject a vendor application.
    When approved, a VendorProfile is created and user.is_vendor is set to True.
    """
    permission_classes = (permissions.IsAdminUser,)

    def put(self, request, pk):
        try:
            application = VendorApplication.objects.get(pk=pk)
        except VendorApplication.DoesNotExist:
            return Response(
                {'detail': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = VendorApplicationReviewSerializer(
            application, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save(reviewed_at=timezone.now())

        if application.status == 'approved':
            vendor, created = Vendor.objects.get_or_create(
                user=application.user,
                defaults={
                    'brand_name': application.brand_name,
                    'slug': _build_unique_vendor_slug(application.brand_name),
                    'description': application.product_types,
                    'product_types': application.product_types,
                    'city': 'TBD',
                    'state': 'TBD',
                    'phone': application.contact_phone or 'N/A',
                    'contact_email': application.contact_email,
                    'status': 'approved',
                },
            )
            if not created:
                vendor.brand_name = application.brand_name
                vendor.description = application.product_types
                vendor.product_types = application.product_types
                vendor.contact_email = application.contact_email
                if application.contact_phone:
                    vendor.phone = application.contact_phone
                vendor.status = 'approved'
                vendor.is_natural_certified = True
                vendor.save()

        return Response(VendorApplicationSerializer(application).data)


class MyVendorAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        vendor = getattr(request.user, 'vendor_profile', None)
        if not vendor or vendor.status != 'approved':
            return Response({'detail': 'Approved vendor account required.'}, status=status.HTTP_403_FORBIDDEN)

        vendor_items = OrderItem.objects.filter(product__vendor=vendor)
        gross = vendor_items.aggregate(total=Sum('line_total'))['total'] or Decimal('0.00')
        qty = vendor_items.aggregate(total=Sum('quantity'))['total'] or 0
        rate = vendor.commission_rate or Decimal('0.00')
        service_fee = (gross * rate) / 100
        payout = gross - service_fee

        top_products_qs = (
            vendor_items.values('product_title')
            .annotate(
                total_qty=Sum('quantity'),
                gross_sales=Sum('line_total'),
            )
            .order_by('-gross_sales')[:5]
        )

        top_products = []
        for row in top_products_qs:
            row_gross = row.get('gross_sales') or Decimal('0.00')
            row_fee = (row_gross * rate) / 100
            top_products.append(
                {
                    'product_title': row.get('product_title'),
                    'total_qty': row.get('total_qty', 0),
                    'gross_sales': str(row_gross),
                    'service_fee': str(row_fee.quantize(Decimal('0.01'))),
                }
            )

        return Response(
            {
                'vendor': vendor.brand_name,
                'commission_rate': str(vendor.commission_rate),
                'gross_sales': str(gross),
                'service_fee': str(service_fee.quantize(Decimal('0.01'))),
                'estimated_payout': str(payout.quantize(Decimal('0.01'))),
                'items_sold': qty,
                'top_products': top_products,
            }
        )
