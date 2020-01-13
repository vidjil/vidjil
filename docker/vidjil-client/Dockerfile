from nginx:1.15.0

label version="1.1"
label description="An NGINX based docker image which comes \
with a full installation of the Vidjil client."

run sed -i 's/^\(user .*\)$/user www-data;/' /etc/nginx/nginx.conf

run set -x \
	&& apt-get update && apt-get install -y --no-install-recommends wget make unzip git sudo curl fcgiwrap && rm -rf /var/lib/apt/lists/*

arg git_branch=dev
arg remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
run cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo

add ./scripts/install.sh /opt/install_scripts/install.sh
copy ./conf/Gemfile /usr/share/vidjil/Gemfile
copy ./conf/align.cgi /usr/share/vidjil/browser/cgi/align.cgi
copy ./conf/similarity.cgi /usr/share/vidjil/browser/cgi/similarity.cgi

run cd /usr/share/vidjil/browser/ && make icons sha1

arg build_env='PRODUCTION'
env BUILD_ENV $build_env

run mkdir /etc/vidjil
run mkdir /etc/nginx/conf.d/web2py/
run rm /etc/nginx/conf.d/default.conf
run chmod +x /opt/install_scripts/install.sh; sync && /opt/install_scripts/install.sh
run ln -s /etc/vidjil/nginx_gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf
run ln -s /etc/vidjil/nginx_gzip.conf /etc/nginx/conf.d/web2py/gzip.conf
run ln -s /etc/vidjil/uwsgi.conf /etc/nginx/conf.d/web2py/uwsgi.conf
run ln -s /etc/vidjil/germline.js /usr/share/vidjil/browser/js/germline.js

copy ./scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
run chown -R www-data:www-data /usr/share/vidjil
run useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil
