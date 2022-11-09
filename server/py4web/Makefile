
install: install_py4web

install_py4web:
	python3 -m pip install --upgrade py4web --no-cache-dir --user
	pip3 install setuptools
	pip3 install setuptools-rust
	pip3 install wheel
	pip3 install rocket3
	pip3 install --upgrade pip
	pip3 install ijson
	pip3 install pymysql
	pip3 install pytest
	pip3 install pytest-cov
	pip3 install "celery[redis]"

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

