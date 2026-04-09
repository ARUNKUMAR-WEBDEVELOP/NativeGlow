from rest_framework import status, permissions, exceptions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import DatabaseError
from django.db.models import Sum, Count, Q, F, DecimalField
from django.db.models.functions import Coalesce
from datetime import datetime
from decimal import Decimal
import secrets

from .models import AdminUser, MaintenanceFee, PlatformPaymentDetails
from .serializers import (
    AdminLoginSerializer, AdminProfileSerializer,
    AdminVendorListSerializer, AdminVendorDetailSerializer,
    AdminVendorApprovalSerializer, AdminVendorDeactivateSerializer,
    AdminVendorMaintenanceSerializer,
    MaintenanceFeeListSerializer, MaintenanceFeeDetailSerializer,
    MaintenanceFeeGenerateSerializer, MaintenanceFeeMarkPaidSerializer,
    MaintenanceFeeSummarySerializer,
    MaintenancePendingVerificationSerializer, MaintenancePaymentVerifySerializer,
    AdminProductListSerializer, AdminProductDetailSerializer,
    AdminProductApprovalSerializer,
    AdminOrderListSerializer, AdminOrderDetailSerializer, MonthlySalesSerializer,
    VendorMonthlySalesSerializer, AdminDashboardStatsSerializer,
    PlatformPaymentDetailsSerializer,
)
from .authentication import AdminJWTAuthentication
from vendors.models import Vendor, MaintenancePayment
from products.models import Product
from orders.models import Order


class AdminLoginView(APIView):
    """
    POST /api/admin/login/
    Authenticate an admin and return JWT tokens with admin role.
    
    Request body:
    {
        "email": "admin@example.com",
        "password": "securepass123"
    }
    
    Response (200):
    {
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "admin": {
            "id": 1,
            "full_name": "Admin User",
            "email": "admin@example.com",
            "is_superadmin": true
        }
    }
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        """Authenticate admin and issue JWT tokens with role claim."""
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        admin_user = serializer.validated_data.get('admin_user')

        # Generate JWT tokens with custom claims
        refresh = RefreshToken()
        refresh['admin_id'] = admin_user.id
        refresh['email'] = admin_user.email
        refresh['role'] = 'admin'
        refresh['is_superadmin'] = admin_user.is_superadmin

        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'admin': {
                    'id': admin_user.id,
                    'full_name': admin_user.full_name,
                    'email': admin_user.email,
                    'is_superadmin': admin_user.is_superadmin,
                }
            },
            status=status.HTTP_200_OK
        )


class AdminProfileView(APIView):
    """
    GET /api/admin/me/
    Get the authenticated admin's profile.
    
    Headers:
    Authorization: Bearer <access_token>
    
    Response (200):
    {
        "id": 1,
        "full_name": "Admin User",
        "email": "admin@example.com",
        "is_superadmin": true,
        "created_at": "2026-03-23T10:30:00Z"
    }
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """Retrieve the authenticated admin's profile."""
        try:
            # AdminJWTAuthentication attaches admin_user to request
            admin_user = getattr(request, 'admin_user', None)
            if not admin_user:
                raise exceptions.NotAuthenticated('No admin user attached to request')

            serializer = AdminProfileSerializer(admin_user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            raise exceptions.AuthenticationFailed(str(e))


# ============================================================================
# ADMIN VENDOR MONITORING VIEWS
# ============================================================================

class AdminVendorListView(APIView):
    """
    GET /api/admin/vendors/
    List all vendors with filtering and search capability.
    
    Query params:
    - status: pending / approved / inactive
    - search: search by business_name
    
    Response includes: id, full_name, business_name, email, city, whatsapp_number,
                       is_approved, is_active, maintenance_due, created_at,
                       total_products, total_orders, this_month_revenue, status
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """List all vendors with optional filtering."""
        try:
            queryset = Vendor.objects.all()

            # Filter by status
            status_filter = request.query_params.get('status')
            if status_filter == 'pending':
                queryset = queryset.filter(is_approved=False, is_active=True)
            elif status_filter == 'approved':
                queryset = queryset.filter(is_approved=True, is_active=True)
            elif status_filter == 'inactive':
                queryset = queryset.filter(is_active=False)

            # Search by business name
            search = request.query_params.get('search', '').strip()
            if search:
                queryset = queryset.filter(business_name__icontains=search)

            serializer = AdminVendorListSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while listing vendors.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while listing vendors.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminVendorDetailView(APIView):
    """
    GET /api/admin/vendors/<id>/
    Get full vendor profile with products and recent orders.
    
    Response includes vendor details + products list + recent 10 orders +
                   revenue metrics + order statistics
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request, id):
        """Retrieve full vendor details."""
        try:
            vendor = Vendor.objects.get(id=id)
        except Vendor.DoesNotExist:
            raise exceptions.NotFound(f'Vendor with id {id} not found.')

        serializer = AdminVendorDetailSerializer(vendor)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminVendorApproveView(APIView):
    """
    PATCH /api/admin/vendors/<id>/approve/
    Approve or reject a vendor application.
    
    Request body:
    {
        "approved": true,
        "reason": "Additional info (optional, required if approved=false)"
    }
    
    On approval: Send welcome email to vendor
    On rejection: Send rejection email with reason
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, id):
        """Approve or reject vendor."""
        try:
            vendor = Vendor.objects.get(id=id)
        except Vendor.DoesNotExist:
            raise exceptions.NotFound(f'Vendor with id {id} not found.')

        serializer = AdminVendorApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approved = serializer.validated_data.get('approved')
        reason = serializer.validated_data.get('reason', '')

        if approved:
            # Approve vendor
            vendor.is_approved = True
            vendor.site_status = 'active'
            vendor.site_activated_at = timezone.now()
            vendor.redirect_token = secrets.token_urlsafe(32)
            vendor.save()

            # Send approval email
            self._send_approval_email(vendor)

            return Response(
                {
                    'message': f'Vendor {vendor.business_name} approved successfully.',
                    'vendor_id': vendor.id,
                    'is_approved': True,
                    'vendor_slug': vendor.vendor_slug,
                    'redirect_url': f'/site/{vendor.vendor_slug}' if vendor.vendor_slug else '',
                },
                status=status.HTTP_200_OK
            )
        else:
            # Reject vendor
            vendor.is_approved = False
            vendor.save()

            # Send rejection email
            self._send_rejection_email(vendor, reason)

            return Response(
                {
                    'message': f'Vendor {vendor.business_name} rejected.',
                    'vendor_id': vendor.id,
                    'is_approved': False,
                    'reason': reason
                },
                status=status.HTTP_200_OK
            )

    def _send_approval_email(self, vendor):
        """Send vendor approval email."""
        try:
            subject = 'Your NativeGlow store is live!'
            store_url = f'https://nativeglow.com/site/{vendor.vendor_slug}'
            activation_url = f'https://nativeglow.com/vendor/activate?token={vendor.redirect_token}'
            message = f"""
