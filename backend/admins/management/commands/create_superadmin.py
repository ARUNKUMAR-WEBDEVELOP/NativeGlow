"""
Management command: create_superadmin

Seeds the database with the default Super Admin Google account.
Run this ONCE on a fresh deployment to pre-register the authorized
Google account so it can immediately log in via Google OAuth2.

Usage:
    python manage.py create_superadmin --email admin@gmail.com --name "Admin Name"

If the account already exists it will be updated to ensure
is_superadmin=True and auth_provider='google'.
"""
from django.core.management.base import BaseCommand, CommandError
from admins.models import AdminUser


class Command(BaseCommand):
    help = (
        'Seed the default Super Admin Google account. '
        'Run once after deploying to register your Google email as Super Admin.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='The Google email address that will be the Super Admin (e.g. yourname@gmail.com)',
        )
        parser.add_argument(
            '--name',
            type=str,
            default='Super Admin',
            help='Full name to display (default: "Super Admin")',
        )
        parser.add_argument(
            '--google-id',
            type=str,
            default='',
            help=(
                'Optional: Google sub (user ID) from your Google account. '
                'Leave blank — it will be filled automatically on first Google login.'
            ),
        )

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        full_name = options['name'].strip() or 'Super Admin'
        google_id = options.get('google_id', '').strip()

        if not email or '@' not in email:
            raise CommandError(f'Invalid email: {email!r}')

        # ── Check if account already exists ──────────────────────────────────
        existing = AdminUser.objects.filter(email__iexact=email).first()

        if existing:
            # Update to ensure superadmin + google auth
            updated_fields = []

            if not existing.is_superadmin:
                existing.is_superadmin = True
                updated_fields.append('is_superadmin')

            if existing.auth_provider != 'google':
                existing.auth_provider = 'google'
                updated_fields.append('auth_provider')

            if full_name and existing.full_name != full_name:
                existing.full_name = full_name
                updated_fields.append('full_name')

            if google_id and existing.google_id != google_id:
                existing.google_id = google_id
                updated_fields.append('google_id')

            if updated_fields:
                existing.save(update_fields=updated_fields)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Updated existing admin "{email}" — fields changed: {", ".join(updated_fields)}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'ℹ️  Admin "{email}" already exists and is already a Super Admin. No changes made.'
                    )
                )
            return

        # ── Create new account ────────────────────────────────────────────────
        admin = AdminUser(
            email=email,
            full_name=full_name,
            is_superadmin=True,
            auth_provider='google',
            google_id=google_id or '',
        )
        # Set an unusable password — Google OAuth2 is the login method
        admin.set_unusable_password()
        admin.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Super Admin created successfully!\n'
                f'   Email     : {email}\n'
                f'   Name      : {full_name}\n'
                f'   Provider  : Google OAuth2\n'
                f'   Password  : (none — Google login only)\n\n'
                f'Now log in at /admin/login using the Google button with this email.\n'
                f'The first login will lock your device as the active device.\n'
            )
        )
