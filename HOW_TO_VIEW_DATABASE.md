# 🗄️ How to View Your NativeGlow PostgreSQL Database

Your PostgreSQL database is fully operational with all marketplace data. Here are **4 ways** to view your data:

---

## **Method 1: Database Viewer Script** ⭐ EASIEST

```bash
cd backend
python view_database.py
```

This shows:

- ✅ All users, vendors, and products
- ✅ Product details (price, stock, images)
- ✅ Summary statistics
- ✅ All database configuration

**Example Output:**

```
Total Products: 9
Total Vendors: 2
Total Users: 2
Total Stock Units: 713
Total Revenue: $0.00
```

---

## **Method 2: Django Django Admin Panel** 🎨 VISUAL

### Step 1: Create a superuser

```bash
cd backend
python manage.py createsuperuser
# Enter username, email, password
```

### Step 2: Start development server

```bash
python manage.py runserver
```

### Step 3: Visit admin panel

```
http://localhost:8000/admin/
```

**In Admin Panel, you can:**

- ✅ View/edit all products, vendors, users
- ✅ Add new products manually
- ✅ Manage orders
- ✅ Change vendor status
- ✅ Add product variants & images

---

## **Method 3: Django Shell** 🐍 INTERACTIVE

```bash
cd backend
python manage.py shell
```

**Then run commands:**

```python
# View products
from products.models import Product
products = Product.objects.all()
for p in products:
    print(f"{p.title}: ${p.price} ({p.inventory_qty} in stock)")

# View vendors
from vendors.models import Vendor
vendors = Vendor.objects.all()
for v in vendors:
    print(f"{v.brand_name}: {v.products.count()} products")

# View users
from django.contrib.auth.models import User
users = User.objects.all()
users.count()  # Output: 2

# Create new product
Product.objects.create(
    title="New Product",
    sku="NEW-001",
    price=19.99,
    inventory_qty=50
)

# Query with filters
skincare = Product.objects.filter(category__name="Herbal Skincare")
print(f"Skincare products: {skincare.count()}")
```

Exit shell: `exit()`

---

## **Method 4: Direct PostgreSQL Access** 🔌 ADVANCED

### Using psql command line:

```bash
psql -U postgres -d nativeglow_db -h localhost
```

**Then run SQL commands:**

```sql
-- View all products
SELECT id, title, price, inventory_qty FROM products_product;

-- View all vendors
SELECT id, brand_name, status FROM vendors_vendor;

-- View all users
SELECT id, username, email FROM auth_user;

-- Count products by vendor
SELECT vendor_id, COUNT(*) as count
FROM products_product
GROUP BY vendor_id;

-- Find products under $20
SELECT title, price FROM products_product WHERE price < 20;

-- View product images
SELECT p.title, pi.image_url FROM products_product p
JOIN products_productimage pi ON p.id = pi.product_id LIMIT 5;
```

Exit: `\q`

---

## **Your Current Data**

| Entity              | Count                                   |
| ------------------- | --------------------------------------- |
| Users               | 2                                       |
| Vendors             | 2 (EarthLoom Naturals, Siddha Botanics) |
| Products            | 9                                       |
| Product Images      | 18                                      |
| Product Variants    | 0                                       |
| Orders              | 0                                       |
| **Total Inventory** | **713 units**                           |

### Sample Products:

- Minimal Cotton Hoodie - $31.99
- Herbal Dyed Kurta - $29.99
- Neem & Tulsi Face Wash - $10.99
- Aloe Vera Skin Gel - $8.99
- - 5 more products

---

## **Quick Recommendations**

1. **For Daily Use**: Use `python view_database.py` (Method 1)
2. **For Development**: Use Django Admin (Method 2)
3. **For Automation/Scripts**: Use Django Shell (Method 3)
4. **For Complex Queries**: Use PostgreSQL directly (Method 4)

---

## **Database Connection Details**

```
Engine:   PostgreSQL (django.db.backends.postgresql)
Database: nativeglow_db
Host:     localhost
Port:     5432
User:     postgres
```

All configured in: `backend/.env` and `backend/nativeglow_backend/settings.py`

---

## **Add New Data**

### Via Admin Panel:

1. Go to `http://localhost:8000/admin/`
2. Click "Add Product", "Add Vendor", etc.
3. Fill form and save

### Via Django Shell:

```python
from products.models import Product, Category
from vendors.models import Vendor

# Add new product
cat = Category.objects.first()
Product.objects.create(
    title="Coconut Hair Oil",
    slug="coconut-hair-oil",
    description="100% pure coconut oil",
    price=16.99,
    sku="NEW-COC-001",
    inventory_qty=100,
    category=cat
)
```

### Via Management Command:

```bash
python manage.py seed_nativeglow  # Re-seed with new sample data
```

---

✅ **All data is persistent in PostgreSQL and will survive server restarts!**
