.PHONY : set_rights restart restore_data

include .env-default
include .env
include .env-web2py
	
up:
	COMPOSE_PROFILES=minimal docker-compose up -d

down:
	docker compose down

clean_deploy:
	# Erase old container data and strat a fresh deploy; fix rights on volumes
	sudo echo "Make a clean and fresh deploy of server (minimal profile)"
	docker-compose down || true
	sudo rm -r ./volumes/vidjil_py4web* || true
	COMPOSE_PROFILES=minimal docker-compose up -d
	sudo chmod 777 -R ./volumes/vidjil_py4web*
	docker exec -it -w "/usr/share/vidjil/server/py4web/apps/vidjil/scripts"           docker_uwsgi_1 python3 load-sql.py -i /usr/share/vidjil/docker/ci/ci_erase.sql
	docker exec -it -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" docker_uwsgi_1 python3 init_test_db.py
	sleep 30
	docker-compose down && docker-compose up -d
	docker ps
	
reset_database:
	# Make a call to truncate db and refill with example/testing data
	docker exec -it -w "/usr/share/vidjil/server/py4web/apps/vidjil/scripts" docker_uwsgi_1 python3 load-sql.py -i /usr/share/vidjil/docker/ci/ci_erase.sql
	docker exec -it -w "/usr/share/vidjil/server/py4web/apps/vidjil/tests/functional/" docker_uwsgi_1 python3 init_test_db.py

set_rights:
	sudo chmod 777 -R ./volumes


restart:
	docker-compose restart


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
	[ -d ./${VOLUME_PATH}_backup  ] && sudo rm -r ./${VOLUME_PATH}  && sudo cp -R ./${VOLUME_PATH}_backup   ./${VOLUME_PATH}  && echo 'Restored volume backup (${VOLUME_PATH})' || echo "No available volume backup (${VOLUME_PATH})"
	docker-compose restart uwsgi mysql workers fuse


build-server:
	docker build -t vidjil/server:py4web ./vidjil-server/

deploy_web2py:
	# Make a deploy with old fashion web2py server
	docker-compose -f docker-compose-web2py.yml -f docker-compose.override.web2py.yml up -d