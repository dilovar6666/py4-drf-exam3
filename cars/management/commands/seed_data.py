from django.core.management.base import BaseCommand

from cars.models import (
    Car,
    CarBrand,
    CarModel,
    CarPart,
    PartCategory,
    PartSource,
    PartSpecification,
    RelatedCarPart,
)
from shop.models import (
    PartBrand,
    PartCompatibility,
    ProductCategory,
    SparePart,
    SparePartImage,
)


class Command(BaseCommand):
    help = "Create development catalog data for Auto Anatomy"

    def handle(self, *args, **options):
        cars = self.create_cars()
        categories = self.create_part_categories()
        car_parts = self.create_car_parts(cars, categories)
        self.create_part_details(cars, car_parts)
        self.create_spare_parts(cars, car_parts)

        self.stdout.write(self.style.SUCCESS("Auto Anatomy test data is ready."))

    def create_cars(self):
        car_data = [
            {
                "brand": "BMW",
                "model": "M3",
                "year": 2024,
                "description": "High-performance sports sedan for development testing.",
                "model_url": "https://example.com/models/bmw-m3-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=BMW+M3",
                "logo_url": "https://placehold.co/300x120?text=BMW",
            },
            {
                "brand": "Toyota",
                "model": "Supra",
                "year": 2024,
                "description": "Sports coupe used to test the 3D Lab catalog flow.",
                "model_url": "https://example.com/models/toyota-supra-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=Toyota+Supra",
                "logo_url": "https://placehold.co/300x120?text=Toyota",
            },
            {
                "brand": "Mercedes-Benz",
                "model": "Mercedes-AMG C 63",
                "year": 2024,
                "description": "Performance sedan used for frontend and API development.",
                "model_url": "https://example.com/models/mercedes-amg-c63-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=AMG+C63",
                "logo_url": "https://placehold.co/300x120?text=Mercedes-Benz",
            },
        ]

        cars = {}
        for item in car_data:
            brand, _ = CarBrand.objects.update_or_create(
                name=item["brand"],
                defaults={"logo_url": item["logo_url"]},
            )
            car_model, _ = CarModel.objects.get_or_create(
                brand=brand,
                name=item["model"],
            )
            car, _ = Car.objects.update_or_create(
                car_model=car_model,
                year=item["year"],
                defaults={
                    "description": item["description"],
                    "model_url": item["model_url"],
                    "image_url": item["image_url"],
                },
            )
            cars[item["brand"]] = car

        return cars

    def create_part_categories(self):
        category_data = {
            "Engine": "Engine and internal combustion components.",
            "Transmission": "Transmission and drivetrain components.",
            "Brakes": "Brake system components.",
            "Suspension": "Suspension and chassis components.",
            "Cooling": "Engine cooling system components.",
            "Electrical": "Electrical system components.",
            "Exhaust": "Exhaust system components.",
        }

        categories = {}
        for name, description in category_data.items():
            category, _ = PartCategory.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            categories[name] = category

        return categories

    def create_car_parts(self, cars, categories):
        part_data = [
            ("engine", "Engine", "Engine", "Produces power for the vehicle."),
            (
                "transmission",
                "Transmission",
                "Transmission",
                "Transfers engine power to the wheels.",
            ),
            (
                "front_brakes",
                "Front Brakes",
                "Brakes",
                "Slows the front wheels.",
            ),
            (
                "rear_brakes",
                "Rear Brakes",
                "Brakes",
                "Slows the rear wheels.",
            ),
            ("radiator", "Radiator", "Cooling", "Removes heat from engine coolant."),
            ("battery", "Battery", "Electrical", "Supplies electrical power."),
            ("exhaust", "Exhaust", "Exhaust", "Routes exhaust gases safely."),
            (
                "front_suspension",
                "Front Suspension",
                "Suspension",
                "Supports and controls the front wheels.",
            ),
            (
                "rear_suspension",
                "Rear Suspension",
                "Suspension",
                "Supports and controls the rear wheels.",
            ),
        ]

        car_parts = {}
        for brand_name, car in cars.items():
            for component_id, name, category_name, function in part_data:
                part, _ = CarPart.objects.update_or_create(
                    car=car,
                    component_id=component_id,
                    defaults={
                        "category": categories[category_name],
                        "name": name,
                        "description": f"{name} component for {car}.",
                        "function": function,
                        "image_url": (
                            "https://placehold.co/800x600?text="
                            f"{brand_name.replace(' ', '+')}+{name.replace(' ', '+')}"
                        ),
                    },
                )
                car_parts[(brand_name, component_id)] = part

        return car_parts

    def create_part_details(self, cars, car_parts):
        specs = {
            "engine": [
                ("Type", "Turbocharged petrol"),
                ("Displacement", "3.0 L"),
                ("Power", "Development sample"),
                ("Torque", "Development sample"),
            ],
            "transmission": [("Type", "Automatic"), ("Gears", "8")],
            "front_brakes": [("Type", "Ventilated disc"), ("Position", "Front")],
            "rear_brakes": [("Type", "Ventilated disc"), ("Position", "Rear")],
            "radiator": [("Material", "Aluminium"), ("Cooling", "Liquid")],
            "battery": [("Voltage", "12 V"), ("Type", "Automotive battery")],
            "exhaust": [("Material", "Stainless steel")],
            "front_suspension": [("Position", "Front")],
            "rear_suspension": [("Position", "Rear")],
        }

        source_urls = {
            "BMW": "https://www.bmw.com/",
            "Toyota": "https://www.toyota.com/",
            "Mercedes-Benz": "https://www.mercedes-benz.com/",
        }

        for brand_name in cars:
            for component_id, values in specs.items():
                car_part = car_parts[(brand_name, component_id)]
                for name, value in values:
                    PartSpecification.objects.update_or_create(
                        car_part=car_part,
                        name=name,
                        defaults={"value": value},
                    )

            engine = car_parts[(brand_name, "engine")]
            for related_id in ("radiator", "exhaust", "transmission"):
                RelatedCarPart.objects.get_or_create(
                    car_part=engine,
                    related_part=car_parts[(brand_name, related_id)],
                )

            for component_id in ("engine", "radiator"):
                PartSource.objects.update_or_create(
                    car_part=car_parts[(brand_name, component_id)],
                    title=f"{brand_name} official website",
                    defaults={"url": source_urls[brand_name]},
                )

    def create_spare_parts(self, cars, car_parts):
        part_brands = {
            "Bosch": ("https://www.bosch.com/", "https://placehold.co/300x120?text=Bosch"),
            "Brembo": (
                "https://www.brembo.com/",
                "https://placehold.co/300x120?text=Brembo",
            ),
            "Denso": ("https://www.denso.com/", "https://placehold.co/300x120?text=Denso"),
        }
        brand_objects = {}
        for name, (website_url, logo_url) in part_brands.items():
            brand, _ = PartBrand.objects.update_or_create(
                name=name,
                defaults={"website_url": website_url, "logo_url": logo_url},
            )
            brand_objects[name] = brand

        category_data = {
            "Engine Parts": "Replacement parts for engine systems.",
            "Brake Parts": "Replacement parts for brake systems.",
            "Cooling Parts": "Replacement parts for cooling systems.",
            "Electrical Parts": "Replacement parts for electrical systems.",
        }
        category_objects = {}
        for name, description in category_data.items():
            category, _ = ProductCategory.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            category_objects[name] = category

        spare_part_templates = [
            ("Bosch", "Engine Parts", "engine", "Engine Air Filter", "AIR", "OEM-AIR"),
            ("Brembo", "Brake Parts", "front_brakes", "Front Brake Pad Set", "PAD", "OEM-PAD"),
            ("Denso", "Cooling Parts", "radiator", "Engine Radiator", "RAD", "OEM-RAD"),
        ]

        for brand_name, car in cars.items():
            brand_code = brand_name.upper().replace("-", "").replace(" ", "")[:4]
            for maker, category, component_id, name, sku_code, oem_code in spare_part_templates:
                sku = f"{maker.upper()}-{brand_code}-{sku_code}"
                spare_part, _ = SparePart.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "brand": brand_objects[maker],
                        "category": category_objects[category],
                        "car_part": car_parts[(brand_name, component_id)],
                        "name": f"{name} for {car.car_model}",
                        "oem_number": f"{oem_code}-{brand_code}",
                        "description": "Development catalog item without price or stock data.",
                    },
                )
                image_url = f"https://placehold.co/800x600?text={sku}"
                SparePartImage.objects.get_or_create(
                    spare_part=spare_part,
                    image_url=image_url,
                )
                PartCompatibility.objects.get_or_create(
                    spare_part=spare_part,
                    car=car,
                )
