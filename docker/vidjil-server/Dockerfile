FROM python:3.12-slim AS builder

# Install system requirements for build
RUN apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests -y wget make gcc build-essential

# Prepare install directories
RUN mkdir -p /usr/share/vidjil/ /var/www/ && chown www-data:www-data -R /usr/share/vidjil/ /var/www/

# Switch to www-data user
USER www-data:www-data

# Install python requirements in venv
ENV PATH="$PATH:/usr/share/vidjil/venv/bin/"
COPY ./requirements.txt ./requirements.txt
RUN python3 -m venv /usr/share/vidjil/venv && . /usr/share/vidjil/venv/bin/activate && pip install -r ./requirements.txt --no-cache-dir

# Copy vidjil data
COPY --chown=www-data:www-data server/py4web/apps/ /usr/share/vidjil/server/py4web/apps/
COPY --chown=www-data:www-data tools/ /usr/share/vidjil/tools/
COPY --chown=www-data:www-data germline/ /usr/share/vidjil/germline/
COPY --chown=www-data:www-data demo/ /usr/share/vidjil/demo/
RUN rm -Rf /usr/share/vidjil/server/py4web/apps/vidjil/databases && mkdir /usr/share/vidjil/server/py4web/apps/vidjil/databases && touch /usr/share/vidjil/server/py4web/apps/vidjil/databases/sql.log   

# Setup py4web
RUN cd /usr/share/vidjil/server/py4web && py4web setup -Y apps && rm -Rf apps/_default apps/_minimal apps/_scaffold apps/_documentation apps/showcase 

# Install latest vidjil algo and build stuffs
RUN cd /usr/share/vidjil && wget http://www.vidjil.org/releases/vidjil-latest_x86_64 && mv vidjil-latest_x86_64 vidjil-algo && chmod +x vidjil-algo
RUN cd /usr/share/vidjil/germline/ && make && \
    cd /usr/share/vidjil/demo/ && make light


FROM python:3.12-slim AS vidjil-server

LABEL version="1.2"
LABEL description="A Python 3.12-slim based docker image which comes \
    with a full installation of the Vidjil algorithm and server."

# Install requirements and clean-up
RUN apt-get update && \
    apt-get install --no-install-recommends --no-install-suggests -y gosu procps && \ 
    apt-get autoremove -y && apt-get autoclean -y && rm -rf /var/cache/apt/* /var/lib/apt/lists/*

# Prepare install directories and prompt
RUN mkdir -p /usr/share/vidjil /var/www /etc/uwsgi/sites /var/vidjil && chown www-data:www-data -R /usr/share/vidjil /var/www /etc/uwsgi/sites /var/vidjil && \
    echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

# Switch to www-data user
USER www-data:www-data

# Copy and activate python env
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/venv/ /usr/share/vidjil/venv/
RUN . /usr/share/vidjil/venv/bin/activate

# Copy vidjil data
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/server/py4web/apps/ /usr/share/vidjil/server/py4web/apps/
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/tools/ /usr/share/vidjil/tools/
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/germline/ /usr/share/vidjil/germline/
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/demo/ /usr/share/vidjil/demo/
COPY --from=builder --chown=www-data:www-data /usr/share/vidjil/vidjil-algo /usr/share/vidjil/vidjil-algo
COPY --chown=www-data:www-data docker/vidjil-server/conf/uwsgi.ini /etc/uwsgi/sites/uwsgi.ini
COPY --chown=www-data:www-data docker/vidjil-server/scripts/* /entrypoints/
RUN touch /var/vidjil/vidjil.log && touch /var/vidjil/vidjil-debug.log

# Switch back to root to perform operations in entrypoints
USER root:root
