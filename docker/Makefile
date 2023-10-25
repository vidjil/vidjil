.PHONY : set_rights restart restore_data

	
up:
	COMPOSE_PROFILES=minimal docker-compose up -d

down:
	docker compose down

clean_deploy:
	# Erase old container data and strat a fresh deploy; fix rights on volumes
	sudo echo "Make a clean and fresh deploy of server (minimal profile)"
	docker-compose down || true
	sudo rm -r ./volumes/vidjil_py4web_cypress || true
	COMPOSE_PROFILES=minimal docker-compose up -d
	sudo chmod 777 -R ./volumes/vidjil_py4web_cypress
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


backup_mysql:
	sudo rm -R ./volumes/vidjil_py4web_cypress/mysql_backup || true
	sudo cp -R ./volumes/vidjil_py4web_cypress/mysql ./volumes/vidjil_py4web_cypress/mysql_backup 

restore_mysql_data:
	[ -d ./volumes/vidjil_py4web_cypress/mysql_backup  ] && sudo rm -r ./volumes/vidjil_py4web_cypress/mysql  && sudo cp -R ./volumes/vidjil_py4web_cypress/mysql_backup  ./volumes/vidjil_py4web_cypress/mysql  && echo 'Restored backup' || echo "No available backup"
	docker-compose restart uwsgi mysql workers

build-server:
	docker build -t vidjil/server:py4web ./vidjil-server/

deploy_web2py:
	# Make a deploy with old fashion web2py server
	docker-compose -f docker-compose-web2py.yml -f docker-compose.override.web2py.yml up -d