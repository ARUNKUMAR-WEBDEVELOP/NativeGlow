import os
import json
from urllib import parse, request as urllib_request

from django.utils import timezone
from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from vendors.models import Vendor
from .authentication import BuyerJWTAuthentication
import random
from datetime import timedelta
from django.core.mail import send_mail

from users.models import EmailOTP
from .models import Buyer
from .serializers import BuyerGoogleLoginSerializer, BuyerProfileSerializer, BuyerUpdateSerializer, BuyerOTPRequestSerializer, BuyerOTPVerifySerializer
from orders.models import Order
from orders.serializers import BuyerOrderListSerializer


def verify_google_identity(google_token, client_id):
	"""Accept Google ID token or OAuth access token and return normalized identity."""
	# Preferred: verify ID token JWT
	try:
		info = id_token.verify_oauth2_token(google_token, google_requests.Request(), client_id)
		email = (info.get('email') or '').strip().lower()
		sub = (info.get('sub') or '').strip()
		name = (info.get('name') or '').strip()
		picture = (info.get('picture') or '').strip()
		if email and sub:
			return {
				'email': email,
				'google_id': sub,
				'full_name': name,
				'picture': picture,
			}
	except Exception:
		pass

	# Fallback: verify access token via Google userinfo endpoint
	try:
		params = parse.urlencode({'access_token': google_token})
		url = f'https://www.googleapis.com/oauth2/v3/userinfo?{params}'
		with urllib_request.urlopen(url, timeout=8) as resp:
			info = json.loads(resp.read().decode('utf-8'))
		email = (info.get('email') or '').strip().lower()
		sub = (info.get('sub') or '').strip()
		name = (info.get('name') or '').strip()
		picture = (info.get('picture') or '').strip()
		if email and sub:
			return {
				'email': email,
				'google_id': sub,
				'full_name': name,
				'picture': picture,
			}
	except Exception:
		pass

	raise ValueError('Invalid Google token.')


