.PHONY : up down clean_deploy reset_database set_rights restart backup_mysql restore_mysql_data backup_volume restore_volume

VOLUME_PATH := $(if $(VOLUME_PATH),$(VOLUME_PATH),"./volumes/vidjil")

up:
	docker compose up -d

up_with_times:
	date +%H:%M:%S > times.log
	$(MAKE) up
	date +%H:%M:%S >> times.log

down:
	docker compose down

restart:
	docker compose restart

set_rights:
	sudo chmod 777 -R ${VOLUME_PATH}

build-server:
	docker build --progress=plain -t vidjil/server:dev -f ./vidjil-server/Dockerfile ../

build-server-alpine:
	docker build --progress=plain -t vidjil/server:dev -f ./vidjil-server/Dockerfile-alpine ../

build-client:
	docker build --progress=plain -t vidjil/client:dev -f ./vidjil-client/Dockerfile ../

build-cypress:
	docker build --progress=plain -t vidjil/cypress:dev ./ci

deploy-local-ci-env:
	docker compose down
	sudo rm -r volumes/ci || true
	docker compose  --env-file .env-local-ci  -f docker-compose.yml -f docker-compose.override.yml -f docker-compose-ci-local.yml up -d mysql uwsgi
	sleep 10
	sudo chmod 777 -R ./volumes/ci
	docker compose  --env-file .env-local-ci -f docker-compose.yml -f docker-compose.override.yml -f docker-compose-ci-local.yml up -d
	sleep 10
	# Make a call to truncate db and refill with example/testing data
	docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/scripts/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 load-sql.py -i /usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/ci_erase.sql"
	docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 init_test_db.py"

reset_database:
	# Make a call to truncate db and refill with example/testing data
	docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/scripts/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 load-sql.py -i /usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/ci_erase.sql"
	docker compose exec -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" uwsgi bash -c "source /usr/share/vidjil/venv/bin/activate && python3 init_test_db.py"

clean_deploy:
	# Erase old container data and start a fresh deploy; fix rights on volumes
	sudo echo "Make a clean and fresh deploy of server - path : ${VOLUME_PATH}"
	$(MAKE) down
	sudo rm -r ${VOLUME_PATH} || true
	docker compose up -d mysql uwsgi
	$(MAKE) set_rights
	$(MAKE) up
	$(MAKE) reset_database
	docker ps

build_and_run_dev:
	$(MAKE) build-server build-client
	$(MAKE) run_dev

run_dev:
	ln -s docker-compose-dev.yml docker-compose.override.yml || true
	$(MAKE) down
	docker compose up -d mysql uwsgi
	$(MAKE) -C ../browser
	$(MAKE) -C ../germline
	$(MAKE) up
	docker ps

###############################
### Backup/restore MYSQL volume
backup_mysql:
	sudo rm -R ./${VOLUME_PATH}/mysql_backup || true
	sudo cp -R ./${VOLUME_PATH}/mysql ./${VOLUME_PATH}/mysql_backup 

restore_mysql_data:
	[ -d ./${VOLUME_PATH}/mysql_backup  ] && sudo rm -r ./${VOLUME_PATH}/mysql  && sudo cp -R ./${VOLUME_PATH}/mysql_backup  ./${VOLUME_PATH}/mysql  && echo 'Restored mysql backup (${VOLUME_PATH})' || echo "No available mysql backup (${VOLUME_PATH})"
	docker-compose restart uwsgi mysql workers

##############################
### Backup/restore FULL volume
backup_volume:
	sudo rm -R ./${VOLUME_PATH}_backup || true
	sudo cp -R ./${VOLUME_PATH} ./${VOLUME_PATH}_backup 

restore_volume:
	[ -d ./${VOLUME_PATH}_backup  ] && sudo rm -r ./${VOLUME_PATH} && sudo cp -R ./${VOLUME_PATH}_backup ./${VOLUME_PATH} && echo 'Restored volume backup (${VOLUME_PATH})' || echo "No available volume backup (${VOLUME_PATH})"
	docker-compose restart uwsgi mysql workers fuse

deploy_web2py:
	# Make a deploy with old fashion web2py server
	docker-compose -f docker-compose-web2py.yml -f docker-compose.override.web2py.yml up -d
