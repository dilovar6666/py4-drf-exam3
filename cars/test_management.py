from rest_framework.test import APITestCase
from accounts.models import CustomUser
from cars.models import Car, CarBrand, CarModel, CarPart, PartCategory
from shop.models import PartBrand, ProductCategory, SparePart, PartCompatibility


class ManagementApiTests(APITestCase):
    def setUp(self):
        self.staff = CustomUser.objects.create_user(username="staff", email="staff@example.com", password="test", is_staff=True)
        self.user = CustomUser.objects.create_user(username="reader", email="reader@example.com", password="test")
        self.brand = CarBrand.objects.create(name="Audi", logo_url="https://example.com/logo.png")
        self.model = CarModel.objects.create(brand=self.brand, name="R8")
        self.car_data = {"car_model": self.model.id, "year": 2007, "description": "Test", "model_url": "https://example.com/AudiR8.glb", "image_url": "https://example.com/r8.png", "is_active": True}
        self.category = PartCategory.objects.create(name="Brakes", description="Brakes")
        self.product_brand = PartBrand.objects.create(name="Maker", logo_url="https://example.com/a.png", website_url="https://example.com")
        self.product_category = ProductCategory.objects.create(name="Discs", description="Discs")

    def test_all_management_resources_require_staff(self):
        from config.management_api import resources
        for resource in [*resources, "overview"]:
            self.assertEqual(self.client.get(f"/api/manage/{resource}/").status_code, 401)
        self.client.force_authenticate(self.user)
        for resource in [*resources, "overview"]:
            self.assertEqual(self.client.get(f"/api/manage/{resource}/").status_code, 403)
            self.assertEqual(self.client.post(f"/api/manage/{resource}/", {}).status_code, 403)

    def test_crud_component_mapping_and_compatibility(self):
        self.client.force_authenticate(self.staff)
        created = self.client.post("/api/manage/cars/", self.car_data, format="json")
        self.assertEqual(created.status_code, 201)
        car_id = created.data["id"]
        component = self.client.post("/api/manage/components/", {"car": car_id, "category": self.category.id, "component_id": "front_left_brake_disc", "name": "Brake disc", "description": "Description", "function": "Braking", "image_url": "https://example.com/disc.png"}, format="json")
        self.assertEqual(component.status_code, 201)
        product = self.client.post("/api/manage/products/", {"brand": self.product_brand.id, "category": self.product_category.id, "car_part": component.data["id"], "name": "Disc", "sku": "TEST-1", "oem_number": "REF", "description": "Test"}, format="json")
        self.assertEqual(product.status_code, 201)
        compatibility = self.client.post("/api/manage/compatibility/", {"car": car_id, "spare_part": product.data["id"]}, format="json")
        self.assertEqual(compatibility.status_code, 201)
        self.assertEqual(self.client.patch(f"/api/manage/cars/{car_id}/", {"is_active": False}, format="json").status_code, 200)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(f"/api/cars/{car_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/cars/{car_id}/parts/front_left_brake_disc/").data["component_id"], "front_left_brake_disc")
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.delete(f"/api/manage/compatibility/{compatibility.data['id']}/").status_code, 204)
        self.assertFalse(PartCompatibility.objects.exists())
        self.assertEqual(self.client.delete(f"/api/manage/products/{product.data['id']}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/manage/components/{component.data['id']}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/manage/cars/{car_id}/").status_code, 204)

    def test_staff_profile_and_jwt_permission(self):
        response = self.client.post("/api/auth/login/", {"email": self.staff.email, "password": "test"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertTrue(self.client.get("/api/auth/profile/").data["is_staff"])
        self.assertEqual(self.client.get("/api/manage/overview/").status_code, 200)

    def test_product_generation_creates_private_drafts_and_is_idempotent(self):
        from django.urls import reverse
        car = Car.objects.create(car_model=self.model, year=1975, description="Documented car", model_url="/assets/models/test.glb", image_url="")
        component = CarPart.objects.create(car=car, category=self.category, name="Front brake disc", component_id="front_brake_disc", description="Recorded source component", function="Brakes")
        url = reverse("manage-generate-products")
        self.assertEqual(self.client.post(url, {}, format="json").status_code, 401)
        self.client.force_authenticate(self.staff)
        first = self.client.post(url, {"car": car.id}, format="json")
        second = self.client.post(url, {"car": car.id}, format="json")
        self.assertEqual(first.data["created"], 1)
        self.assertEqual(second.data["created"], 0)
        self.assertEqual(second.data["skipped_existing"], 1)
        product = SparePart.objects.get(car_part=component)
        self.assertTrue(product.is_draft)
        self.assertIsNone(product.brand)
        self.assertEqual(product.sku, "")
        self.assertEqual(product.oem_number, "")
        self.assertEqual(PartCompatibility.objects.filter(spare_part=product, car=car).count(), 1)
        self.assertEqual(self.client.get("/api/shop/parts/").data["count"], 0)
