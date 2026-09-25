from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from cars.models import Car, CarBrand, CarModel, CarPart, PartCategory

from .models import PartBrand, PartCompatibility, ProductCategory, SparePart


class PublicShopApiTests(APITestCase):
    def setUp(self):
        car_brand = CarBrand.objects.create(
            name="Car Brand",
            logo_url="https://example.com/car-brand.png",
        )
        car_model = CarModel.objects.create(brand=car_brand, name="Car Model")
        self.car = Car.objects.create(
            car_model=car_model,
            year=2024,
            description="Test car",
            model_url="https://example.com/car.glb",
            image_url="https://example.com/car.png",
        )
        part_category = PartCategory.objects.create(
            name="Engine",
            description="Engine category",
        )
        self.car_part = CarPart.objects.create(
            car=self.car,
            category=part_category,
            name="Engine",
            component_id="engine",
            description="Test engine",
            function="Produces power",
            image_url="https://example.com/engine.png",
        )
        self.brand = PartBrand.objects.create(
            name="Part Brand",
            logo_url="https://example.com/part-brand.png",
            website_url="https://example.com/",
        )
        self.category = ProductCategory.objects.create(
            name="Engine Parts",
            description="Engine parts category",
        )
        self.spare_part = self.create_spare_part(0)
        PartCompatibility.objects.create(spare_part=self.spare_part, car=self.car)

    def create_spare_part(self, number):
        return SparePart.objects.create(
            brand=self.brand,
            category=self.category,
            car_part=self.car_part,
            name=f"Spare Part {number}",
            sku=f"SKU-{number}",
            oem_number=f"OEM-{number}",
            description="Test spare part",
        )

    def test_public_catalog_is_read_only(self):
        get_response = self.client.get(reverse("spare-part-list"))
        post_response = self.client.post(reverse("spare-part-list"), {}, format="json")

        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(post_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_spare_part_filters(self):
        response = self.client.get(
            reverse("spare-part-list"),
            {
                "brand": self.brand.id,
                "category": self.category.id,
                "car_part": self.car_part.id,
                "sku": self.spare_part.sku,
                "oem_number": self.spare_part.oem_number,
            },
        )

        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.spare_part.id)

    def test_compatibility_and_car_part_endpoints(self):
        compatible_response = self.client.get(
            reverse("compatible-spare-part-by-car-list", args=[self.car.id])
        )
        component_response = self.client.get(
            reverse("spare-part-by-car-part-list", args=[self.car_part.id])
        )

        self.assertEqual(compatible_response.data["count"], 1)
        self.assertEqual(component_response.data["count"], 1)
        self.assertEqual(compatible_response.data["results"][0]["id"], self.spare_part.id)

    def test_pagination_and_filter_work_together(self):
        for number in range(1, 12):
            self.create_spare_part(number)

        page_one = self.client.get(
            reverse("spare-part-list"),
            {"page_size": 5, "page": 1},
        )
        page_two = self.client.get(
            reverse("spare-part-list"),
            {"page_size": 5, "page": 2},
        )
        filtered = self.client.get(
            reverse("spare-part-list"),
            {"brand": self.brand.id, "page_size": 5},
        )

        self.assertEqual(len(page_one.data["results"]), 5)
        self.assertEqual(len(page_two.data["results"]), 5)
        self.assertEqual(filtered.data["count"], 12)
