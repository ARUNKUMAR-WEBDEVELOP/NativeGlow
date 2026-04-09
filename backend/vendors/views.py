from django.utils import timezone
from django.utils.text import slugify
from django.db import DatabaseError
from django.db.models import Sum
from decimal import Decimal
from datetime import timedelta
import os
from uuid import uuid4
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status, exceptions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import requests

from .models import Vendor, VendorApplication
from .authentication import VendorJWTAuthentication
from orders.models import OrderItem
from admins.models import MaintenanceFee
from .serializers import (
    VendorSerializer,
    VendorApplicationSerializer,
    VendorApplicationReviewSerializer,
    VendorRegisterSerializer,
    VendorLoginSerializer,
    VendorProfileSerializer,
    MaintenanceFeeListSerializer,
    MaintenancePaymentSubmitSerializer,
)


class VendorBrandAssetUploadView(APIView):
    """
    POST /api/vendor/brand-assets/upload/
    Upload a vendor brand asset through the backend so the browser does not need
    direct write access to Supabase Storage.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        folder = (request.data.get('folder') or 'logos').strip() or 'logos'

        if not uploaded_file:
            return Response({'detail': 'File is required.'}, status=status.HTTP_400_BAD_REQUEST)

        supabase_url = os.environ.get('SUPABASE_URL', '').strip()
        service_key = (
            os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
            or os.environ.get('SUPABASE_ANON_KEY', '').strip()
            or os.environ.get('SUPABASE_PUBLISHABLE_KEY', '').strip()
        )
        bucket = os.environ.get('SUPABASE_VENDOR_ASSETS_BUCKET', 'vendor-assets').strip() or 'vendor-assets'

        if not supabase_url or not service_key:
            return Response(
                {
                    'detail': (
                        'Backend storage is not configured. Set SUPABASE_URL and one of '
                        'SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY.'
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_name = uploaded_file.name.replace(' ', '-')
        path = f'{folder}/{uuid4().hex}-{safe_name}'
        upload_url = f'{supabase_url.rstrip("/")}/storage/v1/object/{bucket}/{path}'
        content_type = uploaded_file.content_type or 'application/octet-stream'

        try:
            response = requests.post(
                upload_url,
                headers={
                    'apikey': service_key,
                    'Authorization': f'Bearer {service_key}',
                    'Content-Type': content_type,
                    'x-upsert': 'true',
                },
                data=uploaded_file.read(),
                timeout=30,
            )
        except requests.RequestException as exc:
            return Response(
                {'detail': f'Could not reach storage provider. {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not response.ok:
            detail = response.text
            try:
                payload = response.json()
                detail = payload.get('message') or payload.get('error') or payload.get('detail') or detail
            except Exception:
                pass
            return Response(
                {'detail': f'Storage upload failed ({response.status_code}). {detail}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        public_url = f'{supabase_url.rstrip("/")}/storage/v1/object/public/{bucket}/{path}'
        return Response(
            {
                'url': public_url,
                'path': path,
                'bucket': bucket,
            },
            status=status.HTTP_201_CREATED,
        )


class VendorListView(generics.ListAPIView):
    """GET /api/vendors/  — list all active approved vendors."""
    serializer_class = VendorSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Vendor.objects.filter(is_approved=True, is_active=True)


class VendorDetailView(generics.RetrieveAPIView):
    """GET /api/vendors/<pk>/  — public vendor profile."""
    serializer_class = VendorSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Vendor.objects.filter(is_approved=True, is_active=True)


class VendorSiteDirectoryView(APIView):
    """
    GET /api/vendors/site-urls/
    Public endpoint listing approved active vendor store/manage URLs.
    Useful for quickly verifying each vendor storefront.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        try:
            vendors = Vendor.objects.filter(is_approved=True, is_active=True).order_by('business_name', 'id')

            data = [
                {
                    'id': vendor.id,
                    'business_name': vendor.business_name,
                    'vendor_slug': vendor.vendor_slug,
                    'store_url': f'/site/{vendor.vendor_slug}' if vendor.vendor_slug else '',
                    'products_url': f'/site/{vendor.vendor_slug}/products' if vendor.vendor_slug else '',
                    'about_url': f'/site/{vendor.vendor_slug}/about' if vendor.vendor_slug else '',
                    'track_url': f'/site/{vendor.vendor_slug}/track' if vendor.vendor_slug else '',
                    'manage_url': '/vendor/dashboard',
                    'site_status': vendor.site_status,
                    'approved': vendor.is_approved,
                    'active': vendor.is_active,
                }
                for vendor in vendors
                if vendor.vendor_slug
            ]

            return Response(
                {
                    'count': len(data),
                    'results': data,
                },
                status=status.HTTP_200_OK,
            )
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while loading vendor directory.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while loading vendor directory.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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

        try:
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
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while loading vendor analytics.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while loading vendor analytics.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================================
# VENDOR AUTHENTICATION VIEWS
# ============================================================================

