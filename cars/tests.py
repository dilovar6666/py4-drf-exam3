from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Car,
    CarBrand,
    CarModel,
    CarPart,
    PartCategory,
    PartSource,
    PartSpecification,
    RelatedCarPart,
)


class PublicCarsApiTests(APITestCase):
    def setUp(self):
        self.brand_a = CarBrand.objects.create(
            name="Brand A",
            logo_url="https://example.com/a.png",
        )
        self.brand_b = CarBrand.objects.create(
            name="Brand B",
            logo_url="https://example.com/b.png",
        )
        self.model_a = CarModel.objects.create(brand=self.brand_a, name="Model A")
        self.model_b = CarModel.objects.create(brand=self.brand_b, name="Model B")
        self.car_a = self.create_car(self.model_a, 2024)
        self.car_b = self.create_car(self.model_b, 2023)
        self.category = PartCategory.objects.create(
            name="Engine",
            description="Engine category",
        )
        self.engine_a = self.create_part(self.car_a, "engine")
        self.engine_b = self.create_part(self.car_b, "engine")
        self.radiator_a = self.create_part(self.car_a, "radiator")
        self.specification = PartSpecification.objects.create(
            car_part=self.engine_a,
            name="Type",
            value="Test engine",
        )
        self.related = RelatedCarPart.objects.create(
            car_part=self.engine_a,
            related_part=self.radiator_a,
        )
        self.source = PartSource.objects.create(
            car_part=self.engine_a,
            title="Official source",
            url="https://example.com/source",
        )

    def create_car(self, car_model, year):
        return Car.objects.create(
            car_model=car_model,
            year=year,
            description="Test car",
            model_url="https://example.com/car.glb",
            image_url="https://example.com/car.png",
        )

    def create_part(self, car, component_id):
        return CarPart.objects.create(
            car=car,
            category=self.category,
            name=component_id.title(),
            component_id=component_id,
            description="Test component",
            function="Test function",
            image_url="https://example.com/part.png",
        )

    def test_public_catalog_is_read_only(self):
        get_response = self.client.get(reverse("car-list"))
        post_response = self.client.post(reverse("car-list"), {}, format="json")

        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(post_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_car_and_component_filters(self):
        response = self.client.get(
            reverse("car-list"),
            {"brand": self.brand_a.id, "year": 2024},
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.car_a.id)

        model_response = self.client.get(
            reverse("car-model-list"),
            {"brand": self.brand_a.id},
        )
        self.assertEqual(model_response.data["count"], 1)

        part_response = self.client.get(
            reverse("car-part-list"),
            {"car": self.car_a.id, "component_id": "engine"},
        )
        self.assertEqual(part_response.data["count"], 1)
        self.assertEqual(part_response.data["results"][0]["id"], self.engine_a.id)

    def test_component_context_and_detail_data_endpoints(self):
        component_response = self.client.get(
            reverse(
                "car-part-by-component-detail",
                args=[self.car_a.id, "engine"],
            )
        )
        self.assertEqual(component_response.status_code, status.HTTP_200_OK)
        self.assertEqual(component_response.data["id"], self.engine_a.id)

        specs = self.client.get(
            reverse("car-part-specification-list", args=[self.engine_a.id])
        )
        related = self.client.get(
            reverse("car-part-related-list", args=[self.engine_a.id])
        )
        sources = self.client.get(
            reverse("car-part-source-list", args=[self.engine_a.id])
        )

        self.assertEqual(specs.data["count"], 1)
        self.assertEqual(related.data["count"], 1)
        self.assertEqual(sources.data["count"], 1)

    def test_pagination_and_filter_work_together(self):
        for number in range(11):
            self.create_car(self.model_a, 2000 + number)

        page_one = self.client.get(reverse("car-list"), {"page_size": 5, "page": 1})
        page_two = self.client.get(reverse("car-list"), {"page_size": 5, "page": 2})
        filtered = self.client.get(
            reverse("car-list"),
            {"brand": self.brand_a.id, "page_size": 5, "page": 1},
        )

        self.assertEqual(len(page_one.data["results"]), 5)
        self.assertEqual(len(page_two.data["results"]), 5)
        self.assertEqual(filtered.data["count"], 12)
