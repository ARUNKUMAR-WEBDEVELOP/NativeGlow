from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q, Count, Sum
from django.db.models.functions import TruncMonth

from .models import Category, Product
from vendors.models import Vendor
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    VendorProductCreateSerializer,
    VendorProductListSerializer,
    VendorProductUpdateSerializer,
    VendorProductStatusSerializer,
    VendorProductQuantitySerializer,
    PublicProductSerializer,
    PublicVendorSerializer,
    PublicProductDetailSerializer,
    StoreCategoryWithCountSerializer,
)


class IsVendorOrAdmin(permissions.BasePermission):
    """Allow approved vendors and admin staff to create/edit products."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        is_vendor = (
            request.user.is_authenticated
            and hasattr(request.user, 'vendor_profile')
            and request.user.vendor_profile.status == 'approved'
        )
        return request.user.is_authenticated and (request.user.is_staff or is_vendor)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        # Vendors can only edit their own products
        return (
            hasattr(request.user, 'vendor_profile')
            and obj.vendor == request.user.vendor_profile
        )


class CategoryListView(generics.ListAPIView):
    """GET /api/products/categories/"""
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Category.objects.all()


class ProductListView(generics.ListAPIView):
    """GET /api/products/?category=herbal-skincare&tags=herbal"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'tags', 'short_description')
    ordering_fields = ('price', 'created_at')

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        tag = self.request.query_params.get('tag')
        vendor_id = self.request.query_params.get('vendor')
        brand = self.request.query_params.get('brand')
        if category:
            qs = qs.filter(category__slug=category)
        if tag:
            qs = qs.filter(tags__icontains=tag)
        if vendor_id:
            qs = qs.filter(vendor__id=vendor_id)
        if brand:
            normalized = brand.strip().lower()
            if normalized == 'nativeglow':
                qs = qs.filter(vendor__isnull=True)
            else:
                qs = qs.filter(vendor__brand_name__iexact=brand.strip())
        return qs


class FeaturedProductsView(generics.ListAPIView):
    """GET /api/products/featured/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_featured=True)


class BestSellersView(generics.ListAPIView):
    """GET /api/products/best-sellers/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_bestseller=True)


class NewArrivalsView(generics.ListAPIView):
    """GET /api/products/new-arrivals/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_new_arrival=True)


class ProductCreateView(generics.CreateAPIView):
    """POST /api/products/  — vendor or admin creates a product."""
    serializer_class = ProductDetailSerializer
    permission_classes = (IsVendorOrAdmin,)

    def perform_create(self, serializer):
        vendor = getattr(self.request.user, 'vendor_profile', None)
        serializer.save(vendor=vendor)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PUT / DELETE /api/products/<slug>/"""
    serializer_class = ProductDetailSerializer
    permission_classes = (IsVendorOrAdmin,)
    queryset = Product.objects.filter(is_active=True)
    lookup_field = 'slug'


# ============================================================================
# VENDOR PRODUCT MANAGEMENT VIEWS (JWT Protected)
# ============================================================================

