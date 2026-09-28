"""Queue operations. A missing Redis/Celery setup is surfaced to staff."""
from django.utils import timezone

from .models import CarImportJob


def _dispatch(job, task):
    try:
        result = task.delay(job.pk)
        job.celery_task_id = result.id or ""
        job.save(update_fields=["celery_task_id"])
        return True
    except Exception:
        job.status = CarImportJob.Status.FAILED
        job.error_message = "Background queue unavailable. Start Redis and a Celery worker, then retry this job."
        job.current_stage = "Queue unavailable"
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])
        return False


def enqueue_analysis(job):
    from .tasks import process_import
    return _dispatch(job, process_import)


def enqueue_publish(job):
    from .tasks import publish_import
    return _dispatch(job, publish_import)
