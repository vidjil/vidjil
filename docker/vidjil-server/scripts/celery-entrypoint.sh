cd usr/share/vidjil/server/py4web
rm celerybeat-schedule
celery -b redis://redis:6379/0 -A apps.vidjil.tasks beat --loglevel=info
