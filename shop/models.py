from django.db import models

from accounts.models import CustomUser


class PartBrand(models.Model):
    name = models.CharField(max_length=100)
    logo_url = models.URLField()
    website_url = models.URLField()

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name


class SparePart(models.Model):
    brand = models.ForeignKey(
        PartBrand,
        on_delete=models.CASCADE,
        related_name="spare_parts",
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.CASCADE,
        related_name="spare_parts",
    )
    car_part = models.ForeignKey(
        "cars.CarPart",
        on_delete=models.SET_NULL,
        related_name="spare_parts",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100)
    oem_number = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return f"{self.brand} {self.name}"


class SparePartImage(models.Model):
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image_url = models.URLField()

    def __str__(self):
        return f"Image for {self.spare_part}"


class PartCompatibility(models.Model):
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        related_name="compatibilities",
    )
    car = models.ForeignKey(
        "cars.Car",
        on_delete=models.CASCADE,
        related_name="compatible_spare_parts",
    )

    def __str__(self):
        return f"{self.spare_part} - {self.car}"


class Favorite(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "spare_part"],
                name="unique_user_favorite_spare_part",
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.spare_part}"


class Cart(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.spare_part} x {self.quantity}"
