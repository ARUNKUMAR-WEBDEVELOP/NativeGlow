import os
from urllib.parse import urlparse

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from products.models import Product, ProductImage


def _safe_filename_from_path(path_or_name):
    base_name, extension = os.path.splitext(os.path.basename(path_or_name or "image"))
    safe_base_name = slugify(base_name) or "image"
    safe_extension = (extension or ".jpg").lower()
    return f"{safe_base_name}{safe_extension}"


def _target_storage_path(vendor_id, path_or_name):
    return f"products/{vendor_id}/{_safe_filename_from_path(path_or_name)}"


def _extract_storage_path_from_url(url):
    if not url:
        return None

    value = str(url).strip()
    if not value:
        return None

    if value.startswith("products/"):
        return value
    if value.startswith("/products/"):
        return value.lstrip("/")

    if value.startswith("media/"):
        return value[len("media/") :]
    if value.startswith("/media/"):
        return value[len("/media/") :]

    parsed = urlparse(value)
    path = parsed.path or ""

    marker = "/storage/v1/object/public/products/"
    if marker in path:
        relative = path.split(marker, 1)[1].lstrip("/")
        return f"products/{relative}" if relative and not relative.startswith("products/") else relative

    media_marker = "/media/"
    if media_marker in path:
        relative = path.split(media_marker, 1)[1].lstrip("/")
        return relative

    return None


def _public_products_url(storage_path, supabase_url):
    normalized = str(storage_path).lstrip("/")
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/products/{normalized}"


class Command(BaseCommand):
    help = "Backfill existing product image paths to vendor-based format: products/{vendor_id}/{filename}."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Without this flag, command runs in dry-run mode.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        dry_run = not apply_changes

        supabase_url = os.environ.get("SUPABASE_URL", "").strip()

        product_checked = 0
        product_updated = 0
        gallery_checked = 0
        gallery_updated = 0
        skipped = 0
        failures = 0

        self.stdout.write(self.style.NOTICE("Starting vendor image backfill..."))
        self.stdout.write(self.style.NOTICE(f"Mode: {'APPLY' if apply_changes else 'DRY-RUN'}"))

        queryset = Product.objects.select_related("vendor").prefetch_related("images")

        for product in queryset.iterator(chunk_size=200):
            vendor_id = getattr(product, "vendor_id", None)
            if not vendor_id:
                skipped += 1
                continue

            product_checked += 1

            # Backfill primary Product.image path
            if product.image and product.image.name:
                old_name = str(product.image.name).lstrip("/")
                new_name = _target_storage_path(vendor_id, old_name)

                if old_name != new_name:
                    try:
                        if default_storage.exists(old_name):
                            if dry_run:
                                self.stdout.write(f"[DRY-RUN] Product {product.id} primary image: {old_name} -> {new_name}")
                            else:
                                with default_storage.open(old_name, "rb") as old_file:
                                    new_name_saved = default_storage.save(new_name, ContentFile(old_file.read()))
                                if new_name_saved != old_name and default_storage.exists(old_name):
                                    default_storage.delete(old_name)
                                product.image.name = new_name_saved
                                product.save(update_fields=["image", "updated_at"])
                                product_updated += 1
                        else:
                            skipped += 1
                    except Exception as exc:
                        failures += 1
                        self.stderr.write(f"[ERROR] Product {product.id} primary image move failed: {exc}")

            # Backfill ProductImage.image_url records
            for image_row in product.images.all():
                gallery_checked += 1
                old_url = image_row.image_url
                old_path = _extract_storage_path_from_url(old_url)
                if not old_path:
                    skipped += 1
                    continue

                new_path = _target_storage_path(vendor_id, old_path)
                if old_path == new_path:
                    continue

                try:
                    if not default_storage.exists(new_path) and default_storage.exists(old_path):
                        if dry_run:
                            self.stdout.write(
                                f"[DRY-RUN] ProductImage {image_row.id} file move: {old_path} -> {new_path}"
                            )
                        else:
                            with default_storage.open(old_path, "rb") as old_file:
                                default_storage.save(new_path, ContentFile(old_file.read()))
                            if default_storage.exists(old_path):
                                default_storage.delete(old_path)

                    if supabase_url:
                        new_url = _public_products_url(new_path, supabase_url)
                    else:
                        new_url = default_storage.url(new_path)

                    if new_url != old_url:
                        if dry_run:
                            self.stdout.write(
                                f"[DRY-RUN] ProductImage {image_row.id} URL: {old_url} -> {new_url}"
                            )
                        else:
                            image_row.image_url = new_url
                            image_row.save(update_fields=["image_url"])
                            gallery_updated += 1
                except Exception as exc:
                    failures += 1
                    self.stderr.write(f"[ERROR] ProductImage {image_row.id} backfill failed: {exc}")

        self.stdout.write("\nBackfill summary:")
        self.stdout.write(f"- Products checked: {product_checked}")
        self.stdout.write(f"- Primary images updated: {product_updated}")
        self.stdout.write(f"- Gallery images checked: {gallery_checked}")
        self.stdout.write(f"- Gallery URLs updated: {gallery_updated}")
        self.stdout.write(f"- Skipped: {skipped}")
        self.stdout.write(f"- Failures: {failures}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run complete. Re-run with --apply to persist changes."))
        else:
            self.stdout.write(self.style.SUCCESS("Backfill applied successfully."))
