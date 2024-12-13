#!/bin/bash

docker compose version
ln -sf docker-compose-ci-review.yml docker-compose.override.yml
docker compose config
docker compose up -d
echo "TIME - after start - $(date)"
docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/scripts/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 load-sql.py -i /usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/ci_erase.sql"
docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 init_test_db.py"
