cd usr/share/vidjil/server/py4web
celery -b redis://redis:6379/0 -A apps.vidjil.tasks worker --loglevel=info
