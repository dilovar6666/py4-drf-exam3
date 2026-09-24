from django.db import models


class CarBrand(models.Model):
    name = models.CharField(max_length=100)
    logo_url = models.URLField()

    def __str__(self):
        return self.name


class CarModel(models.Model):
    brand = models.ForeignKey(
        CarBrand,
        on_delete=models.CASCADE,
        related_name="models",
    )
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.brand} {self.name}"


class Car(models.Model):
    car_model = models.ForeignKey(
        CarModel,
        on_delete=models.CASCADE,
        related_name="cars",
    )
    year = models.PositiveIntegerField()
    description = models.TextField()
    model_url = models.URLField()
    image_url = models.URLField()

    def __str__(self):
        return f"{self.car_model} ({self.year})"


class PartCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name


class CarPart(models.Model):
    car = models.ForeignKey(
        Car,
        on_delete=models.CASCADE,
        related_name="parts",
    )
    category = models.ForeignKey(
        PartCategory,
        on_delete=models.CASCADE,
        related_name="car_parts",
    )
    name = models.CharField(max_length=150)
    component_id = models.CharField(max_length=100)
    description = models.TextField()
    function = models.TextField()
    image_url = models.URLField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["car", "component_id"],
                name="unique_car_component_id",
            )
        ]

    def __str__(self):
        return f"{self.car}: {self.name}"


class PartSpecification(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="specifications",
    )
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.car_part}: {self.name} = {self.value}"


class RelatedCarPart(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="related_part_links",
    )
    related_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="incoming_related_part_links",
    )

    def __str__(self):
        return f"{self.car_part} -> {self.related_part}"


class PartSource(models.Model):
    car_part = models.ForeignKey(
        CarPart,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    title = models.CharField(max_length=200)
    url = models.URLField()

    def __str__(self):
        return self.title
