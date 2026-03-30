from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0009_vendor_about_vendor_vendor_google_login_enabled_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='google_email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='vendor',
            name='google_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='registered_via_google',
            field=models.BooleanField(default=False),
        ),
    ]