class VendorProductCreateView(generics.CreateAPIView):
    """
    POST /api/vendor/products/add/
    Vendor adds new product with automatic approval_status='pending'
    """
    serializer_class = VendorProductCreateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)

    def create(self, request, *args, **kwargs):
        """Create product and set vendor from JWT token."""
        try:
            # Extract vendor_id from JWT token
            vendor_id = None
            if request.auth:
                vendor_id = request.auth.get('vendor_id') or request.auth.get('user_id')
            
            if not vendor_id:
                return Response(
                    {'error': 'Invalid or missing vendor ID in token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Store vendor in request for serializer
            from vendors.models import Vendor
            try:
                request.vendor = Vendor.objects.get(id=vendor_id)
            except Vendor.DoesNotExist:
                return Response(
                    {'error': 'Vendor profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            return Response(
                {
                    'id': serializer.instance.id,
                    'title': serializer.instance.title,
                    'slug': serializer.instance.slug,
                    'status': serializer.instance.status,
                    'message': 'Product created successfully! Awaiting admin approval.'
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """Save product with vendor."""
        serializer.save()


class VendorProductListView(generics.ListAPIView):
    """
    GET /api/vendor/products/
    Return only this vendor's products
    """
    serializer_class = VendorProductListSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)

    def get_queryset(self):
        """Filter products by logged-in vendor from JWT token."""
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            
            if not vendor_id:
                return Product.objects.none()
            
            return Product.objects.filter(vendor_id=vendor_id).order_by('-created_at')
        except:
            return Product.objects.none()


class VendorProductEditView(generics.UpdateAPIView):
    """
    PUT /api/vendor/products/<id>/edit/
    Vendor edits their product. If approved, resets to pending.
    """
    serializer_class = VendorProductUpdateSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        """Only return vendor's own products."""
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            
            if not vendor_id:
                return Product.objects.none()
            
            return Product.objects.filter(vendor_id=vendor_id)
        except:
            return Product.objects.none()

    def update(self, request, *args, **kwargs):
        """Update product and reset approval status if needed."""
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            status_msg = 'pending' if instance.status == 'pending' else (
                'Product updated. Status reset to pending for admin review.'
            )
            
            return Response(
                {
                    'id': instance.id,
                    'title': instance.title,
                    'status': instance.status,
                    'message': status_msg
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorProductDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/vendor/products/<id>/delete/
    Vendor deletes product only if no active orders
    """
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        """Only return vendor's own products."""
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            
            if not vendor_id:
                return Product.objects.none()
            
            return Product.objects.filter(vendor_id=vendor_id)
        except:
            return Product.objects.none()

    def destroy(self, request, *args, **kwargs):
        """Delete product if no active orders."""
        try:
            instance = self.get_object()
            
            # Check for active orders on this product
            from orders.models import OrderItem
            active_orders = OrderItem.objects.filter(
                product=instance,
                order__status__in=['pending', 'processing', 'shipped']
            ).exists()
            
            if active_orders:
                return Response(
                    {'error': 'Cannot delete product with active orders. Mark as unavailable instead.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            self.perform_destroy(instance)
            
            return Response(
                {'message': 'Product deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorProductStatusView(generics.UpdateAPIView):
    """
    PATCH /api/vendor/products/<id>/status/
    Toggle product availability (is_available)
    """
    serializer_class = VendorProductStatusSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        """Only return vendor's own products."""
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            
            if not vendor_id:
                return Product.objects.none()
            
            return Product.objects.filter(vendor_id=vendor_id)
        except:
            return Product.objects.none()

    def partial_update(self, request, *args, **kwargs):
        """Toggle availability status."""
        try:
            instance = self.get_object()
            
            # Get the new availability status
            is_available = request.data.get('is_available')
            if is_available is None:
                return Response(
                    {'error': 'is_available field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            instance.is_active = is_available
            instance.save()
            
            status_text = 'Available' if is_available else 'Unavailable'
            
            return Response(
                {
                    'id': instance.id,
                    'title': instance.title,
                    'is_available': instance.is_active,
                    'message': f'Product marked as {status_text}'
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VendorProductQuantityView(generics.UpdateAPIView):
    """
    PATCH /api/vendor/products/<id>/quantity/
    Update available_quantity
    """
    serializer_class = VendorProductQuantitySerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        """Only return vendor's own products."""
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            
            if not vendor_id:
                return Product.objects.none()
            
            return Product.objects.filter(vendor_id=vendor_id)
        except:
            return Product.objects.none()

    def partial_update(self, request, *args, **kwargs):
        """Update product quantity."""
        try:
            instance = self.get_object()
            
            # Get the new quantity
            available_quantity = request.data.get('available_quantity')
            if available_quantity is None:
                return Response(
                    {'error': 'available_quantity field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                qty = int(available_quantity)
                if qty < 0:
                    return Response(
                        {'error': 'Quantity must be non-negative'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Quantity must be a valid integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            instance.available_quantity = qty
            instance.inventory_qty = qty  # Keep in sync
            instance.save()
            
            return Response(
                {
                    'id': instance.id,
                    'title': instance.title,
                    'available_quantity': instance.available_quantity,
                    'message': f'Quantity updated to {qty}'
                },
                status=status.HTTP_200_OK
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PublicVendorStoreView(generics.RetrieveAPIView):
    """
    GET /api/store/<vendor_slug>/
    Public shareable store endpoint for a vendor.
    - Returns vendor public info (business_name, city, whatsapp_number, total_products, member_since)
    - Returns all approved + available products
    - Returns 404 if vendor not found
    - Returns 403 if vendor inactive/deactivated
    """
    permission_classes = (permissions.AllowAny,)
    queryset = Vendor.objects.filter(is_approved=True, is_active=True)
    serializer_class = PublicVendorSerializer
    lookup_field = 'vendor_slug'

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to include products in response."""
        try:
            vendor = self.get_object()
        except Vendor.DoesNotExist:
            return Response(
                {'detail': 'Store not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not vendor.is_active or not vendor.is_approved:
            return Response(
                {'detail': 'This store is currently unavailable.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get vendor data
        vendor_serializer = self.get_serializer(vendor)
        
        # Get all approved + available products
        products = Product.objects.filter(
            vendor=vendor,
            status='approved',
            is_active=True,
            available_quantity__gt=0
        ).order_by('-created_at')
        
        products_serializer = PublicProductSerializer(products, many=True, context={'request': request})
        
        return Response({
            **vendor_serializer.data,
            'products': products_serializer.data,
        }, status=status.HTTP_200_OK)


class PublicProductDetailView(APIView):
    """
    GET /api/store/<vendor_slug>/products/<product_id>/
    Return single product full detail with vendor whatsapp + upi_id for payment.
    - Returns 404 if product not approved or unavailable
    - Includes vendor contact info for payment
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, vendor_slug, product_id):
        """Retrieve single product detail with vendor payment info."""
        try:
            product = Product.objects.get(
                id=product_id,
                vendor__vendor_slug=vendor_slug,
                status='approved',
                is_active=True,
                available_quantity__gt=0
            )
        except Product.DoesNotExist:
            return Response(
                {'detail': 'Product not found or unavailable.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PublicProductDetailSerializer(product, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class StoreSearchView(APIView):
    """
    GET /api/store/search/?q=face+wash&category=soap&city=Chennai
    Global search across ALL vendors (approved + active only).
    Query params:
      - q: Search in product name/description
      - category: Filter by category name
      - city: Filter by vendor city
    Returns: matching products with vendor business_name + vendor_slug
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        """Search products across all vendors."""
        search_query = request.query_params.get('q', '').strip()
        category_filter = request.query_params.get('category', '').strip()
        city_filter = request.query_params.get('city', '').strip()
        
        # Start with approved products from active vendors
        queryset = Product.objects.filter(
            status='approved',
            is_active=True,
            available_quantity__gt=0,
            vendor__is_approved=True,
            vendor__is_active=True
        )
        
        # Filter by search query
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        # Filter by category
        if category_filter:
            queryset = queryset.filter(category__name__icontains=category_filter)
        
        # Filter by vendor city
        if city_filter:
            queryset = queryset.filter(vendor__city__icontains=city_filter)
        
        queryset = queryset.order_by('-created_at')[:50]  # Limit to 50 results
        
        serializer = PublicProductSerializer(queryset, many=True, context={'request': request})
        return Response({
            'count': len(serializer.data),
            'results': serializer.data,
        }, status=status.HTTP_200_OK)


class StoreCategoriesView(APIView):
    """
    GET /api/store/categories/
    Return all product categories with count of approved + available products.
    Used for homepage category browse section.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        """Get all categories with product count."""
        categories = Category.objects.annotate(
            product_count=Count(
                'products',
                filter=Q(
                    products__status='approved',
                    products__is_active=True,
                    products__available_quantity__gt=0,
                    products__vendor__is_approved=True,
                    products__vendor__is_active=True
                )
            )
        ).filter(product_count__gt=0).order_by('name')
        
        data = [
            {
                'category': category.name,
                'count': category.product_count
            }
            for category in categories
        ]
        
        return Response(data, status=status.HTTP_200_OK)


class StoreFeaturedView(APIView):
    """
    GET /api/store/featured/
    Return 8 featured products (most ordered, approved only).
    Used for NativeGlow homepage featured section.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        """Get 8 featured products based on order count."""
        from orders.models import OrderItem
        
        # Get products with order counts
        featured_products = Product.objects.filter(
            status='approved',
            is_active=True,
            available_quantity__gt=0,
            vendor__is_approved=True,
            vendor__is_active=True
        ).annotate(
            order_count=Count('orderitem')
        ).order_by('-order_count', '-created_at')[:8]
        
        serializer = PublicProductSerializer(featured_products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
