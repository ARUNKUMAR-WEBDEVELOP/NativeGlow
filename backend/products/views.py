from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q, Count, Sum
from django.db.models.functions import TruncMonth

from .models import Category, Product
from vendors.models import Vendor
from orders.models import Order
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    VendorProductCreateSerializer,
    VendorProductListSerializer,
    VendorProductUpdateSerializer,
    VendorProductStatusSerializer,
    VendorProductQuantitySerializer,
    VendorProductDiscountSerializer,
    VendorProductVisibilitySerializer,
    VendorProductFeatureSerializer,
    VendorProductReorderSerializer,
    PublicProductSerializer,
    PublicVendorSerializer,
    PublicProductDetailSerializer,
    StoreCategoryWithCountSerializer,
    SiteProductSerializer,
    SiteVendorSerializer,
    SiteAboutSerializer,
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
        qs = Product.objects.filter(is_active=True, is_visible=True)
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
    queryset = Product.objects.filter(is_active=True, is_visible=True, is_featured=True)


class BestSellersView(generics.ListAPIView):
    """GET /api/products/best-sellers/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_visible=True, is_bestseller=True)


class NewArrivalsView(generics.ListAPIView):
    """GET /api/products/new-arrivals/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_visible=True, is_new_arrival=True)


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


class VendorProductDiscountView(generics.UpdateAPIView):
    """PATCH /api/vendor/products/<id>/discount/"""
    serializer_class = VendorProductDiscountSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            if not vendor_id:
                return Product.objects.none()
            return Product.objects.filter(vendor_id=vendor_id)
        except Exception:
            return Product.objects.none()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance.discount_percent = serializer.validated_data['discount_percent']
        instance.save()

        return Response(
            {
                'id': instance.id,
                'discount_percent': instance.discount_percent,
                'original_price': instance.original_price,
                'discounted_price': instance.discounted_price,
            },
            status=status.HTTP_200_OK,
        )


class VendorProductVisibilityView(generics.UpdateAPIView):
    """PATCH /api/vendor/products/<id>/visibility/"""
    serializer_class = VendorProductVisibilitySerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            if not vendor_id:
                return Product.objects.none()
            return Product.objects.filter(vendor_id=vendor_id)
        except Exception:
            return Product.objects.none()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance.is_visible = serializer.validated_data['is_visible']
        instance.save(update_fields=['is_visible', 'updated_at'])

        return Response(
            {
                'id': instance.id,
                'is_visible': instance.is_visible,
                'message': 'Product visibility updated successfully.',
            },
            status=status.HTTP_200_OK,
        )


class VendorProductFeatureView(generics.UpdateAPIView):
    """PATCH /api/vendor/products/<id>/feature/"""
    serializer_class = VendorProductFeatureSerializer
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)
    lookup_field = 'id'

    def get_queryset(self):
        try:
            vendor_id = None
            if self.request.auth:
                vendor_id = self.request.auth.get('vendor_id') or self.request.auth.get('user_id')
            if not vendor_id:
                return Product.objects.none()
            return Product.objects.filter(vendor_id=vendor_id)
        except Exception:
            return Product.objects.none()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance.is_featured = serializer.validated_data['is_featured']
        instance.save(update_fields=['is_featured', 'updated_at'])

        return Response(
            {
                'id': instance.id,
                'is_featured': instance.is_featured,
                'message': 'Product featured flag updated successfully.',
            },
            status=status.HTTP_200_OK,
        )


