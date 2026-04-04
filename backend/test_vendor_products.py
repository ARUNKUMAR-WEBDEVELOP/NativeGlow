"""
Vendor Product Management API - Test Suite
Tests all 6 endpoints with various scenarios
Run: python manage.py shell < test_vendor_products.py
"""

import json
from django.test import TestCase, Client
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from products.models import Product
from orders.models import Order, OrderItem

User = get_user_model()


class VendorProductAPITestCase(APITestCase):
    """Test suite for vendor product management endpoints"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create vendor user
        self.vendor_user = User.objects.create_user(
            username='vendor1',
            email='vendor1@test.com',
            password='testpass123'
        )
        
        # Create vendor profile
        self.vendor = Vendor.objects.create(
            user=self.vendor_user,
            company_name='Test Vendor Co.',
            phone='9876543210'
        )
        
        # Create another vendor for authorization tests
        self.other_vendor_user = User.objects.create_user(
            username='vendor2',
            email='vendor2@test.com',
            password='testpass123'
        )
        self.other_vendor = Vendor.objects.create(
            user=self.other_vendor_user,
            company_name='Other Vendor Co.',
            phone='1234567890'
        )
        
        # Get JWT token for vendor1
        refresh = RefreshToken.for_user(self.vendor_user)
        self.access_token = str(refresh.access_token)
        
        # Get JWT token for vendor2
        refresh2 = RefreshToken.for_user(self.other_vendor_user)
        self.other_access_token = str(refresh2.access_token)
        
        # Setup API client
        self.client = APIClient()
        
        # Create a test product
        self.product = Product.objects.create(
            title='Test Face Wash',
            slug='test-face-wash',
            name='Test Face Wash',
            description='A test face wash product',
            short_description='Test face wash',
            category_type='face_wash',
            price=299.00,
            available_quantity=50,
            inventory_qty=50,
            is_natural_certified=True,
            vendor=self.vendor,
            status='pending'
        )

    # ================================================================
    # TEST 1: Add Product (POST /api/vendor/products/add/)
    # ================================================================
    
    def test_add_product_success(self):
        """Test successful product creation"""
        data = {
            'title': 'Organic Shampoo',
            'name': 'Organic Shampoo',
            'description': 'A natural shampoo for healthy hair',
            'short_description': 'Natural shampoo',
            'category_type': 'shampoo',
            'price': '199.00',
            'available_quantity': 100,
            'is_natural_certified': True,
            'sku': 'SHAMP-001'
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.post('/api/vendor/products/add/', data, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'approved')
        self.assertEqual(response.data['title'], 'Organic Shampoo')
        self.assertIn('message', response.data)
        print("✅ Test 1a: Add product success - PASSED")

    def test_add_product_missing_title(self):
        """Test product creation fails without title"""
        data = {
            'description': 'Missing title field',
            'category_type': 'face_wash',
            'price': '299.00',
            'available_quantity': 50
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.post('/api/vendor/products/add/', data, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)
        print("✅ Test 1b: Add product missing title - PASSED")

    def test_add_product_no_token(self):
        """Test product creation fails without token"""
        data = {
            'title': 'Test Product',
            'description': 'Test',
            'category_type': 'face_wash',
            'price': '299.00',
            'available_quantity': 50
        }
        
        response = self.client.post('/api/vendor/products/add/', data, format='json')
        self.assertEqual(response.status_code, 401)
        print("✅ Test 1c: Add product no token - PASSED")

    # ================================================================
    # TEST 2: List Products (GET /api/vendor/products/)
    # ================================================================
    
    def test_list_products_success(self):
        """Test vendor can list their products"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/vendor/products/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.product.id)
        print("✅ Test 2a: List products success - PASSED")

    def test_list_products_vendor_scoped(self):
        """Test vendor only sees their own products"""
        # Create product for other vendor
        other_product = Product.objects.create(
            title='Other Product',
            slug='other-product',
            name='Other Product',
            description='Another vendor product',
            short_description='Other product',
            category_type='face_wash',
            price=199.00,
            available_quantity=30,
            inventory_qty=30,
            vendor=self.other_vendor,
            status='pending'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/vendor/products/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertNotIn(other_product.id, [p['id'] for p in response.data])
        print("✅ Test 2b: List products vendor scoped - PASSED")

    def test_list_products_no_token(self):
        """Test list fails without token"""
        response = self.client.get('/api/vendor/products/')
        self.assertEqual(response.status_code, 401)
        print("✅ Test 2c: List products no token - PASSED")

    # ================================================================
    # TEST 3: Edit Product (PUT /api/vendor/products/<id>/edit/)
    # ================================================================
    
    def test_edit_product_success(self):
        """Test successful product edit"""
        data = {
            'title': 'Premium Face Wash',
            'price': '349.00',
            'description': 'Updated description'
        }
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.put(
            f'/api/vendor/products/{self.product.id}/edit/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Premium Face Wash')
        self.assertEqual(response.data['price'], 349.00)
        print("✅ Test 3a: Edit product success - PASSED")

    def test_edit_product_keeps_approved_status(self):
        """Test editing approved product keeps status approved"""
        # Set product to approved first
        self.product.status = 'approved'
        self.product.save()
        
        data = {'title': 'New Title'}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.put(
            f'/api/vendor/products/{self.product.id}/edit/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'approved')
        self.assertIn('updated', response.data['message'].lower())
        print("✅ Test 3b: Edit product keeps approved status - PASSED")

    def test_edit_product_not_found(self):
        """Test edit fails for non-existent product"""
        data = {'title': 'New Title'}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.put(
            '/api/vendor/products/99999/edit/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 404)
        print("✅ Test 3c: Edit product not found - PASSED")

    def test_edit_other_vendor_product(self):
        """Test vendor cannot edit other vendor's product"""
        data = {'title': 'Hacked Title'}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.other_access_token}')
        response = self.client.put(
            f'/api/vendor/products/{self.product.id}/edit/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 403)
        print("✅ Test 3d: Edit other vendor product - PASSED")

    # ================================================================
    # TEST 4: Delete Product (DELETE /api/vendor/products/<id>/delete/)
    # ================================================================
    
    def test_delete_product_success(self):
        """Test successful product deletion"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.delete(
            f'/api/vendor/products/{self.product.id}/delete/'
        )
        
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())
        print("✅ Test 4a: Delete product success - PASSED")

    def test_delete_product_not_found(self):
        """Test delete fails for non-existent product"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.delete('/api/vendor/products/99999/delete/')
        
        self.assertEqual(response.status_code, 404)
        print("✅ Test 4b: Delete product not found - PASSED")

    def test_delete_other_vendor_product(self):
        """Test vendor cannot delete other vendor's product"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.other_access_token}')
        response = self.client.delete(
            f'/api/vendor/products/{self.product.id}/delete/'
        )
        
        self.assertEqual(response.status_code, 403)
        print("✅ Test 4c: Delete other vendor product - PASSED")

    def test_delete_product_with_active_orders(self):
        """Test cannot delete product with active orders"""
        # Create order with this product
        order = Order.objects.create(
            customer_name='Test Customer',
            customer_email='customer@test.com',
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=5,
            price=self.product.price
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.delete(
            f'/api/vendor/products/{self.product.id}/delete/'
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('active orders', response.data['detail'].lower())
        print("✅ Test 4d: Delete product with active orders - PASSED")

    # ================================================================
    # TEST 5: Toggle Availability (PATCH /api/vendor/products/<id>/status/)
    # ================================================================
    
    def test_toggle_status_to_unavailable(self):
        """Test marking product as unavailable"""
        self.product.is_active = True
        self.product.save()
        
        data = {'is_available': False}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/status/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_active'])
        print("✅ Test 5a: Toggle status to unavailable - PASSED")

    def test_toggle_status_to_available(self):
        """Test marking product as available"""
        self.product.is_active = False
        self.product.save()
        
        data = {'is_available': True}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/status/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_active'])
        print("✅ Test 5b: Toggle status to available - PASSED")

    def test_toggle_status_missing_field(self):
        """Test status toggle fails without is_available field"""
        data = {}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/status/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✅ Test 5c: Toggle status missing field - PASSED")

    def test_toggle_status_not_found(self):
        """Test toggle fails for non-existent product"""
        data = {'is_available': False}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            '/api/vendor/products/99999/status/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 404)
        print("✅ Test 5d: Toggle status not found - PASSED")

    # ================================================================
    # TEST 6: Update Quantity (PATCH /api/vendor/products/<id>/quantity/)
    # ================================================================
    
    def test_update_quantity_success(self):
        """Test successful quantity update"""
        data = {'available_quantity': 150}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['available_quantity'], 150)
        self.assertEqual(response.data['inventory_qty'], 150)
        print("✅ Test 6a: Update quantity success - PASSED")

    def test_update_quantity_to_zero(self):
        """Test quantity can be set to zero"""
        data = {'available_quantity': 0}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['available_quantity'], 0)
        print("✅ Test 6b: Update quantity to zero - PASSED")

    def test_update_quantity_negative(self):
        """Test negative quantity rejected"""
        data = {'available_quantity': -10}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('available_quantity', response.data)
        print("✅ Test 6c: Update quantity negative rejected - PASSED")

    def test_update_quantity_invalid_type(self):
        """Test non-integer quantity rejected"""
        data = {'available_quantity': 'invalid'}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✅ Test 6d: Update quantity invalid type - PASSED")

    def test_update_quantity_missing_field(self):
        """Test quantity update fails without field"""
        data = {}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            f'/api/vendor/products/{self.product.id}/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✅ Test 6e: Update quantity missing field - PASSED")

    def test_update_quantity_not_found(self):
        """Test quantity update fails for non-existent product"""
        data = {'available_quantity': 100}
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.patch(
            '/api/vendor/products/99999/quantity/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, 404)
        print("✅ Test 6f: Update quantity not found - PASSED")


# ================================================================
# RUN TESTS
# ================================================================

if __name__ == '__main__':
    import django
    django.setup()
    
    from django.test.runner import DiscoverRunner
    test_runner = DiscoverRunner(verbosity=2)
    failures = test_runner.run_tests(['__main__'])
    
    print("\n" + "="*60)
    if failures == 0:
        print("✅ ALL TESTS PASSED!")
    else:
        print(f"❌ {failures} TEST(S) FAILED")
    print("="*60)
