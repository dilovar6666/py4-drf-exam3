import json
from io import StringIO
from pathlib import Path
from django.conf import settings
from django.core.management import call_command
from rest_framework.test import APITestCase
from cars.models import Car, CarPart, CarBrand, CarModel
from shop.models import SparePart, PartCompatibility
from accounts.models import CustomUser


class PreparedVehicleTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(CustomUser.objects.create_user(username="prepared-reader", email="prepared@example.com", password="test"))

    def test_import_is_idempotent_and_mapping_is_vehicle_scoped(self):
        brand=CarBrand.objects.create(name='Audi',logo_url='')
        model=CarModel.objects.create(brand=brand,name='R8')
        audi=Car.objects.create(car_model=model,year=2008,description='Preserve Audi',model_url='http://localhost/assets/models/AudiR8.glb',image_url='')
        definitions=json.loads((Path(settings.BASE_DIR)/'car-concept-3d-dashboard/src/models/vehicles.json').read_text(encoding='utf-8'))
        for _ in range(2):call_command('import_prepared_vehicles',stdout=StringIO())
        self.assertEqual(Car.objects.count(),1+len(definitions))
        audi.refresh_from_db();self.assertEqual(audi.description,'Preserve Audi')
        self.assertEqual(SparePart.objects.count(),0);self.assertEqual(PartCompatibility.objects.count(),0)
        for definition in definitions:
            car=Car.objects.get(car_model__name=definition['name'])
            self.assertEqual(car.year,0)
            self.assertEqual(set(car.parts.values_list('component_id',flat=True)),{c['id'] for c in definition['components']})
            component=definition['components'][0]
            response=self.client.get(f'/api/cars/{car.id}/parts/{component["id"]}/')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.data['car'],car.id)
        self.assertEqual(CarPart.objects.count(),sum(len(d['components']) for d in definitions))

    def test_dry_run_does_not_write(self):
        call_command('import_prepared_vehicles',dry_run=True,stdout=StringIO())
        self.assertFalse(Car.objects.exists());self.assertFalse(CarPart.objects.exists())

    def test_targeted_import_only_syncs_the_selected_prepared_vehicle(self):
        call_command('import_prepared_vehicles',vehicle='ford_gt40',stdout=StringIO())
        car=Car.objects.get(car_model__name='GT40 — source exhibit')
        self.assertEqual(Car.objects.count(),1)
        self.assertEqual(car.parts.count(),63)
        self.assertEqual(SparePart.objects.count(),0)
        self.assertEqual(PartCompatibility.objects.count(),0)
