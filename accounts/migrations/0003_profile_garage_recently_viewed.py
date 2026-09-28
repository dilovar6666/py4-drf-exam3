import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_emailverification_alter_customuser_email")]

    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(blank=True, max_length=120)),
                ("preferred_language", models.CharField(choices=[("en", "English"), ("ru", "Русский"), ("tg", "Тоҷикӣ")], default="en", max_length=2)),
                ("avatar", models.FileField(blank=True, upload_to="profiles/avatars/", validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "webp"])])),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="GarageCar",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("photo", models.FileField(upload_to="profiles/garage/", validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "webp"])])),
                ("brand", models.CharField(max_length=100)),
                ("model", models.CharField(max_length=120)),
                ("year", models.PositiveSmallIntegerField()),
                ("generation_trim", models.CharField(blank=True, max_length=120)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="garage", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="RecentlyViewed",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("car", "Car"), ("component", "Component"), ("product", "Product")], max_length=16)),
                ("object_id", models.PositiveBigIntegerField()),
                ("label", models.CharField(blank=True, max_length=200)),
                ("viewed_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recent_views", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-viewed_at"]},
        ),
        migrations.AddConstraint(
            model_name="recentlyviewed",
            constraint=models.UniqueConstraint(fields=("user", "kind", "object_id"), name="unique_recent_view"),
        ),
    ]
