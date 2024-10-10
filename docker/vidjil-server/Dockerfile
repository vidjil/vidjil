FROM ubuntu:24.04

LABEL version="1.2"
LABEL description="An Ubuntu 24 based docker image which comes \
with a full installation of the Vidjil algorithm and browser/server."

# This file need to be in the directory used to launch the docker image build
# If you build it manually, copy this file here from vidjil root directory 
COPY ./requirements.txt ./requirements.txt

# Install requirements and clean-up
RUN apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests -y wget make gosu python-is-python3 python3-pip python3-dev gcc && \ 
    pip install -r ./requirements.txt --break-system-packages --no-cache-dir && \
    apt-get remove -y gcc && apt-get autoremove -y && apt-get autoclean -y && rm -rf /var/lib/apt/lists/*
# Prepare install directories and prompt
RUN mkdir -p /usr/share/vidjil /etc/uwsgi/sites /var/vidjil && chown www-data:www-data -R /usr/share/vidjil /etc/uwsgi/sites /var/vidjil && \
    echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

# Switch to www-data user
USER www-data:www-data

# Copy vidjil data and prepare data
COPY --chown=www-data:www-data server/py4web/apps/ /usr/share/vidjil/server/py4web/apps/
COPY --chown=www-data:www-data tools/ /usr/share/vidjil/tools/
COPY --chown=www-data:www-data germline/ /usr/share/vidjil/germline/
COPY --chown=www-data:www-data docker/vidjil-server/conf/uwsgi.ini /etc/uwsgi/sites/uwsgi.ini
COPY --chown=www-data:www-data docker/vidjil-server/scripts/* /entrypoints/
RUN rm -Rf /usr/share/vidjil/server/py4web/apps/vidjil/databases && mkdir /usr/share/vidjil/server/py4web/apps/vidjil/databases && touch /usr/share/vidjil/server/py4web/apps/vidjil/databases/sql.log && \
    touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log

# Setup py4web
RUN cd /usr/share/vidjil/server/py4web && py4web setup -Y apps && rm -Rf apps/_default apps/_minimal apps/_scaffold apps/_documentation apps/showcase 

# Install latest vidjil algo and build germline
RUN cd /usr/share/vidjil && wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 vidjil-algo && chmod +x vidjil-algo
RUN cd /usr/share/vidjil/germline/ && make

# Switch back to root to perform operations in entrypoints
USER root:root