Dear {vendor.full_name},

Great news. Your NativeGlow store is now live.

Store URL: {store_url}
One-time activation link: {activation_url}

Next steps to complete your vendor website setup:
1. Open the one-time activation link and sign in.
2. Upload your store logo and banner.
3. Add your brand story and social links.
4. Review your theme and publish product highlights.

Need help? Contact support@nativeglow.com

Best regards,
NativeGlow Admin Team
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.email], fail_silently=True)
        except Exception as e:
            print(f'Failed to send approval email: {e}')

    def _send_rejection_email(self, vendor, reason):
        """Send vendor rejection email."""
        try:
            subject = 'NativeGlow Vendor Application Decision'
            message = f"""
Dear {vendor.full_name},

Thank you for applying to be a vendor on NativeGlow. After reviewing your application, we regret to inform you that it has been declined.

Reason: {reason or 'Does not meet our current criteria.'}

If you have any questions or would like to reapply in the future, please contact us at support@nativeglow.app

Best regards,
NativeGlow Admin Team
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.email], fail_silently=True)
        except Exception as e:
            print(f'Failed to send rejection email: {e}')


class AdminVendorDeactivateView(APIView):
    """
    PATCH /api/admin/vendors/<id>/deactivate/
    Deactivate a vendor (vendor cannot login).
    
    Request body:
    {
        "reason": "Violation of natural product policy"
    }
    
    Sends notification email to vendor about deactivation.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, id):
        """Deactivate vendor account."""
        try:
            vendor = Vendor.objects.get(id=id)
        except Vendor.DoesNotExist:
            raise exceptions.NotFound(f'Vendor with id {id} not found.')

        serializer = AdminVendorDeactivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get('reason', '')

        vendor.is_active = False
        vendor.save()

        # Send deactivation email
        self._send_deactivation_email(vendor, reason)

        return Response(
            {
                'message': f'Vendor {vendor.business_name} deactivated.',
                'vendor_id': vendor.id,
                'is_active': False,
                'reason': reason
            },
            status=status.HTTP_200_OK
        )

    def _send_deactivation_email(self, vendor, reason):
        """Send vendor deactivation notification email."""
        try:
            subject = 'NativeGlow Vendor Account Deactivated'
            message = f"""
Dear {vendor.full_name},

Your NativeGlow vendor account has been deactivated by our admin team.

Reason: {reason}

If you believe this is a mistake or have questions, please contact us at support@nativeglow.app

Best regards,
NativeGlow Admin Team
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.email], fail_silently=True)
        except Exception as e:
            print(f'Failed to send deactivation email: {e}')


class AdminVendorMaintenanceView(APIView):
    """
    PATCH /api/admin/vendors/<id>/maintenance/
    Update vendor maintenance fee status.
    
    Request body:
    {
        "paid": true,
        "month": "2025-03"
    }
    
    When paid=true: Creates MaintenancePayment record + clears maintenance_due flag
    When paid=false: Sets maintenance_due=True for current month
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, id):
        """Update maintenance fee status."""
        try:
            vendor = Vendor.objects.get(id=id)
        except Vendor.DoesNotExist:
            raise exceptions.NotFound(f'Vendor with id {id} not found.')

        serializer = AdminVendorMaintenanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        paid = serializer.validated_data.get('paid')
        month_str = serializer.validated_data.get('month')

        # Parse month string (YYYY-MM)
        try:
            month_parts = month_str.split('-')
            year = int(month_parts[0])
            month = int(month_parts[1])
        except (ValueError, IndexError):
            raise exceptions.ValidationError('Month must be in format YYYY-MM (e.g., 2025-03)')

        if paid:
            # Create maintenance payment record
            maintenance_payment, created = MaintenancePayment.objects.update_or_create(
                vendor=vendor,
                month=month,
                year=year,
                defaults={
                    'amount_paid': 100,  # Standard monthly fee
                    'payment_date': timezone.now().date(),
                    'status': 'paid'
                }
            )

            # Clear maintenance_due flag
            vendor.maintenance_due = False
            vendor.save()

            message = f'Maintenance fee for {month_str} marked as PAID.'
        else:
            # Mark as pending/unpaid
            maintenance_payment, created = MaintenancePayment.objects.update_or_create(
                vendor=vendor,
                month=month,
                year=year,
                defaults={'status': 'pending'}
            )

            # Set maintenance_due flag
            vendor.maintenance_due = True
            vendor.save()

            message = f'Maintenance fee for {month_str} marked as PENDING/UNPAID.'

        return Response(
            {
                'message': message,
                'vendor_id': vendor.id,
                'month': month_str,
                'status': 'paid' if paid else 'pending',
                'maintenance_due': vendor.maintenance_due
            },
            status=status.HTTP_200_OK
        )