class BuyerGoogleLoginView(APIView):
	"""POST /api/buyers/google-login/"""

	permission_classes = (permissions.AllowAny,)

	def post(self, request):
		serializer = BuyerGoogleLoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		google_token = serializer.validated_data['google_token']
		vendor_slug = serializer.validated_data['vendor_slug'].strip()

		client_id = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
		if not client_id:
			return Response(
				{'detail': 'Google login is not configured on the server.'},
				status=status.HTTP_503_SERVICE_UNAVAILABLE,
			)

		try:
			identity = verify_google_identity(google_token, client_id)
		except ValueError:
			return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

		email = identity['email']
		full_name = identity.get('full_name', '')
		google_id = identity['google_id']
		picture = identity.get('picture', '')

		if not email or not google_id:
			return Response(
				{'detail': 'Google account email/id is unavailable.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			vendor = Vendor.objects.get(vendor_slug=vendor_slug)
		except Vendor.DoesNotExist:
			return Response({'detail': 'Vendor site not found.'}, status=status.HTTP_404_NOT_FOUND)

		buyer, created = Buyer.objects.get_or_create(
			vendor=vendor,
			email=email,
			defaults={
				'full_name': full_name,
				'google_id': google_id,
				'profile_picture': picture,
				'last_login': timezone.now(),
			},
		)

		if not created:
			buyer.full_name = full_name or buyer.full_name
			buyer.google_id = google_id
			buyer.profile_picture = picture
			buyer.last_login = timezone.now()
			buyer.save(update_fields=['full_name', 'google_id', 'profile_picture', 'last_login'])

		refresh = RefreshToken()
		refresh['buyer_id'] = buyer.id
		refresh['vendor_slug'] = vendor.vendor_slug
		refresh['email'] = buyer.email
		refresh['role'] = 'buyer'

		return Response(
			{
				'access_token': str(refresh.access_token),
				'buyer_name': buyer.full_name,
				'buyer_email': buyer.email,
				'buyer_picture': buyer.profile_picture,
				'is_new_buyer': created,
			},
			status=status.HTTP_200_OK,
		)


class BuyerMeView(APIView):
	"""GET /api/buyers/me/"""

	permission_classes = (permissions.IsAuthenticated,)
	authentication_classes = (BuyerJWTAuthentication,)

	def get(self, request):
		buyer = getattr(request, 'buyer', None)
		serializer = BuyerProfileSerializer(buyer)
		return Response(serializer.data, status=status.HTTP_200_OK)


class BuyerMeUpdateView(APIView):
	"""PUT /api/buyers/me/update/"""

	permission_classes = (permissions.IsAuthenticated,)
	authentication_classes = (BuyerJWTAuthentication,)

	def put(self, request):
		buyer = getattr(request, 'buyer', None)
		serializer = BuyerUpdateSerializer(buyer, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(BuyerProfileSerializer(buyer).data, status=status.HTTP_200_OK)


class BuyerOrderListView(generics.ListAPIView):
	"""GET /api/buyers/orders/"""

	permission_classes = (permissions.IsAuthenticated,)
	authentication_classes = (BuyerJWTAuthentication,)
	serializer_class = BuyerOrderListSerializer

	def get_queryset(self):
		buyer = getattr(self.request, 'buyer', None)
		if not buyer:
			return Order.objects.none()
		return (
			Order.objects.filter(buyer=buyer, vendor=buyer.vendor)
			.select_related('product')
			.prefetch_related('product__images')
			.order_by('-created_at')
		)


class BuyerOTPRequestView(APIView):
	"""POST /api/buyers/otp-request/"""
	permission_classes = (permissions.AllowAny,)

	def post(self, request):
		serializer = BuyerOTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		email = data['email'].strip().lower()
		vendor_slug = data['vendor_slug'].strip()

		try:
			vendor = Vendor.objects.get(vendor_slug=vendor_slug)
		except Vendor.DoesNotExist:
			return Response({'detail': 'Vendor site not found.'}, status=status.HTTP_404_NOT_FOUND)

		code = f"{random.randint(0, 999999):06d}"
		otp = EmailOTP.objects.create(
			email=email,
			purpose='buyer_login',
			otp_code=code,
			expires_at=timezone.now() + timedelta(minutes=10),
		)

		try:
			send_mail(
				subject=f'{vendor.business_name} - Login Code',
				message=f'Your login code is {code}. It expires in 10 minutes.',
				from_email=settings.DEFAULT_FROM_EMAIL,
				recipient_list=[email],
				fail_silently=False,
			)
		except Exception as e:
			import logging
			logger = logging.getLogger(__name__)
			logger.error(f"Failed to send OTP email to {email}: {str(e)}")
			return Response(
				{'detail': 'Failed to send OTP email. Please try again later.'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)

		response_payload = {'detail': 'OTP sent to email.'}
		if os.environ.get('DEBUG', '1') == '1':
			response_payload['otp_debug'] = otp.otp_code
		return Response(response_payload, status=status.HTTP_201_CREATED)


class BuyerOTPVerifyView(APIView):
	"""POST /api/buyers/otp-verify/"""
	permission_classes = (permissions.AllowAny,)

	def post(self, request):
		serializer = BuyerOTPVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		email = data['email'].strip().lower()
		vendor_slug = data['vendor_slug'].strip()

		try:
			vendor = Vendor.objects.get(vendor_slug=vendor_slug)
		except Vendor.DoesNotExist:
			return Response({'detail': 'Vendor site not found.'}, status=status.HTTP_404_NOT_FOUND)

		otp = EmailOTP.objects.filter(
			email=email,
			purpose='buyer_login',
			otp_code=data['otp_code'],
			is_verified=False,
		).first()

		if not otp:
			return Response({'detail': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
		if timezone.now() > otp.expires_at:
			return Response({'detail': 'OTP expired.'}, status=status.HTTP_400_BAD_REQUEST)

		otp.is_verified = True
		otp.save(update_fields=['is_verified'])

		# Create or get buyer
		# Since OTP doesn't provide a full name or profile picture, we set defaults if new
		buyer, created = Buyer.objects.get_or_create(
			vendor=vendor,
			email=email,
			defaults={
				'full_name': email.split('@')[0],
				'google_id': f'email_{email}', # Dummy google_id for email users, though it has unique constraint, so maybe just email is better
				'profile_picture': '',
				'last_login': timezone.now(),
			},
		)

		if not created:
			buyer.last_login = timezone.now()
			buyer.save(update_fields=['last_login'])

		refresh = RefreshToken()
		refresh['buyer_id'] = buyer.id
		refresh['vendor_slug'] = vendor.vendor_slug
		refresh['email'] = buyer.email
		refresh['role'] = 'buyer'

		return Response(
			{
				'access_token': str(refresh.access_token),
				'buyer_name': buyer.full_name,
				'buyer_email': buyer.email,
				'buyer_picture': buyer.profile_picture,
				'is_new_buyer': created,
			},
			status=status.HTTP_200_OK,
		)

