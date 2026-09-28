import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import CustomUser
from .models import Car, CarBrand, CarImportJob, CarModel, CarPart, PartCategory


class ImportJobApiTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_dir = tempfile.TemporaryDirectory()
        cls.media_override = override_settings(MEDIA_ROOT=cls.media_dir.name)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        cls.media_dir.cleanup()
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.staff = CustomUser.objects.create_user(username="import-admin", email="import-admin@example.com", password="pass", is_staff=True)
        self.user = CustomUser.objects.create_user(username="import-user", email="import-user@example.com", password="pass")

    def payload(self, name="car.glb"):
        return {
            "source_file": SimpleUploadedFile(name, b"glTF" + b"\0" * 16, content_type="model/gltf-binary"),
            "brand": "Example", "model": "Model", "year": "2024",
            "generation": "", "description": "", "specifications": "{}",
        }

    def test_import_upload_is_staff_only_and_extension_limited(self):
        url = "/api/manage/import-jobs/"
        self.assertEqual(self.client.post(url, self.payload(), format="multipart").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(url, self.payload(), format="multipart").status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.staff)
        rejected = self.client.post(url, self.payload("model.exe"), format="multipart")
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        created = self.client.post(url, self.payload(), format="multipart")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["uploaded_by"], self.staff.id)
        self.assertEqual(created.data["status"], CarImportJob.Status.FAILED)
        self.assertIn("Celery", created.data["error_message"])
        self.assertEqual(Car.objects.count(), 0)

    def test_review_requires_each_source_island_and_keeps_unknown_safe(self):
        self.client.force_authenticate(self.staff)
        job = CarImportJob.objects.create(
            uploaded_by=self.staff,
            source_file=SimpleUploadedFile("source.glb", b"glTF"),
            brand="Test", model="Car", year=2022,
            status=CarImportJob.Status.READY_FOR_REVIEW,
            component_manifest=[{
                "component_id": "mesh_body_01", "name": "Object", "category": "UNKNOWN",
                "confidence": "UNKNOWN", "source_objects": ["Object"], "source_nodes": ["AA_mesh_body_01"],
                "source_keys": ["Object::1"], "triangles": 12, "disabled": False,
            }],
        )
        url = f"/api/manage/import-jobs/{job.id}/review/"
        invalid = self.client.patch(url, {"components": []}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        accepted = self.client.patch(url, {"components": [{**job.component_manifest[0], "name": "Unknown source mesh", "category": "UNKNOWN"}]}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(job.__class__.objects.get(pk=job.pk).review_manifest[0]["source_keys"], ["Object::1"])

    def test_cinematic_sections_are_based_on_published_component_data(self):
        self.client.force_authenticate(self.user)
        brand = CarBrand.objects.create(name="Example", logo_url="")
        model = CarModel.objects.create(brand=brand, name="Roadster")
        car = Car.objects.create(car_model=model, year=2020, description="", model_url="/assets/test.glb", image_url="")
        category = PartCategory.objects.create(name="BODY", description="")
        CarPart.objects.create(car=car, category=category, name="Body", component_id="body", description="", function="")
        response = self.client.get(f"/api/cars/{car.id}/cinematic/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {section["id"] for section in response.data["story_sections"]}
        self.assertNotIn("engine", ids)
        self.assertNotIn("interior", ids)
        self.assertIn("anatomy", ids)