class VendorProductReorderView(APIView):
    """PATCH /api/vendor/products/reorder/"""
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)

    def patch(self, request):
        serializer = VendorProductReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor_id = None
        if request.auth:
            vendor_id = request.auth.get('vendor_id') or request.auth.get('user_id')
        if not vendor_id:
            return Response({'error': 'Invalid or missing vendor ID in token'}, status=status.HTTP_401_UNAUTHORIZED)

        order_items = serializer.validated_data['order']
        product_ids = [item['id'] for item in order_items]
        products = Product.objects.filter(vendor_id=vendor_id, id__in=product_ids)
        product_map = {p.id: p for p in products}

        if len(product_map) != len(set(product_ids)):
            return Response({'error': 'One or more products not found for this vendor.'}, status=status.HTTP_400_BAD_REQUEST)

        for item in order_items:
            product = product_map[item['id']]
            product.product_order = item['position']

        Product.objects.bulk_update(product_map.values(), ['product_order', 'updated_at'])

        return Response(
            {
                'message': 'Product order updated successfully.',
                'updated_count': len(product_map),
            },
            status=status.HTTP_200_OK,
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
            is_visible=True,
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
                is_visible=True,
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
            is_visible=True,
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
                    products__is_visible=True,
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
            is_visible=True,
            available_quantity__gt=0,
            vendor__is_approved=True,
            vendor__is_active=True
        ).annotate(
            order_count=Count('orderitem')
        ).order_by('-order_count', '-created_at')[:8]
        
        serializer = PublicProductSerializer(featured_products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# DEDICATED PUBLIC VENDOR SITE APIS (NO AUTH)
# ============================================================================

class PublicVendorSiteView(APIView):
    """
    GET /api/site/<vendor_slug>/
    Return full public vendor website payload in one call.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, vendor_slug):
        vendor = Vendor.objects.filter(vendor_slug=vendor_slug).first()
        if not vendor:
            return Response({'detail': 'Store not found.'}, status=status.HTTP_404_NOT_FOUND)

        if vendor.site_status != 'active':
            return Response({'detail': 'Store not active'}, status=status.HTTP_403_FORBIDDEN)

        products_qs = Product.objects.filter(
            vendor=vendor,
            status='approved',
            is_visible=True,
            is_active=True,
        ).order_by('product_order', '-created_at')

        featured_qs = products_qs.filter(is_featured=True)

        categories = sorted(
            {
                p.category_type
                for p in products_qs
                if p.category_type
            }
        )

        vendor_payload = {
            'business_name': vendor.business_name,
            'about_vendor': vendor.about_vendor,
            'city': vendor.city,
            'site_theme': vendor.site_theme,
            'site_banner_image': vendor.site_banner_image,
            'site_logo': vendor.site_logo,
            'youtube_url': vendor.youtube_url,
            'instagram_url': vendor.instagram_url,
            'whatsapp_number': vendor.whatsapp_number if vendor.whatsapp_display else None,
            'member_since': vendor.created_at.year,
            'total_products': products_qs.count(),
        }

        return Response(
            {
                'vendor': SiteVendorSerializer(vendor_payload).data,
                'featured_products': SiteProductSerializer(featured_qs, many=True, context={'request': request}).data,
                'all_products': SiteProductSerializer(products_qs, many=True, context={'request': request}).data,
                'categories': categories,
            },
            status=status.HTTP_200_OK,
        )


class PublicVendorSiteProductsView(APIView):
    """
    GET /api/site/<vendor_slug>/products/
    Filterable public product listing for one active vendor site.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, vendor_slug):
        vendor = Vendor.objects.filter(vendor_slug=vendor_slug).first()
        if not vendor:
            return Response({'detail': 'Store not found.'}, status=status.HTTP_404_NOT_FOUND)

        if vendor.site_status != 'active':
            return Response({'detail': 'Store not active'}, status=status.HTTP_403_FORBIDDEN)

        queryset = Product.objects.filter(
            vendor=vendor,
            status='approved',
            is_visible=True,
            is_active=True,
        )

        category = request.query_params.get('category', '').strip()
        tag = request.query_params.get('tag', '').strip()
        sort = request.query_params.get('sort', '').strip().lower()

        if category:
            queryset = queryset.filter(
                Q(category_type__iexact=category)
                | Q(category__slug__iexact=category)
                | Q(category__name__iexact=category)
            )

        if tag:
            normalized = tag.lower()
            tag_query = Q(product_tag__icontains=tag) | Q(tags__icontains=tag)
            if normalized == 'bestseller':
                tag_query = tag_query | Q(is_bestseller=True)
            if normalized == 'new':
                tag_query = tag_query | Q(is_new_arrival=True)
            queryset = queryset.filter(tag_query)

        if sort == 'price_asc':
            queryset = queryset.order_by('price', 'product_order', '-created_at')
        elif sort == 'price_desc':
            queryset = queryset.order_by('-price', 'product_order', '-created_at')
        elif sort == 'newest':
            queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('product_order', '-created_at')

        return Response(
            SiteProductSerializer(queryset, many=True, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class PublicVendorSiteAboutView(APIView):
    """
    GET /api/site/<vendor_slug>/about/
    Return vendor about-page payload.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, vendor_slug):
        vendor = Vendor.objects.filter(vendor_slug=vendor_slug).first()
        if not vendor:
            return Response({'detail': 'Store not found.'}, status=status.HTTP_404_NOT_FOUND)

        if vendor.site_status != 'active':
            return Response({'detail': 'Store not active'}, status=status.HTTP_403_FORBIDDEN)

        product_count = Product.objects.filter(
            vendor=vendor,
            status='approved',
            is_visible=True,
            is_active=True,
        ).count()
        delivered_count = Order.objects.filter(vendor=vendor, order_status='delivered').count()

        payload = {
            'business_name': vendor.business_name,
            'about_vendor': vendor.about_vendor,
            'site_logo': vendor.site_logo,
            'site_banner_image': vendor.site_banner_image,
            'youtube_url': vendor.youtube_url,
            'instagram_url': vendor.instagram_url,
            'member_since': vendor.created_at.year,
            'product_count': product_count,
            'total_orders_delivered': delivered_count,
        }

        return Response(SiteAboutSerializer(payload).data, status=status.HTTP_200_OK)
