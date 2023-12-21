FROM ubuntu:20.04

LABEL version="1.1"
LABEL description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algorithm and browser/server."


#INSTALL REQUIREMENTS
#ARG user=py4web
RUN apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y ca-certificates wget cron unzip make git python python3.8 python3-pip python3-dev python3-gdbm python3-setuptools uwsgi-src uuid-dev libcap-dev libpcre3-dev gcc memcached htop nano libffi-dev gosu && \
    service memcached restart && \
	pip3 install --upgrade pip && \
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
    pip3 install -U py4web

#RUN apt-get update ; apt-get install --no-install-recommends --no-install-suggests -y -q sudo curl apt-utils uwsgi-plugin-python



# COPY LATEST VIDJIL REPOSITORY
ARG git_branch=dev
ARG remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
RUN cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo

#ADD ./vidjil /usr/share/vidjil

RUN cd /usr/share/vidjil/server/py4web && make install 
RUN cd /usr/share/vidjil/server/py4web && py4web setup -Y apps 



# INSTALL UWSGI
RUN mkdir /usr/lib/uwsgi
RUN mkdir /usr/lib/uwsgi/plugins
RUN PYTHON=python3.8 uwsgi --build-plugin "/usr/src/uwsgi/plugins/python python38"
RUN mv python38_plugin.so /usr/lib/uwsgi/plugins/python38_plugin.so
RUN chmod 644 /usr/lib/uwsgi/plugins/python38_plugin.so


RUN mkdir -p /etc/uwsgi/sites
COPY ./conf/uwsgi.ini /etc/uwsgi/sites/uwsgi.ini


# INSTALL LATEST VIDJIL ALGO
RUN wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 /usr/share/vidjil/vidjil-algo && cd /usr/share/vidjil/ && chmod +x vidjil-algo
RUN cd /usr/share/vidjil/germline/ && make


COPY ./scripts/* /entrypoints/
RUN mkdir /usr/share/vidjil/server/py4web/apps/vidjil/databases && touch /usr/share/vidjil/server/py4web/apps/vidjil/databases/sql.log
RUN mkdir /var/vidjil
RUN touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log
RUN chown -R www-data:www-data /usr/share/vidjil
RUN chown -R www-data:www-data /usr/share/vidjil/server/py4web/apps/vidjil/databases
RUN chmod 644 -R /usr/share/vidjil/server/py4web/apps/vidjil/databases


RUN useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil


RUN echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc
