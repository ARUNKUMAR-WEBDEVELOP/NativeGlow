from django.db import migrations
from django.contrib.auth.hashers import make_password

def seed_superadmins(apps, schema_editor):
    AdminUser = apps.get_model('admins', 'AdminUser')
    
    accounts = [
        {
            'email': 'samfriend090@gmail.com',
            'full_name': 'Super Admin',
            'password': 'aRun24@2005',
            'auth_provider': 'google',
        },
        {
            'email': 'admin@nativeglow.com',
            'full_name': 'Super Admin',
            'password': 'admin@12345',
            'auth_provider': 'email',
        },
    ]

    for acc in accounts:
        user = AdminUser.objects.filter(email__iexact=acc['email']).first()
        if not user:
            AdminUser.objects.create(
                email=acc['email'],
                full_name=acc['full_name'],
                password=make_password(acc['password']),
                is_superadmin=True,
                auth_provider=acc['auth_provider'],
            )
        else:
            user.is_superadmin = True
            user.password = make_password(acc['password'])
            user.save(update_fields=['is_superadmin', 'password'])

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('admins', '0007_adminuser_active_device_id_adminuser_auth_provider_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_superadmins, reverse_func),
    ]
