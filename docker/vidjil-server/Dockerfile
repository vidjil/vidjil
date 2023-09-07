from ubuntu:20.04

label version="1.1"
label description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algoright and browser/server."


#INSTALL REQUIREMENTS
#ARG user=py4web
run apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y ca-certificates wget cron unzip make git python python3.8 python3-pip python3-dev python3-gdbm python3-setuptools uwsgi-src uuid-dev libcap-dev libpcre3-dev gcc memcached htop nano && \
    service memcached restart && \
	pip3 install setuptools  && \
	pip3 install setuptools-rust && \
	pip3 install wheel && \
	pip3 install renoir==1.5.2 && \
	pip3 install ombott && \
	pip3 install rocket3 && \
	pip3 install uwsgi && \
	pip3 install markdown && \
	pip3 install --upgrade pip && \
	pip3 install flower && \
	pip3 install coverage && \
    python3 -m pip install -U py4web

#run apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y -q sudo curl apt-utils uwsgi-plugin-python



# COPY LATEST VIDJIL DEPOSITORY
arg git_branch=dev
arg remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
run cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo

#ADD ./vidjil /usr/share/vidjil

run cd /usr/share/vidjil/server/py4web && make install 
run cd /usr/share/vidjil/server/py4web && py4web setup -Y apps 



# INSTALL UWSGI
run mkdir /usr/lib/uwsgi
run mkdir /usr/lib/uwsgi/plugins
run PYTHON=python3.8 uwsgi --build-plugin "/usr/src/uwsgi/plugins/python python38"
run mv python38_plugin.so /usr/lib/uwsgi/plugins/python38_plugin.so
run chmod 644 /usr/lib/uwsgi/plugins/python38_plugin.so


run mkdir -p /etc/uwsgi/sites
COPY ./conf/uwsgi.ini /etc/uwsgi/sites/uwsgi.ini


# INSTALL LATEST VIDJIL ALGO
run wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 /usr/share/vidjil/vidjil-algo && cd /usr/share/vidjil/ && chmod +x vidjil-algo
run cd /usr/share/vidjil/germline/ && make


copy ./scripts/* /entrypoints/
run mkdir /usr/share/vidjil/server/py4web/apps/vidjil/databases && touch /usr/share/vidjil/server/py4web/apps/vidjil/databases/sql.log
run mkdir /var/vidjil
run touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log
run chown -R www-data:www-data /usr/share/vidjil
run chown -R www-data:www-data /usr/share/vidjil/server/py4web/apps/vidjil/databases
run chmod 644 -R /usr/share/vidjil/server/py4web/apps/vidjil/databases


run useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil


RUN echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

env GOSU_VERSION 1.10

RUN wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture)" \
	&& wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$(dpkg --print-architecture).asc" \
	&& export GNUPGHOME="$(mktemp -d)" \
	&& for i in $(seq 1 3); do \
              gpg --keyserver ipv4.pool.sks-keyservers.net --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4 \
              && gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu \
              && break || sleep 5; \
           done\
	&& rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc \
	&& chmod +x /usr/local/bin/gosu