class VendorRegisterView(generics.CreateAPIView):
    """
    POST /api/vendor/register/
    Register a new vendor account.
    
    Request body:
    {
        "full_name": "John Doe",
        "email": "vendor@example.com",
        "password": "securepass123",
        "confirm_password": "securepass123",
        "business_name": "Organic Farms",
        "whatsapp_number": "+919876543210",
        "city": "Mumbai",
        "upi_id": "john@upi",
        "bank_account_number": "1234567890",
        "bank_ifsc": "SBIN0001234",
        "account_holder_name": "John Doe"
    }
    
    Response (201):
    {
        "id": 1,
        "full_name": "John Doe",
        "email": "vendor@example.com",
        "business_name": "Organic Farms",
        "vendor_slug": "organic-farms",
        "is_approved": false,
        "message": "Registration successful. Your account is pending admin approval."
    }
    """
    serializer_class = VendorRegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        """Handle registration with custom response including generated password."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        
        # Get the plain password that was generated or provided
        plain_password = getattr(vendor, '_plain_password', '[auto-generated]')

        return Response(
            {
                'id': vendor.id,
                'full_name': vendor.full_name,
                'email': vendor.email,
                'business_name': vendor.business_name,
                'vendor_slug': vendor.vendor_slug,
                'store_url': f'/site/{vendor.vendor_slug}' if vendor.vendor_slug else '',
                'manage_url': '/vendor/dashboard/products',
                'city': vendor.city,
                'registered_via_google': vendor.registered_via_google,
                'google_email_verified': vendor.google_email_verified,
                'is_approved': vendor.is_approved,
                'approval_status': 'approved' if vendor.is_approved else 'pending',
                'next_step': 'wait_for_admin_approval',
                'login_credentials': {
                    'email': vendor.email,
                    'password': plain_password,
                    'note': 'Use these credentials to login after admin approval. Do not share your password with anyone.'
                },
                'message': f'Registration successful! Your account is pending admin approval. You will receive an email once approved. Use the password shown above to login after approval.',
            },
            status=status.HTTP_201_CREATED
        )


class VendorLoginView(APIView):
    """
    POST /api/vendor/login/
    Authenticate a vendor and return JWT tokens.
    
    Request body:
    {
        "email": "vendor@example.com",
        "password": "securepass123"
    }
    
    Response (200):
    {
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "vendor": {
            "id": 1,
            "full_name": "John Doe",
            "email": "vendor@example.com",
            "business_name": "Organic Farms",
            "vendor_slug": "organic-farms"
        }
    }
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        """Authenticate vendor and issue JWT tokens."""
        serializer = VendorLoginSerializer(data=request.data)
        if not serializer.is_valid():
            message = ''
            if isinstance(serializer.errors, dict):
                non_field = serializer.errors.get('non_field_errors')
                if isinstance(non_field, list) and non_field:
                    message = str(non_field[0])
                elif isinstance(serializer.errors.get('detail'), str):
                    message = serializer.errors.get('detail')

            pending_phrase = 'pending admin approval'
            if pending_phrase in message.lower():
                email = (request.data.get('email') or '').strip().lower()
                vendor = Vendor.objects.filter(email__iexact=email).first()
                payload = {
                    'detail': message,
                    'approval_status': 'pending',
                }
                if vendor:
                    payload['vendor'] = {
                        'id': vendor.id,
                        'full_name': vendor.full_name,
                        'email': vendor.email,
                        'business_name': vendor.business_name,
                        'vendor_slug': vendor.vendor_slug,
                        'created_at': vendor.created_at,
                        'is_approved': vendor.is_approved,
                    }
                return Response(payload, status=status.HTTP_403_FORBIDDEN)

            raise exceptions.ValidationError(serializer.errors)

        vendor = serializer.validated_data.get('vendor')

        # Generate JWT tokens for custom Vendor model
        # Creating RefreshToken with custom claims for Vendor authentication
        try:
            refresh = RefreshToken()
            refresh['vendor_id'] = vendor.id
            refresh['user_id'] = vendor.id
            refresh['email'] = vendor.email
            refresh['is_vendor'] = True
            refresh['role'] = 'vendor'  # Add role field for endpoint authorization
            access_token = refresh.access_token
        except Exception as e:
            # Log error for debugging purposes
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'JWT token generation failed for vendor {vendor.id}: {str(e)}')
            return Response(
                {'detail': 'Authentication failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                'access': str(access_token),
                'refresh': str(refresh),
                'vendor': {
                    'id': vendor.id,
                    'full_name': vendor.full_name,
                    'email': vendor.email,
                    'business_name': vendor.business_name,
                    'vendor_slug': vendor.vendor_slug,
                    'store_url': f'/site/{vendor.vendor_slug}' if vendor.vendor_slug else '',
                    'city': vendor.city,
                    'is_approved': vendor.is_approved,
                    'site_status': vendor.site_status,
                }
            },
            status=status.HTTP_200_OK
        )


