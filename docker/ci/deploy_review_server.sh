#!/bin/bash

echo "TIME - before pulling docker images - $(date)"
docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
docker pull $CI_REGISTRY_IMAGE/$IMAGE_NAME_CLIENT
docker pull $CI_REGISTRY_IMAGE/$IMAGE_NAME_SERVER
docker tag $CI_REGISTRY_IMAGE/$IMAGE_NAME_CLIENT vidjil/client:test
docker tag $CI_REGISTRY_IMAGE/$IMAGE_NAME_SERVER vidjil/server:test
echo "TIME - after pulling docker images - $(date)"
docker compose version 
docker compose -f docker-compose.yml -f docker-compose-ci.yml -f docker-compose-ci-review.yml config 
docker compose down && docker compose -f docker-compose.yml -f docker-compose-ci.yml -f docker-compose-ci-review.yml up -d
docker compose exec mysql chown -R mysql:mysql /var/lib/mysql 
docker compose exec uwsgi chown -R www-data:www-data /usr/share/vidjil/server/py4web/apps/vidjil/databases /mnt/result/results /mnt/result/tmp /mnt/upload/uploads
docker compose restart uwsgi
echo "TIME - after start - $(date)"
docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 init_test_db.py"
        