import json
from unittest.mock import patch

from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import CustomUser

from cars.models import Car, CarBrand, CarModel, CarPart, PartCategory

from .models import PartBrand, PartCompatibility, ProductCategory, SparePart
from .services import build_external_query, external_search, normalize_exa_results


class PublicShopApiTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(CustomUser.objects.create_user(username="shop-reader", email="shop@example.com", password="test"))
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

    def test_catalog_is_read_only_for_authenticated_users(self):
        get_response = self.client.get(reverse("spare-part-list"))
        post_response = self.client.post(reverse("spare-part-list"), {}, format="json")

        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(post_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_guest_cannot_read_store_or_search(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("spare-part-list")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get("/api/shop/search/?q=engine").status_code, status.HTTP_401_UNAUTHORIZED)

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

    def test_unified_local_search_finds_parts_components_and_truthful_external_status(self):
        # This contract explicitly covers local search when the external provider is absent,
        # even when the developer's .env contains a real EXA_API_KEY.
        with patch.dict("os.environ", {"EXA_API_KEY": ""}):
            response = self.client.get(
                reverse("parts-search"), {"q": "engine", "car": self.car.id, "external": "1"}
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["local"]["products"][0]["id"], self.spare_part.id)
        self.assertEqual(response.data["local"]["components"][0]["component_id"], "engine")
        self.assertFalse(response.data["external"]["available"])
        self.assertEqual(response.data["external"]["error_code"], "EXTERNAL_SEARCH_NOT_CONFIGURED")
        self.assertEqual(response.data["external"]["results"], [])

    def test_local_search_supports_oem_number_and_rejects_short_queries(self):
        found = self.client.get(reverse("parts-search"), {"q": "OEM-0"})
        short = self.client.get(reverse("parts-search"), {"q": "x"})
        self.assertEqual(found.status_code, status.HTTP_200_OK)
        self.assertEqual(found.data["local"]["products"][0]["oem_number"], self.spare_part.oem_number)
        self.assertEqual(short.status_code, status.HTTP_400_BAD_REQUEST)

    def test_external_query_uses_real_vehicle_component_and_part_number(self):
        query = build_external_query("replacement OEM-0", car=self.car, component=self.car_part)
        for known_value in ("Car Brand", "Car Model", str(self.car.year), "Engine", "OEM-0", "replacement"):
            self.assertIn(known_value, query)
        self.assertNotIn("unknown-manufacturer", query)

    def test_exa_results_are_normalized_and_unsafe_urls_rejected(self):
        results = normalize_exa_results({"results": [
            {"title": "Radiator", "url": "https://parts.example/radiator", "highlights": ["Fits selected assembly"]},
            {"title": "Bad scheme", "url": "javascript:alert(1)"},
            {"title": "Missing URL"},
            {"title": "FTP result", "url": "ftp://parts.example/item"},
        ]})
        self.assertEqual(results, [{
            "title": "Radiator", "url": "https://parts.example/radiator",
            "snippet": "Fits selected assembly", "source": "parts.example",
        }])

    def test_exa_search_uses_server_key_and_normalizes_response(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self, limit):
                return json.dumps({"results": [{"title": "Radiator listing", "url": "https://catalog.example/1", "text": "Catalog content"}]}).encode()
        with patch.dict("os.environ", {"EXA_API_KEY": "mock-exa-key"}), patch("shop.services.urlopen", return_value=Response()) as request_call:
            result = external_search("radiator OEM-0", car=self.car, component=self.car_part)
        self.assertTrue(result["available"])
        self.assertEqual(result["provider"], "Exa Search")
        self.assertEqual(result["results"][0]["title"], "Radiator listing")
        self.assertEqual(result["results"][0]["url"], "https://catalog.example/1")
        request = request_call.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.exa.ai/search")
        self.assertEqual(request.get_header("X-api-key"), "mock-exa-key")
        sent = json.loads(request.data)
        self.assertIn("Car Brand", sent["query"])
        self.assertIn("OEM-0", sent["query"])

    def test_exa_missing_key_and_failed_response_are_honest(self):
        with patch.dict("os.environ", {"EXA_API_KEY": ""}):
            missing = external_search("brake pad", car=self.car, component=self.car_part)
        self.assertFalse(missing["available"])
        self.assertEqual(missing["error_code"], "EXTERNAL_SEARCH_NOT_CONFIGURED")
        with patch.dict("os.environ", {"EXA_API_KEY": "mock-exa-key"}), patch("shop.services.urlopen", side_effect=TimeoutError):
            failed = external_search("brake pad", car=self.car, component=self.car_part)
        self.assertTrue(failed["available"])
        self.assertEqual(failed["error_code"], "EXTERNAL_SEARCH_FAILED")
        self.assertEqual(failed["results"], [])
