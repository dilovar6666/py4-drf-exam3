"""Import only audited source exhibits. No products or compatibility are invented."""
import json
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from cars.models import CarBrand, CarModel, Car, CarPart, PartCategory


class Command(BaseCommand):
    help = 'Idempotently import the six prepared source vehicles and their reviewed semantic assemblies.'

    def add_arguments(self, parser):
        parser.add_argument('--origin', default='http://127.0.0.1:4174')
        parser.add_argument('--vehicle', help='Limit mapping synchronization to one prepared vehicle ID.')
        parser.add_argument('--dry-run', action='store_true')

    @transaction.atomic
    def handle(self, *args, **options):
        frontend = Path(settings.BASE_DIR) / 'car-concept-3d-dashboard'
        definitions = json.loads((frontend/'src/models/vehicles.json').read_text(encoding='utf-8'))
        if options['vehicle']:
            definitions = [row for row in definitions if row['id'] == options['vehicle']]
            if not definitions:
                raise CommandError(f"Unknown prepared vehicle ID: {options['vehicle']}")
        imported = []
        for definition in definitions:
            asset = frontend/'assets/models'/definition['file']
            if not asset.is_file():
                raise FileNotFoundError(asset)
            brand, _ = CarBrand.objects.get_or_create(name=definition['brand'], defaults={'logo_url':''})
            model, _ = CarModel.objects.get_or_create(brand=brand, name=definition['name'])
            url = options['origin'].rstrip('/')+'/assets/models/'+definition['file']
            preview_url = options['origin'].rstrip('/')+'/vehicle-previews/'+definition.get('preview', definition['id']+'.png')
            car, created = Car.objects.get_or_create(car_model=model, year=definition['year'], defaults={
                'description':definition['notes'], 'model_url':url,
                'image_url':preview_url, 'is_active':True})
            # Restrict updates to this exact new source exhibit; do not touch Audi/other cars.
            car.model_url=url
            car.image_url=preview_url
            car.save(update_fields=['model_url','image_url'])
            for component in definition['components']:
                category,_=PartCategory.objects.get_or_create(name=component['category'].title(), defaults={'description':'Vehicle geometry system.'})
                CarPart.objects.update_or_create(car=car,component_id=component['id'],defaults={
                    'category':category,'name':component['name'],'description':component['description'],
                    'function':'Educational geometry assembly; exact technical specifications are not documented by this source.', 'image_url':car.image_url})
            imported.append({'key':definition['id'],'car_id':car.id,'created':created,'components':len(definition['components'])})
        if options['dry_run']:
            transaction.set_rollback(True)
        self.stdout.write(json.dumps({'dry_run':options['dry_run'],'vehicles':imported,'products_created':0,'compatibility_created':0}))