# ============================================================================
# MAINTENANCE FEE MANAGEMENT VIEWS
# ============================================================================

class MaintenanceFeeGenerateView(APIView):
    """
    POST /api/admin/maintenance/generate/
    Generate maintenance fees for ALL active vendors for a given month.
    
    Request body:
    {
        "month": "2025-03",
        "amount": 499
    }
    
    Creates MaintenanceFee record for each active vendor.
    Skips if record already exists for that vendor+month (no duplicates).
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def post(self, request):
        """Generate maintenance fees for all active vendors."""
        serializer = MaintenanceFeeGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        month = serializer.validated_data.get('month')
        amount = serializer.validated_data.get('amount')

        # Get all active vendors
        active_vendors = Vendor.objects.filter(is_active=True)

        created_count = 0
        skipped_count = 0

        for vendor in active_vendors:
            # Use get_or_create to avoid duplicates
            fee, created = MaintenanceFee.objects.get_or_create(
                vendor=vendor,
                month=month,
                defaults={'amount': amount}
            )

            if created:
                created_count += 1
            else:
                skipped_count += 1

        return Response(
            {
                'message': f'Maintenance fees generated for month {month}.',
                'created': created_count,
                'skipped': skipped_count,
                'total_vendors': active_vendors.count(),
                'amount_per_vendor': float(amount),
                'total_expected': float(amount * created_count)
            },
            status=status.HTTP_201_CREATED
        )


class MaintenanceFeeListView(APIView):
    """
    GET /api/admin/maintenance/
    List all maintenance fees with optional filtering.
    
    Query params:
    - month=2025-03
    - vendor_id=5
    - is_paid=false (or true)
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """List maintenance fees with filtering."""
        queryset = MaintenanceFee.objects.all()

        # Filter by month
        month = request.query_params.get('month')
        if month:
            queryset = queryset.filter(month=month)

        # Filter by vendor_id
        vendor_id = request.query_params.get('vendor_id')
        if vendor_id:
            try:
                vendor_id = int(vendor_id)
                queryset = queryset.filter(vendor_id=vendor_id)
            except ValueError:
                raise exceptions.ValidationError('vendor_id must be an integer.')

        # Filter by is_paid
        is_paid = request.query_params.get('is_paid')
        if is_paid:
            is_paid_bool = is_paid.lower() in ['true', 'yes', '1']
            queryset = queryset.filter(is_paid=is_paid_bool)

        serializer = MaintenanceFeeListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MaintenanceFeeDetailView(APIView):
    """
    GET /api/admin/maintenance/<id>/
    Get maintenance fee details.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request, id):
        """Retrieve maintenance fee details."""
        try:
            fee = MaintenanceFee.objects.get(id=id)
        except MaintenanceFee.DoesNotExist:
            raise exceptions.NotFound(f'Maintenance fee with id {id} not found.')

        serializer = MaintenanceFeeDetailSerializer(fee)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MaintenanceFeeMarkPaidView(APIView):
    """
    PATCH /api/admin/maintenance/<id>/mark-paid/
    Mark a maintenance fee as paid.
    
    Request body:
    {
        "payment_reference": "UTR123456789",
        "paid_on": "2025-03-10"
    }
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, id):
        """Mark maintenance fee as paid."""
        try:
            fee = MaintenanceFee.objects.get(id=id)
        except MaintenanceFee.DoesNotExist:
            raise exceptions.NotFound(f'Maintenance fee with id {id} not found.')

        serializer = MaintenanceFeeMarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_reference = serializer.validated_data.get('payment_reference')
        paid_on = serializer.validated_data.get('paid_on')

        fee.is_paid = True
        fee.paid_on = paid_on
        fee.payment_reference = payment_reference
        fee.save()

        return Response(
            {
                'message': f'Maintenance fee {id} marked as paid.',
                'fee_id': fee.id,
                'vendor': fee.vendor.business_name,
                'month': fee.month,
                'amount': float(fee.amount),
                'is_paid': True,
                'paid_on': fee.paid_on.isoformat(),
                'payment_reference': fee.payment_reference
            },
            status=status.HTTP_200_OK
        )


