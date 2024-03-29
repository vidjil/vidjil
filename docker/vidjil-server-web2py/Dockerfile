from ubuntu:18.04

label version="1.1"
label description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algoright and browser/server."

env GOSU_VERSION 1.10
run set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget cron unzip make python ipython python-enum34 python-requests git python-ijson libyajl2 python-cffi python-pip gnupg2 gcc libsasl2-dev python-dev python-setuptools libldap2-dev libssl-dev libsasl2-dev && rm -rf /var/lib/apt/lists/* \
	&& pip install python-ldap \
	&& wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& for i in $(seq 1 3); do \
              gpg --keyserver ipv4.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
              && gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
              && break || sleep 5; \
           done\
	&& rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu

run apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y -q sudo curl apt-utils uwsgi-plugin-python

arg git_branch=dev
arg remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
run cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo
run cd /usr/share/vidjil/server && make download_web2py && unzip web2py_src.zip && unlink web2py_src.zip

add ./scripts/install.sh /opt/install_scripts/install.sh
copy ./conf/defs.py /opt/vidjil_conf/defs.py
copy ./conf/defs_http.py /opt/vidjil_conf/defs_http.py

arg build_env='PRODUCTION'
env BUILD_ENV $build_env

run mkdir /etc/vidjil
copy ./conf/wsgihandler.py /etc/vidjil/wsgihandler.py
run chmod +x /opt/install_scripts/install.sh; sync && /opt/install_scripts/install.sh
run mkdir -p /etc/uwsgi/apps-enabled && ln -s /etc/vidjil/uwsgi.ini /etc/uwsgi/apps-enabled/web2py.ini
run ln -s /etc/vidjil/defs.py /usr/share/vidjil/server/web2py/applications/vidjil/modules/defs.py
run ln -s /etc/vidjil/wsgihandler.py /usr/share/vidjil/server/web2py/wsgihandler.py

run wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 /usr/share/vidjil/vidjil-algo && cd /usr/share/vidjil/ && chmod +x vidjil-algo

copy ./scripts/uwsgi-entrypoint.sh /entrypoints/uwsgi-entrypoint.sh
copy ./scripts/fuse-entrypoint.sh /entrypoints/fuse-entrypoint.sh
run mkdir /usr/share/vidjil/server/web2py/applications/vidjil/databases && touch /usr/share/vidjil/server/web2py/applications/vidjil/databases/sql.log
run mkdir /var/vidjil
run touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log
run PASSWORD=`openssl rand -base64 10` && cd /usr/share/vidjil/server/web2py && python -c "from gluon.main import save_password; save_password('${PASSWORD}',443)"
run chown -R www-data:www-data /usr/share/vidjil
run useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil
