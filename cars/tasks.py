from celery import shared_task

from .import_pipeline import analyze_import, publish_reviewed_import


@shared_task(bind=True, name="cars.process_import")
def process_import(self, job_id):
    return analyze_import(job_id).pk


@shared_task(bind=True, name="cars.publish_import")
def publish_import(self, job_id):
    return publish_reviewed_import(job_id).pk