class MaintenanceFeeSummaryView(APIView):
    """
    GET /api/admin/maintenance/summary/
    Get maintenance fee summary by month.
    
    Query params (optional):
    - month=2025-03 (for single month)
    
    Returns:
    - total_vendors (count of vendors with fees in month)
    - total_expected (sum of all amounts)
    - total_collected (sum of paid amounts)
    - total_pending (sum of unpaid amounts)
    - collection_rate (percentage 0-100)
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """Get maintenance fee summary."""
        month_filter = request.query_params.get('month')

        queryset = MaintenanceFee.objects.all()
        if month_filter:
            queryset = queryset.filter(month=month_filter)

        # Get distinct months if not filtering by month
        if not month_filter:
            months = queryset.values('month').distinct().order_by('-month')
        else:
            months = [{'month': month_filter}]

        summaries = []
        for month_obj in months:
            month = month_obj['month']
            month_fees = queryset.filter(month=month)

            total_vendors = month_fees.values('vendor').distinct().count()
            total_expected = month_fees.aggregate(
                total=Coalesce(Sum('amount'), Decimal('0'))
            )['total']
            total_collected = month_fees.filter(is_paid=True).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0'))
            )['total']
            total_pending = total_expected - total_collected

            # Calculate collection rate
            if total_expected > 0:
                collection_rate = float((total_collected / total_expected) * 100)
            else:
                collection_rate = 0.0

            summaries.append({
                'month': month,
                'total_vendors': total_vendors,
                'total_expected': float(total_expected),
                'total_collected': float(total_collected),
                'total_pending': float(total_pending),
                'collection_rate': round(collection_rate, 2)
            })

        return Response(summaries, status=status.HTTP_200_OK)


# ============================================================================
# PRODUCT APPROVAL VIEWS
# ============================================================================

class AdminProductListView(APIView):
    """
    GET /api/admin/products/
    List all products from all vendors with filtering.
    
    Query params:
    - approval_status=pending/approved/rejected
    - vendor_id=5
    - category_type=face_wash
    
    Response includes: product name, vendor, category, price, status, availability
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """List products with filtering."""
        try:
            queryset = Product.objects.all()

            # Filter by approval status (maps to 'status' field)
            approval_status = request.query_params.get('approval_status')
            if approval_status:
                if approval_status not in ['pending', 'approved', 'rejected', 'active', 'draft']:
                    raise exceptions.ValidationError('Invalid approval_status value.')
                queryset = queryset.filter(status=approval_status)

            # Filter by vendor_id
            vendor_id = request.query_params.get('vendor_id')
            if vendor_id:
                try:
                    vendor_id = int(vendor_id)
                    queryset = queryset.filter(vendor_id=vendor_id)
                except ValueError:
                    raise exceptions.ValidationError('vendor_id must be an integer.')

            # Filter by category_type
            category_type = request.query_params.get('category_type')
            if category_type:
                queryset = queryset.filter(category_type=category_type)

            serializer = AdminProductListSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while listing products.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except exceptions.ValidationError:
            raise
        except Exception:
            return Response(
                {'detail': 'Something went wrong while listing products.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminProductDetailView(APIView):
    """
    GET /api/admin/products/<id>/
    Get full product details including ingredients, images, and vendor info.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request, id):
        """Retrieve product details."""
        try:
            product = Product.objects.get(id=id)
        except Product.DoesNotExist:
            raise exceptions.NotFound(f'Product with id {id} not found.')

        serializer = AdminProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminProductApproveView(APIView):
    """
    PATCH /api/admin/products/<id>/approve/
    Approve or reject a product with admin reasoning.
    
    Request body:
    {
        "status": "approved"
    }
    or
    {
        "status": "rejected",
        "reason": "Contains non-natural ingredients"
    }
    
    Sends email confirmation to vendor on approval/rejection.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, id):
        """Approve or reject product."""
        try:
            product = Product.objects.get(id=id)
        except Product.DoesNotExist:
            raise exceptions.NotFound(f'Product with id {id} not found.')

        serializer = AdminProductApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        reason = serializer.validated_data.get('reason', '')

        # Update product status
        product.status = new_status
        if new_status == 'rejected' and reason:
            product.admin_rejection_reason = reason

        product.save()

        # Send email notification to vendor
        if product.vendor:
            if new_status == 'approved':
                self._send_approval_email(product)
                message = f'Product "{product.title}" approved successfully.'
            else:
                self._send_rejection_email(product, reason)
                message = f'Product "{product.title}" rejected.'
        else:
            message = f'Product "{product.title}" status updated to {new_status}.'

        return Response(
            {
                'message': message,
                'product_id': product.id,
                'product_title': product.title,
                'status': product.status,
                'rejection_reason': product.admin_rejection_reason if new_status == 'rejected' else None
            },
            status=status.HTTP_200_OK
        )

    def _send_approval_email(self, product):
        """Send product approval email to vendor."""
        try:
            vendor = product.vendor
            subject = f'Product Approved: {product.title}'
            message = f"""
Dear {vendor.full_name},

Great news! Your product has been approved and is now live on NativeGlow.

Product Name: {product.title}
Category: {product.category_type}
Price: ₹{product.price}

Your customers can now discover and purchase this product from your store.

Dashboard: https://nativeglow.app/vendor/dashboard/products

Thank you for partnering with NativeGlow!

Best regards,
NativeGlow Admin Team
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.email], fail_silently=True)
        except Exception as e:
            print(f'Failed to send product approval email: {e}')

    def _send_rejection_email(self, product, reason):
        """Send product rejection email to vendor."""
        try:
            vendor = product.vendor
            subject = f'Product Needs Revision: {product.title}'
            message = f"""
Dear {vendor.full_name},

Thank you for submitting your product to NativeGlow. After review, we have some feedback:

Product Name: {product.title}
Reason: {reason or 'Does not meet our natural product standards.'}

Please review your product details and ingredients, then resubmit for approval.

Guidelines:
- Ensure all ingredients are natural/organic
- Provide accurate ingredient list
- Include proper product description
- Verify certification if claimed

For questions, contact: support@nativeglow.app

Best regards,
NativeGlow Admin Team
            """
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.email], fail_silently=True)
        except Exception as e:
            print(f'Failed to send product rejection email: {e}')


# ============================================================================
# ADMIN ORDER & SALES MONITORING VIEWS (READ-ONLY)
# ============================================================================

class AdminOrderListView(APIView):
    """
    GET /api/admin/orders/
    
    List all orders from all vendors with filtering options.
    Returns: order_id, buyer_name, product_name, vendor_name, quantity, total_amount, order_status, created_at
    
    Query Parameters:
    - ?status=pending|confirmed|shipped|delivered|cancelled
    - ?vendor_id=5
    - ?month=2025-03 (YYYY-MM format)
    
    Examples:
    GET /api/admin/orders/
    GET /api/admin/orders/?status=pending
    GET /api/admin/orders/?vendor_id=5
    GET /api/admin/orders/?month=2025-03&status=shipped
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """List all orders with filtering."""
        try:
            queryset = Order.objects.select_related('vendor').prefetch_related('items')

            # Filter by order status
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            # Filter by vendor
            vendor_id = request.query_params.get('vendor_id')
            if vendor_id:
                try:
                    queryset = queryset.filter(vendor_id=int(vendor_id))
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid vendor_id'}, status=status.HTTP_400_BAD_REQUEST)

            # Filter by month (YYYY-MM format)
            month = request.query_params.get('month')
            if month:
                try:
                    year, month_num = month.split('-')
                    queryset = queryset.filter(created_at__year=int(year), created_at__month=int(month_num))
                except (ValueError, AttributeError):
                    return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

            # Build order list with aggregated data
            orders_data = []
            for order in queryset.order_by('-created_at'):
                # Get primary product name (first item in order)
                product_name = ''
                if hasattr(order, 'items') and order.items.exists():
                    product_name = order.items.first().product.title

                orders_data.append({
                    'id': order.id,
                    'order_id': order.order_id,
                    'buyer_name': order.full_name or order.buyer_name or 'Unknown',
                    'product_name': product_name,
                    'vendor_name': order.vendor.business_name if order.vendor else 'Unknown',
                    'vendor_id': order.vendor.id if order.vendor else None,
                    'quantity': order.items.aggregate(Sum('quantity'))['quantity__sum'] or 0,
                    'total_amount': order.total_amount or Decimal('0'),
                    'payment_reference': order.payment_reference,
                    'order_status': order.status,
                    'created_at': order.created_at
                })

            serializer = AdminOrderListSerializer(orders_data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while listing orders.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while listing orders.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminOrderDetailView(APIView):
    """
    GET /api/admin/orders/<id>/

    Read-only full order details for admin modal.
    Includes buyer info, vendor contact, items, payment details, and timeline.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request, id):
        """Return full order detail for admin view-only modal."""
        try:
            order = Order.objects.select_related('vendor', 'user').prefetch_related('items__product').get(id=id)
        except Order.DoesNotExist:
            raise exceptions.NotFound(f'Order with id {id} not found.')

        items_data = []
        for item in order.items.all():
            items_data.append(
                {
                    'id': item.id,
                    'product_id': item.product.id if item.product else None,
                    'product_title': item.product_title,
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'line_total': item.line_total,
                }
            )

        quantity_total = order.items.aggregate(Sum('quantity'))['quantity__sum'] or order.quantity or 0

        timeline = [
            {
                'label': 'Order Placed',
                'status': 'pending',
                'timestamp': order.created_at,
            }
        ]
        if order.status and order.status != 'pending':
            timeline.append(
                {
                    'label': f'Current Status: {order.status.title()}',
                    'status': order.status,
                    'timestamp': order.updated_at,
                }
            )

        detail_data = {
            'id': order.id,
            'order_id': order.order_id,
            'status': order.status,
            'created_at': order.created_at,
            'updated_at': order.updated_at,

            'buyer_name': order.buyer_name or '',
            'buyer_phone': order.buyer_phone or '',
            'buyer_address': order.buyer_address or '',
            'buyer_pincode': order.buyer_pincode or '',
            'full_name': order.full_name or '',
            'email': order.email or '',
            'phone': order.phone or '',
            'address_line1': order.address_line1 or '',
            'address_line2': order.address_line2 or '',
            'city': order.city or '',
            'state': order.state or '',
            'pincode': order.pincode or '',
            'country': order.country or '',

            'vendor': {
                'id': order.vendor.id if order.vendor else None,
                'business_name': order.vendor.business_name if order.vendor else 'Unknown',
                'contact_name': order.vendor.full_name if order.vendor else '',
                'email': order.vendor.email if order.vendor else '',
                'phone': order.vendor.whatsapp_number if order.vendor else '',
            },
            'items': items_data,

            'quantity': quantity_total,
            'subtotal': order.subtotal or Decimal('0'),
            'shipping_fee': order.shipping_fee or Decimal('0'),
            'discount_total': order.discount_total or Decimal('0'),
            'total_amount': order.total_amount or Decimal('0'),

            'payment_method': order.payment_method or '',
            'payment_status': order.payment_status or '',
            'payment_reference': order.payment_reference or '',

            'timeline': timeline,
        }

        serializer = AdminOrderDetailSerializer(detail_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminMonthlySalesView(APIView):
    """
    GET /api/admin/sales/monthly/
    
    Return monthly sales summary across ALL vendors.
    Includes: month, total_orders, total_revenue, top_vendor, top_product
    
    Response format is optimized for charting:
    [
        {"month": "Jan-2025", "total_orders": 120, "total_revenue": 45000, "top_vendor": "Organic Farms", "top_product": "Face Wash"},
        {"month": "Feb-2025", "total_orders": 150, "total_revenue": 55000, ...}
    ]
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """Get monthly sales summary."""
        try:
            # Aggregate orders by month
            orders = Order.objects.filter(status__in=['confirmed', 'shipped', 'delivered']).select_related('vendor').prefetch_related('items')

            monthly_data = {}
            for order in orders:
                month_key = order.created_at.strftime('%b-%Y')  # "Jan-2025"

                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'month': month_key,
                        'total_orders': 0,
                        'total_revenue': Decimal('0'),
                        'vendor_revenue': {},
                        'product_revenue': {}
                    }

                monthly_data[month_key]['total_orders'] += 1
                monthly_data[month_key]['total_revenue'] += order.total_amount or Decimal('0')

                # Track vendor revenue
                vendor_name = order.vendor.business_name if order.vendor else 'Unknown'
                if vendor_name not in monthly_data[month_key]['vendor_revenue']:
                    monthly_data[month_key]['vendor_revenue'][vendor_name] = Decimal('0')
                monthly_data[month_key]['vendor_revenue'][vendor_name] += order.total_amount or Decimal('0')

                # Track product revenue
                for item in order.items.all():
                    product_name = item.product.title if hasattr(item, 'product') else 'Unknown'
                    if product_name not in monthly_data[month_key]['product_revenue']:
                        monthly_data[month_key]['product_revenue'][product_name] = Decimal('0')
                    monthly_data[month_key]['product_revenue'][product_name] += item.quantity * item.price

            # Format for response
            result = []
            for month_key in sorted(monthly_data.keys(), reverse=True):
                data = monthly_data[month_key]

                # Find top vendor
                top_vendor = max(data['vendor_revenue'].items(), key=lambda x: x[1], default=(None, None)) if data['vendor_revenue'] else (None, None)
                # Find top product
                top_product = max(data['product_revenue'].items(), key=lambda x: x[1], default=(None, None)) if data['product_revenue'] else (None, None)

                result.append({
                    'month': data['month'],
                    'total_orders': data['total_orders'],
                    'total_revenue': data['total_revenue'],
                    'top_vendor': top_vendor[0],
                    'top_product': top_product[0],
                    'top_vendor_revenue': top_vendor[1],
                    'top_product_revenue': top_product[1]
                })

            serializer = MonthlySalesSerializer(result, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while loading monthly sales.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while loading monthly sales.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminVendorMonthlySalesView(APIView):
    """
    GET /api/admin/sales/vendor/<id>/monthly/
    
    Return monthly sales breakdown for ONE specific vendor.
    Used when admin clicks on a vendor to see their performance.
    
    Per month: orders_count, total_revenue, avg_order_value
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request, id):
        """Get vendor's monthly sales breakdown."""
        try:
            try:
                vendor = Vendor.objects.get(id=id)
            except Vendor.DoesNotExist:
                raise exceptions.NotFound(f'Vendor with id {id} not found.')

            # Get all orders for this vendor
            orders = Order.objects.filter(vendor=vendor, status__in=['confirmed', 'shipped', 'delivered']).prefetch_related('items')

            monthly_data = {}
            for order in orders:
                month_key = order.created_at.strftime('%b-%Y')  # "Jan-2025"

                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'month': month_key,
                        'vendor_id': vendor.id,
                        'vendor_name': vendor.business_name,
                        'orders_count': 0,
                        'total_revenue': Decimal('0')
                    }

                monthly_data[month_key]['orders_count'] += 1
                monthly_data[month_key]['total_revenue'] += order.total_amount or Decimal('0')

            # Calculate averages and format
            result = []
            for month_key in sorted(monthly_data.keys(), reverse=True):
                data = monthly_data[month_key]
                avg_order_value = data['total_revenue'] / data['orders_count'] if data['orders_count'] > 0 else Decimal('0')

                result.append({
                    'month': data['month'],
                    'vendor_id': data['vendor_id'],
                    'vendor_name': data['vendor_name'],
                    'orders_count': data['orders_count'],
                    'total_revenue': data['total_revenue'],
                    'avg_order_value': avg_order_value
                })

            serializer = VendorMonthlySalesSerializer(result, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except exceptions.NotFound:
            raise
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while loading vendor monthly sales.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while loading vendor monthly sales.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminDashboardStatsView(APIView):
    """
    GET /api/admin/dashboard/stats/
    
    Return overall platform statistics for admin home page.
    
    Includes:
    - Vendor metrics: total, active, pending approvals
    - Product metrics: total, pending approvals, active
    - Order metrics (this month): total orders, total revenue
    - Maintenance fee metrics (this month): collected, pending count, pending amount
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """Get dashboard statistics."""
        try:
            now = timezone.now()
            current_month = now.month
            current_year = now.year

            # VENDOR METRICS
            total_vendors = Vendor.objects.count()
            active_vendors = Vendor.objects.filter(is_active=True, is_approved=True).count()
            pending_vendor_approvals = Vendor.objects.filter(is_approved=False).count()

            # PRODUCT METRICS
            total_products = Product.objects.count()
            pending_product_approvals = Product.objects.filter(status='pending').count()
            active_products = Product.objects.filter(status='approved', is_active=True).count()

            # ORDER METRICS (this month)
            total_orders_this_month = Order.objects.filter(
                created_at__year=current_year,
                created_at__month=current_month,
                status__in=['confirmed', 'shipped', 'delivered']
            ).count()

            revenue_this_month = Order.objects.filter(
                created_at__year=current_year,
                created_at__month=current_month,
                status__in=['confirmed', 'shipped', 'delivered']
            ).aggregate(
                total=Sum('total_amount', output_field=DecimalField())
            )['total'] or Decimal('0')

            # MAINTENANCE FEE METRICS (this month)
            current_month_str = now.strftime('%Y-%m')

            maintenance_collected = MaintenanceFee.objects.filter(
                month=current_month_str,
                is_paid=True
            ).aggregate(
                total=Sum('amount', output_field=DecimalField())
            )['total'] or Decimal('0')

            maintenance_pending = MaintenanceFee.objects.filter(
                month=current_month_str,
                is_paid=False
            )
            maintenance_pending_count = maintenance_pending.count()
            maintenance_pending_amount = maintenance_pending.aggregate(
                total=Sum('amount', output_field=DecimalField())
            )['total'] or Decimal('0')

            stats = {
                'total_vendors': total_vendors,
                'active_vendors': active_vendors,
                'pending_vendor_approvals': pending_vendor_approvals,
                'total_products': total_products,
                'pending_product_approvals': pending_product_approvals,
                'active_products': active_products,
                'total_orders_this_month': total_orders_this_month,
                'revenue_this_month': revenue_this_month,
                'maintenance_collected_this_month': maintenance_collected,
                'maintenance_pending_count': maintenance_pending_count,
                'maintenance_pending_amount': maintenance_pending_amount
            }

            serializer = AdminDashboardStatsSerializer(stats)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

# ============================================================================
# PUBLIC PAYMENT DETAILS VIEW
# ============================================================================

class PlatformPaymentDetailsView(APIView):
    """
    GET /api/admin/payment-details/
    
    Public endpoint (no authentication required).
    Returns the active NativeGlow payment details that vendors use to pay maintenance fees.
    
    Response (200):
    {
        "upi_id": "nativeglow@upi",
        "upi_name": "NativeGlow Platform",
        "bank_account_number": "XXXXXXXX",
        "bank_ifsc": "XXXXXXX",
        "bank_name": "Bank Name",
        "account_holder_name": "Account Holder"
    }
    
    Response (404): No active payment details configured.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Retrieve the active platform payment details."""
        try:
            payment_details = PlatformPaymentDetails.objects.get(is_active=True)
            serializer = PlatformPaymentDetailsSerializer(payment_details)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PlatformPaymentDetails.DoesNotExist:
            return Response(
                {'detail': 'No active payment details configured.'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================================================
# MAINTENANCE PAYMENT VERIFICATION ENDPOINTS
# ============================================================================

class AdminMaintenancePendingVerificationListView(APIView):
    """
    GET /api/admin/maintenance/pending-verification/
    
    AdminJWTRequired.
    Return all maintenance records where is_paid=True AND verified_by_admin=False.
    
    Includes: vendor name, month, amount, payment_mode, transaction ID,
              payment_screenshot URL, submitted_at
    
    Response (200):
    [
        {
            "id": 1,
            "vendor_id": 5,
            "vendor_name": "Organic Farms",
            "vendor_email": "contact@organic.com",
            "vendor_phone": "+919876543210",
            "month": "2026-03",
            "amount": "500.00",
            "payment_mode": "upi",
            "transaction_id": "UPI12345678",
            "payment_screenshot_url": "http://localhost:8000/media/maintenance_proofs/...",
            "submitted_at": "2026-03-20T15:30:00Z"
        }
    ]
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def get(self, request):
        """List all pending verification payments."""
        try:
            # Get all maintenance fees awaiting verification
            pending_fees = MaintenanceFee.objects.filter(
                is_paid=True,
                verified_by_admin=False
            ).select_related('vendor').order_by('-submitted_at')

            # Serialize with request context for absolute URLs
            serializer = MaintenancePendingVerificationSerializer(
                pending_fees,
                many=True,
                context={'request': request}
            )
            
            return Response({
                'count': pending_fees.count(),
                'results': serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Error fetching pending verifications: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminMaintenanceVerifyView(APIView):
    """
    PATCH /api/admin/maintenance/<fee_id>/verify/
    
    AdminJWTRequired.
    Admin verifies or rejects maintenance payment proof.
    
    Request body:
      { "verified": true }
      or
      { "verified": false, "note": "Screenshot unclear, resubmit" }
    
    If verified = True:
      - Set verified_by_admin = True
      - Set maintenance_due = False on Vendor model
      - Send email to vendor: "Your maintenance payment for {month} has been verified."
    
    If verified = False:
      - Set is_paid = False (reset — vendor must resubmit)
      - Set verification_note = note
      - Send email to vendor: "Your payment proof was rejected. Reason: {note}. Please resubmit."
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (AdminJWTAuthentication,)

    def patch(self, request, fee_id):
        """Verify or reject maintenance payment."""
        try:
            # Get the maintenance fee record
            try:
                fee = MaintenanceFee.objects.get(id=fee_id)
            except MaintenanceFee.DoesNotExist:
                return Response(
                    {'detail': 'Maintenance fee record not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check if already verified
            if fee.verified_by_admin:
                return Response(
                    {'detail': 'This payment has already been verified.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if is_paid (should be true for pending verification)
            if not fee.is_paid:
                return Response(
                    {'detail': 'This record is not marked as paid. Cannot verify.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate request body
            serializer = MaintenancePaymentVerifySerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Extract validated data
            verified = serializer.validated_data.get('verified')
            note = serializer.validated_data.get('note', '').strip()

            vendor = fee.vendor

            if verified:
                # ===== VERIFICATION APPROVED =====
                fee.verified_by_admin = True
                fee.verification_note = 'Approved by admin'
                fee.save()

                # Mark maintenance_due as False on vendor
                vendor.maintenance_due = False
                vendor.save()

                # Send approval email to vendor
                try:
                    subject = f'Maintenance Payment Verified - {fee.month}'
                    message = f"""
Hello {vendor.business_name},

Your maintenance payment for {fee.month} has been verified and approved.

Payment Details:
- Month: {fee.month}
- Amount: Rs. {fee.amount}
- Payment Mode: {fee.payment_mode.upper()}

Thank you for your timely payment. Your account is now up to date.

Best regards,
NativeGlow Admin Team
                    """
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [vendor.email],
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Error sending approval email: {str(e)}")

                return Response({
                    'message': 'Payment verified and approved.',
                    'fee_id': fee.id,
                    'vendor_name': vendor.business_name,
                    'month': fee.month,
                    'status': 'VERIFIED'
                }, status=status.HTTP_200_OK)

            else:
                # ===== VERIFICATION REJECTED =====
                fee.is_paid = False  # Reset so vendor can resubmit
                fee.verified_by_admin = False
                fee.verification_note = note
                fee.payment_screenshot = None  # Clear screenshot
                fee.submitted_at = None  # Clear submission timestamp
                fee.save()

                # Send rejection email to vendor
                try:
                    subject = f'Maintenance Payment Rejected - {fee.month}'
                    message = f"""
Hello {vendor.business_name},

Your maintenance payment proof for {fee.month} could not be verified.

Rejection Reason:
{note}

Please submit a clear screenshot of your payment proof and try again.

Payment Details:
- Month: {fee.month}
- Amount: Rs. {fee.amount}

Once verified, your account will be updated.

Best regards,
NativeGlow Admin Team
                    """
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [vendor.email],
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Error sending rejection email: {str(e)}")

                return Response({
                    'message': 'Payment rejected. Vendor has been notified to resubmit.',
                    'fee_id': fee.id,
                    'vendor_name': vendor.business_name,
                    'month': fee.month,
                    'rejection_reason': note,
                    'status': 'REJECTED'
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Error processing verification: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )