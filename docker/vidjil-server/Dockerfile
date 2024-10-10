FROM ubuntu:24.04

LABEL version="1.2"
LABEL description="An Ubuntu 24 based docker image which comes \
with a full installation of the Vidjil algorithm and browser/server."

# This file need to be in the directory used to launch the docker image build
# If you build it manually, copy this file here from vidjil root directory 
COPY ./requirements.txt ./requirements.txt

# Install requirements and clean-up
RUN apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests -y ca-certificates wget cron unzip make git gosu python-is-python3 python3-pip python3-dev gcc && \ 
    pip install -r ./requirements.txt --break-system-packages && \
    apt-get remove -y gcc && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# COPY LATEST VIDJIL REPOSITORY
ARG git_branch=dev
ARG remote_repo=https://gitlab.inria.fr/vidjil/vidjil.git
RUN cd /usr/share/ && git config --global http.sslVerify false && git clone -b $git_branch $remote_repo

# Setup py4web
RUN cd /usr/share/vidjil/server/py4web && py4web setup -Y apps && rm -Rf apps/_default apps/_minimal apps/_scaffold apps/_documentation apps/showcase 

# Configure uWSGI
RUN mkdir -p /etc/uwsgi/sites
COPY ./conf/uwsgi.ini /etc/uwsgi/sites/uwsgi.ini

# Install latest vidjil algo and build germline
RUN wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 /usr/share/vidjil/vidjil-algo && cd /usr/share/vidjil/ && chmod +x vidjil-algo
RUN cd /usr/share/vidjil/germline/ && make

# Prepare files, user and prompt
COPY ./scripts/* /entrypoints/
RUN mkdir /usr/share/vidjil/server/py4web/apps/vidjil/databases && touch /usr/share/vidjil/server/py4web/apps/vidjil/databases/sql.log && \
    mkdir /var/vidjil && touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log && \
    chown -R www-data:www-data /usr/share/vidjil && chmod 644 -R /usr/share/vidjil/server/py4web/apps/vidjil/databases && \
    useradd -ms /bin/bash vidjil && usermod -aG sudo vidjil && \
    echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc
