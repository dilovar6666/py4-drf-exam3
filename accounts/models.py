from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.core.validators import FileExtensionValidator


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.username


class EmailVerification(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class UserCar(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="saved_cars",
    )
    car = models.ForeignKey(
        "cars.Car",
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.car}"


class Profile(models.Model):
    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        RUSSIAN = "ru", "Русский"
        TAJIK = "tg", "Тоҷикӣ"

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=120, blank=True)
    preferred_language = models.CharField(
        max_length=2, choices=Language.choices, default=Language.ENGLISH
    )
    avatar = models.FileField(
        upload_to="profiles/avatars/", blank=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.user.get_username()


class GarageCar(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="garage")
    photo = models.FileField(
        upload_to="profiles/garage/",
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=120)
    year = models.PositiveSmallIntegerField()
    generation_trim = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        if self.photo and self.photo.size > 5 * 1024 * 1024:
            raise ValidationError({"photo": "Photo must be 5 MB or smaller."})

    def __str__(self):
        return f"{self.brand} {self.model} ({self.year})"


class RecentlyViewed(models.Model):
    class Kind(models.TextChoices):
        CAR = "car", "Car"
        COMPONENT = "component", "Component"
        PRODUCT = "product", "Product"

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="recent_views")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    object_id = models.PositiveBigIntegerField()
    label = models.CharField(max_length=200, blank=True)
    viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-viewed_at"]
        constraints = [models.UniqueConstraint(fields=["user", "kind", "object_id"], name="unique_recent_view")]
