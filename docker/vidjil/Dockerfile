from ubuntu:16.04

label version="1.0"
label description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algoright and browser/server."

env GOSU_VERSION 1.7
run set -x \
	&& apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/* \
	&& wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& gpg --keyserver ha.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
	&& gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
	&& rm -r "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu \
	&& apt-get purge -y --auto-remove ca-certificates wget

run echo deb http://vda.vidjil.org:8080/archive sid/all/ >> /etc/apt/sources.list
run echo deb http://vda.vidjil.org:8080/archive sid/amd64/ >> /etc/apt/sources.list
run echo deb http://vda.vidjil.org:8080/archive wheezy/all/ >> /etc/apt/sources.list
run echo deb http://vda.vidjil.org:8080/archive wheezy/amd64/ >> /etc/apt/sources.list

run echo "vidjil-server vidjil/reconfigure-webserver string nginx" > preseed.txt
run echo "vidjil-server vidjil/restart-webserver boolean false" >> preseed.txt
run echo "vidjil-server vidjil/configure-startup string none" >> preseed.txt
run echo "vidjil-server vidjil/start-services boolean false" >> preseed.txt
run echo "vidjil-server vidjil/web2py-password string VidjilAdm1n" >> preseed.txt
run echo "vidjil-server vidjil/ssl-country string AU" >> preseed.txt
run echo "vidjil-server vidjil/ssl-state string Some-State" >> preseed.txt
run echo "vidjil-server vidjil/ssl-locality string Some-Locality" >> preseed.txt
run echo "vidjil-server vidjil/ssl-organisation string Internet Widgits Pty Ltd" >> preseed.txt
run echo "vidjil-server vidjil/ssl-section string Some-Section" >> preseed.txt
run echo "vidjil-server vidjil/ssl-name string VidjilTeam" >> preseed.txt
run echo "vidjil-server vidjil/ssl-email string team@vidjil.org" >> preseed.txt

run debconf-set-selections preseed.txt
run gpg --recv-keys --keyserver vda.vidjil.org 8EA70E25
run apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y -q sudo curl apt-utils uwsgi-plugin-python nginx-full fcgiwrap
run apt-get update ; DEBIAN_FRONTEND=noninteractive apt-get -y -q --allow-unauthenticated install vidjil-archive-keyring
run apt-get update ; DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends --no-install-suggests -y -q --allow-unauthenticated vidjil-server

run cd /usr/share/vidjil/germline && make
run cd /usr/share/web2py && chown -R www-data:www-data .

#run ln -sf /dev/stdout /var/log/nginx/access.log \
#	&& ln -sf /dev/stderr /var/log/nginx/error.log

copy ./conf/gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf
copy ./conf/gzip.conf /etc/nginx/conf.d/web2py/gzip.conf
copy ./sites/nginx_conf /etc/nginx/sites-enabled/web2py
copy ./sites/nginx_conf /etc/nginx/sites-available/web2py

copy ./conf/uwsgi.ini /etc/uwsgi/apps-enabled/web2py.ini
copy ./conf/defs.py /etc/vidjil/defs.py
copy ./conf/conf.js /etc/vidjil/conf.js
copy ./scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
copy ./scripts/uwsgi-entrypoint.sh /entrypoints/uwsgi-entrypoint.sh
copy ./scripts/fuse-entrypoint.sh /entrypoints/fuse-entrypoint.sh
run mkdir /usr/share/vidjil/server/web2py/applications/vidjil/databases && touch /usr/share/vidjil/server/web2py/applications/vidjil/databases/sql.log
run touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log
run adduser vidjil && usermod -aG sudo vidjil