class VendorApprovalStatusView(APIView):
    """
    GET /api/vendor/approval-status/?email=vendor@example.com
    Public endpoint for pending vendors to poll approval state.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        email = (request.query_params.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'detail': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            vendor = Vendor.objects.filter(email__iexact=email).first()
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while checking approval status.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while checking approval status.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not vendor:
            return Response(
                {'detail': 'Vendor account not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        approval_status = 'approved' if vendor.is_approved else 'pending'
        redirect_url = f"/site/{vendor.vendor_slug}" if vendor.is_approved and vendor.vendor_slug else ''
        management_url = '/vendor/dashboard/products' if vendor.is_approved else ''

        return Response(
            {
                'id': vendor.id,
                'email': vendor.email,
                'full_name': vendor.full_name,
                'business_name': vendor.business_name,
                'vendor_slug': vendor.vendor_slug,
                'approval_status': approval_status,
                'is_approved': vendor.is_approved,
                'site_status': vendor.site_status,
                'is_active': vendor.is_active,
                'registered_at': vendor.created_at,
                'redirect_url': redirect_url,
                'management_url': management_url,
                'store_url': redirect_url,
            },
            status=status.HTTP_200_OK,
        )


class VendorActivateView(APIView):
    """
    GET /api/vendor/activate/?token=xxxxx
    Exchange a one-time redirect token for fresh vendor JWT access token.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        token = request.query_params.get('token', '').strip()
        expired_message = 'Activation link expired. Please login manually.'

        if not token:
            return Response({'detail': expired_message}, status=status.HTTP_400_BAD_REQUEST)

        try:
            vendor = Vendor.objects.filter(redirect_token=token).first()
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while activating vendor account.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while activating vendor account.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not vendor or not vendor.site_activated_at:
            return Response({'detail': expired_message}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() > vendor.site_activated_at + timedelta(hours=48):
            return Response({'detail': expired_message}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken()
        refresh['vendor_id'] = vendor.id
        refresh['user_id'] = vendor.id
        refresh['email'] = vendor.email
        refresh['is_vendor'] = True

        access_token = str(refresh.access_token)

        try:
            vendor.redirect_token = ''
            vendor.save(update_fields=['redirect_token', 'updated_at'])
        except DatabaseError:
            return Response(
                {'detail': 'Database operation failed while finalizing vendor activation.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            return Response(
                {'detail': 'Something went wrong while finalizing vendor activation.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                'access_token': access_token,
                'vendor_slug': vendor.vendor_slug,
                'business_name': vendor.business_name,
                'site_status': vendor.site_status,
                'is_first_login': True,
            },
            status=status.HTTP_200_OK,
        )


class VendorProfileView(generics.RetrieveUpdateAPIView):
    """
    GET /api/vendor/me/
    Get the authenticated vendor's profile.
    
    Headers:
    Authorization: Bearer <access_token>
    
    Response (200):
    {
        "id": 1,
        "full_name": "John Doe",
        "email": "vendor@example.com",
        "business_name": "Organic Farms",
        "vendor_slug": "organic-farms",
        "city": "Mumbai",
        "whatsapp_number": "+919876543210",
        "upi_id": "john@upi",
        "bank_account_number": "1234567890",
        "bank_ifsc": "SBIN0001234",
        "account_holder_name": "John Doe",
        "is_approved": true,
        "is_active": true,
        "maintenance_due": false,
        "maintenance_due_status": "No outstanding maintenance fee",
        "created_at": "2026-03-23T10:30:00Z",
        "updated_at": "2026-03-23T10:30:00Z"
    }
    """
    serializer_class = VendorProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)

    def get_object(self):
        """
        Get the authenticated Vendor object.
        Expects vendor_id in JWT token or extract from request.
        """
        # Try to get from request (in case custom middleware sets it)
        vendor = getattr(self.request, 'vendor', None)
        if vendor:
            return vendor

        # Extract vendor_id from JWT token
        try:
            from rest_framework_simplejwt.utils import decode_complete_token
            from rest_framework_simplejwt.settings import api_settings
            
            # Get token from request
            if not hasattr(self.request, 'auth') or self.request.auth is None:
                raise exceptions.NotAuthenticated('No JWT token provided')
            
            # The token has already been validated by JWTAuthentication
            # Try to access vendor_id or user_id from validated_data
            try:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            except:
                # If token doesn't contain vendor_id, we need another way
                # For now, assume the vendor information is in the request
                raise exceptions.NotAuthenticated('Invalid token')

            return Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            raise exceptions.NotFound('Vendor profile not found')
        except Exception as e:
            # Fallback: return 401 if token validation fails
            raise exceptions.NotAuthenticated('Authentication failed')


# ============================================================================
# VENDOR MAINTENANCE FEE ENDPOINTS
# ============================================================================

class VendorMaintenanceListView(APIView):
    """
    GET /api/vendor/maintenance/
    
    JWT protected (vendor only).
    Return all maintenance fee records for the authenticated vendor.
    Response includes month, amount, is_paid, payment_mode, verified_by_admin, submitted_at.
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)

    def get_vendor(self):
        """Extract Vendor object from JWT token."""
        try:
            # Check if vendor object is attached to request (from middleware)
            vendor = getattr(self.request, 'vendor', None)
            if vendor:
                return vendor

            # Otherwise, try to get vendor_id from JWT token
            if not hasattr(self.request, 'auth') or self.request.auth is None:
                raise exceptions.NotAuthenticated('No JWT token provided')

            # Access vendor_id from validated token
            vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            if not vendor_id:
                raise exceptions.NotAuthenticated('Token missing vendor_id')

            vendor = Vendor.objects.get(id=vendor_id)
            return vendor
        except Vendor.DoesNotExist:
            raise exceptions.NotFound('Vendor not found')
        except Exception as e:
            raise exceptions.NotAuthenticated('Authentication failed')

    def get(self, request):
        """List all maintenance fees for this vendor."""
        try:
            vendor = self.get_vendor()
            
            # Get all maintenance fees for this vendor
            fees = MaintenanceFee.objects.filter(vendor=vendor).order_by('-month')

            # Serialize using manual serializer
            serializer = MaintenanceFeeListSerializer(fees, many=True)
            
            # Separate paid and unpaid for clarity
            unpaid_fees = [f for f in serializer.data if not f['is_paid']]
            paid_fees = [f for f in serializer.data if f['is_paid']]

            return Response({
                'total_fees': fees.count(),
                'unpaid_count': len(unpaid_fees),
                'paid_count': len(paid_fees),
                'unpaid': unpaid_fees,
                'paid': paid_fees,
            }, status=status.HTTP_200_OK)

        except (exceptions.NotAuthenticated, exceptions.NotFound) as e:
            return Response(
                {'detail': str(e.detail)},
                status=e.status_code
            )
        except Exception as e:
            return Response(
                {'detail': f'Error fetching maintenance fees: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VendorMaintenancePayView(APIView):
    """
    POST /api/vendor/maintenance/<fee_id>/pay/
    
    JWT protected (vendor only).
    Vendor submits payment proof after paying to NativeGlow UPI/Bank.
    
    Accepts multipart/form-data:
      - payment_mode: 'upi' or 'net_banking' (required)
      - upi_transaction_id: required if payment_mode='upi'
      - bank_reference_number: required if payment_mode='net_banking'
      - payment_screenshot: image file (required)
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (VendorJWTAuthentication,)

    def get_vendor(self):
        """Extract Vendor object from JWT token."""
        try:
            # Check if vendor object is attached to request (from middleware)
            vendor = getattr(self.request, 'vendor', None)
            if vendor:
                return vendor

            # Otherwise, try to get vendor_id from JWT token
            if not hasattr(self.request, 'auth') or self.request.auth is None:
                raise exceptions.NotAuthenticated('No JWT token provided')

            # Access vendor_id from validated token
            vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            if not vendor_id:
                raise exceptions.NotAuthenticated('Token missing vendor_id')

            vendor = Vendor.objects.get(id=vendor_id)
            return vendor
        except Vendor.DoesNotExist:
            raise exceptions.NotFound('Vendor not found')
        except Exception as e:
            raise exceptions.NotAuthenticated('Authentication failed')

    def post(self, request, fee_id):
        """Submit payment proof for a maintenance fee."""
        try:
            vendor = self.get_vendor()

            # Get the maintenance fee record
            try:
                fee = MaintenanceFee.objects.get(id=fee_id)
            except MaintenanceFee.DoesNotExist:
                return Response(
                    {'detail': 'Maintenance fee record not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify vendor owns this fee
            if fee.vendor_id != vendor.id:
                return Response(
                    {'detail': 'You can only submit payment for your own maintenance fees.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if already verified
            if fee.verified_by_admin:
                return Response(
                    {'detail': 'This fee has already been verified by admin. Cannot resubmit.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate submission using serializer
            serializer = MaintenancePaymentSubmitSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Extract validated data
            validated_data = serializer.validated_data
            payment_mode = validated_data.get('payment_mode')
            upi_transaction_id = validated_data.get('upi_transaction_id', '').strip()
            bank_reference_number = validated_data.get('bank_reference_number', '').strip()
            payment_screenshot = validated_data.get('payment_screenshot')

            # Update maintenance fee with payment proof
            fee.payment_mode = payment_mode
            if payment_mode == 'upi':
                fee.upi_transaction_id = upi_transaction_id
            elif payment_mode == 'net_banking':
                fee.bank_reference_number = bank_reference_number

            fee.payment_screenshot = payment_screenshot
            fee.submitted_at = timezone.now()
            fee.is_paid = True  # Mark as paid, pending verification
            fee.save()

            # Send email to admin
            try:
                subject = f'Maintenance Payment Submitted - {vendor.business_name}'
                message = f"""
Hello Admin,

Vendor {vendor.business_name} has submitted maintenance payment proof for {fee.month}.

Vendor Details:
- Business Name: {vendor.business_name}
- Email: {vendor.email}
- Phone: {vendor.whatsapp_number}

Payment Details:
- Month: {fee.month}
- Amount: Rs. {fee.amount}
- Payment Mode: {payment_mode.upper()}

Transaction ID: {upi_transaction_id or bank_reference_number}

Please verify the payment and update the admin panel.

Regards,
NativeGlow Platform
                """
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    ['admin@nativeglow.com'],  # Admin email - update as needed
                    fail_silently=True
                )
            except Exception as e:
                # Log but don't fail the response if email fails
                print(f"Error sending admin email: {str(e)}")

            return Response({
                'message': 'Payment submitted successfully. Awaiting admin verification.',
                'fee_id': fee.id,
                'status': 'PENDING VERIFICATION'
            }, status=status.HTTP_200_OK)

        except (exceptions.NotAuthenticated, exceptions.NotFound) as e:
            return Response(
                {'detail': str(e.detail)},
                status=e.status_code
            )
        except Exception as e:
            return Response(
                {'detail': f'Error processing payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
