
install: install_py4web

install_py4web:
	python3 -m pip install --upgrade py4web --no-cache-dir --user
	pip3 install -r ../../requirements.txt


init:
	py4web setup apps 

start:
	py4web set_password
	py4web run apps

start_workers:
#	docker run -d -p 6379:6379 redis
	celery -A apps.vidjil.tasks beat
	celery -A apps.vidjil.tasks worker --loglevel=info

unit: clean_unit_tests
	python3 -m pytest --cov=vidjil --cov-report html:cov.html -v -s apps/vidjil

clean_unit_tests:
	rm -f web2py/test-reports/*.xml

