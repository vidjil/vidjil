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

copy ./conf/nginx_gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf
copy ./conf/nginx_gzip.conf /etc/nginx/conf.d/web2py/gzip.conf
copy ./conf/uwsgi.conf /etc/nginx/conf.d/web2py/uwsgi.conf
add ./scripts/install.sh /opt/install_scripts/install.sh
copy ./conf/conf.js /opt/vidjil_conf/conf.js
copy ./conf/conf_http.js /opt/vidjil_conf/conf_http.js
copy ./conf/nginx_web2py /opt/vidjil_conf/web2py
copy ./conf/nginx_web2py_http /opt/vidjil_conf/web2py_http
copy ./conf/Gemfile /usr/share/vidjil/Gemfile
copy ./conf/align.cgi /usr/share/vidjil/browser/cgi/align.cgi
copy ./conf/similarity.cgi /usr/share/vidjil/browser/cgi/similarity.cgi

run cd /usr/share/vidjil/browser/css/icons && make

arg build_env='PRODUCTION'
env BUILD_ENV $build_env

run mkdir /etc/vidjil
run rm /etc/nginx/conf.d/default.conf
run chmod +x /opt/install_scripts/install.sh; sync && /opt/install_scripts/install.sh
run ln -s /etc/vidjil/conf.js /usr/share/vidjil/browser/js/conf.js
run ln -s /etc/vidjil/germline.js /usr/share/vidjil/browser/js/germline.js

copy ./scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
run chown -R www-data:www-data /usr/share/vidjil
run useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil
