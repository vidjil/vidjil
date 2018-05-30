from ubuntu:16.04

label version="1.1"
label description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algoright and browser/server."

env GOSU_VERSION 1.7
run set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget cron unzip make python ipython python-enum34 python-requests git && rm -rf /var/lib/apt/lists/* \
	&& wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
	&& gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
	&& rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu \
	&& apt-get purge -y --auto-remove ca-certificates

run apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y -q sudo curl apt-utils uwsgi-plugin-python nginx-full fcgiwrap

arg git_branch=dev
arg remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
run cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo
run cd /usr/share/vidjil/server && wget --no-check-certificate https://mdipierro.pythonanywhere.com/examples/static/web2py_src.zip && unzip web2py_src.zip && unlink web2py_src.zip

run cd /usr/share/vidjil/germline && make

#run ln -sf /dev/stdout /var/log/nginx/access.log \
#	&& ln -sf /dev/stderr /var/log/nginx/error.log

copy ./conf/nginx_gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf
copy ./conf/nginx_gzip.conf /etc/nginx/conf.d/web2py/gzip.conf
copy ./conf/uwsgi.conf /etc/nginx/conf.d/web2py/uwsgi.conf
copy ./conf/nginx_web2py /etc/nginx/sites-enabled/web2py
copy ./conf/nginx_web2py /etc/nginx/sites-available/web2py

copy ./conf/uwsgi.ini /etc/uwsgi/apps-enabled/web2py.ini
run mkdir /etc/vidjil
copy ./conf/defs.py /etc/vidjil/defs.py
copy ./conf/conf.js /etc/vidjil/conf.js
run ln -s /etc/vidjil/defs.py /usr/share/vidjil/server/web2py/applications/vidjil/modules/defs.py
run ln -s /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
copy ./scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
copy ./scripts/uwsgi-entrypoint.sh /entrypoints/uwsgi-entrypoint.sh
copy ./scripts/fuse-entrypoint.sh /entrypoints/fuse-entrypoint.sh
run mkdir /usr/share/vidjil/server/web2py/applications/vidjil/databases && touch /usr/share/vidjil/server/web2py/applications/vidjil/databases/sql.log
run mkdir /var/vidjil
run touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log
run useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil

run cd /usr/share/vidjil/server/web2py && python -c "from gluon.main import save_password; save_password('default',443)"
