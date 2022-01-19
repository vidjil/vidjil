
install: install_py4web

install_py4web:
	python3 -m pip install --upgrade py4web --no-cache-dir --user
	pip3 install pymysql

init:
	py4web setup apps 

start:
	py4web set_password
	py4web run apps

