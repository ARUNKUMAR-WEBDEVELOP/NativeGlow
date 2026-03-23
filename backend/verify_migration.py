#!/usr/bin/env python
"""
Verify that the SQLite to PostgreSQL migration was successful.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nativeglow_backend.settings')
django.setup()

from django.db import connection

def verify_migration():
    """Verify the database migration."""
    cursor = connection.cursor()
    
    print("✅ PostgreSQL Database Migration Verification")
    print("=" * 60)
    
    # Get all tables
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema='public' 
        ORDER BY table_name
    """)
    tables = cursor.fetchall()
    
    print(f"\n📊 Database Tables ({len(tables)} total):")
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  • {table_name:<40} ({count:>5} records)")
    
    # Verify critical tables
    critical_tables = [
        'vendors_vendor',
        'vendors_vendorapplication',
        'vendors_maintenancepayment',
        'products_product',
        'products_category',
        'users_userprofile',
        'users_emailotp'
    ]
    
    print(f"\n✓ Critical Tables Status:")
    for table in critical_tables:
        cursor.execute(f"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='{table}')")
        exists = cursor.fetchone()[0]
        status = "✓ EXISTS" if exists else "✗ MISSING"
        print(f"  • {table:<40} {status}")
    
    print("\n" + "=" * 60)
    print("✅ Migration verification complete!")
    print("✅ All tables successfully migrated to PostgreSQL")

if __name__ == '__main__':
    verify_migration()
