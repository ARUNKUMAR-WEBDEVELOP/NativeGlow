"""
Test image upload functionality for vendor products
"""
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from vendors.models import Vendor, VendorStatus
from products.models import Product, ProductImage
from users.models import User
import os


class VendorProductImageUploadTest(TestCase):
    """Test that product images are correctly saved during product creation"""
    
    def setUp(self):
        """Create test vendor and authentication"""
        # Create user account
        self.user = User.objects.create_user(
            email='vendor@test.com',
            password='testpass123',
            first_name='Vendor',
            last_name='Test'
        )
        
        # Create vendor
        self.vendor = Vendor.objects.create(
            user=self.user,
            vendor_slug='test-vendor',
            business_name='Test Vendor',
            business_address='123 Test St',
            business_city='Test City',
            business_state='TS',
            business_country='TestLand',
            business_zipcode='12345',
            business_phone='+1234567890',
            status=VendorStatus.APPROVED.value,
            is_approved=True,
            is_active=True
        )
        
        self.client = Client()

    def create_test_image(self, name='test_image.jpg'):
        """Create a simple test image file"""
        image_content = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01'
            b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        return SimpleUploadedFile(name, image_content, content_type='image/png')

    def test_add_product_with_single_image(self):
        """Test adding product with a single image"""
        image = self.create_test_image('product1.png')
        
        data = {
            'title': 'Test Product',
            'name': 'Test Product',
            'description': 'A test product with image',
            'short_description': 'Test product',
            'category_type': 'face_wash',
            'price': '299.00',
            'available_quantity': 50,
            'is_natural_certified': False,
        }
        
        # Manually add the vendor to request for JWT context
        from rest_framework.test import APIRequestFactory
        from vendors.authentication import VendorJWTAuthentication, create_vendor_jwt_token
        
        factory = APIRequestFactory()
        request = factory.post('/api/vendor/products/add/', data, format='multipart')
        request.FILES['image'] = image
        
        # Create JWT token
        token_data = {'vendor_id': self.vendor.id}
        token = create_vendor_jwt_token(token_data)
        request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        request._vendor_id = self.vendor.id
        
        # Simulate request in view context
        from products.serializers import VendorProductCreateSerializer
        
        serializer_data = {
            **data,
            'image': image,
            'product_type': 'skincare',
            'product_attributes': {}
        }
        
        class MockRequest:
            def __init__(self):
                self.vendor = self.vendor
                self.FILES = {'image': image}
                self.data = data
                
        serializer = VendorProductCreateSerializer(
            data=serializer_data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            request.vendor = self.vendor
            request.FILES = {'image': image}
            product = serializer.save()
            
            # Verify product was created
            self.assertIsNotNone(product.id)
            print(f"✅ Product created: {product.id}")
            
            # Verify image was saved
            self.assertIsNotNone(product.image)
            print(f"✅ Primary image saved to Product: {product.image}")
            
            # Verify ProductImage was created
            product_images = ProductImage.objects.filter(product=product)
            self.assertEqual(product_images.count(), 1)
            print(f"✅ ProductImage created: {product_images.first().image_url}")
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
            self.fail(f"Serializer validation failed: {serializer.errors}")

    def test_add_product_with_multiple_images(self):
        """Test adding product with multiple images"""
        images = {
            'image': self.create_test_image('primary.png'),
            'image_1': self.create_test_image('extra1.png'),
            'image_2': self.create_test_image('extra2.png'),
        }
        
        data = {
            'title': 'Multi-Image Product',
            'name': 'Multi-Image Product',
            'description': 'A product with multiple images',
            'short_description': 'Multi-image product',
            'category_type': 'face_wash',
            'price': '399.00',
            'available_quantity': 75,
            'is_natural_certified': True,
        }
        
        from rest_framework.test import APIRequestFactory
        from vendors.authentication import create_vendor_jwt_token
        
        factory = APIRequestFactory()
        request = factory.post('/api/vendor/products/add/', data, format='multipart')
        
        # Add files to request
        for key, file_obj in images.items():
            request.FILES[key] = file_obj
        
        # Create JWT token
        token_data = {'vendor_id': self.vendor.id}
        token = create_vendor_jwt_token(token_data)
        request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        request._vendor_id = self.vendor.id
        request.vendor = self.vendor
        
        from products.serializers import VendorProductCreateSerializer
        
        serializer_data = {
            **data,
            'image': images['image'],
            'product_type': 'skincare',
            'product_attributes': {}
        }
        
        serializer = VendorProductCreateSerializer(
            data=serializer_data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            product = serializer.save()
            
            # Verify product was created
            self.assertIsNotNone(product.id)
            print(f"✅ Multi-image product created: {product.id}")
            
            # Verify primary image was saved
            self.assertIsNotNone(product.image)
            print(f"✅ Primary image saved")
            
            # Verify all ProductImages were created (1 primary + 2 extra)
            product_images = ProductImage.objects.filter(product=product)
            self.assertEqual(product_images.count(), 3)
            print(f"✅ All 3 ProductImages created")
            
            # Verify all have image URLs
            for pi in product_images:
                self.assertIsNotNone(pi.image_url)
                self.assertTrue(len(pi.image_url) > 0)
                print(f"   - Image {pi.position}: {pi.image_url}")
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
            self.fail(f"Serializer validation failed: {serializer.errors}")


if __name__ == '__main__':
    import django
    django.setup()
    
    # Run tests
    test = VendorProductImageUploadTest()
    test.setUp()
    
    print("\nTest 1: Single image upload")
    print("=" * 50)
    try:
        test.test_add_product_with_single_image()
        print("✅ Test 1 PASSED\n")
    except Exception as e:
        print(f"❌ Test 1 FAILED: {str(e)}\n")
    
    print("Test 2: Multiple images upload")
    print("=" * 50)
    try:
        test.test_add_product_with_multiple_images()
        print("✅ Test 2 PASSED\n")
    except Exception as e:
        print(f"❌ Test 2 FAILED: {str(e)}\n")
