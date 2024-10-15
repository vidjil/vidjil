FROM nginx:1.27-alpine-slim AS builder

# Install requirements and clean-up
RUN apk update && \
	apk add --no-interactive --progress --purge curl make unzip tar wget gcc musl-dev g++ zlib-dev

RUN mkdir -p /usr/share/vidjil

# Copy vidjil data
COPY --chown=nginx:nginx browser/ /usr/share/vidjil/browser/
COPY --chown=nginx:nginx germline/ /usr/share/vidjil/germline/
COPY --chown=nginx:nginx tools/ /usr/share/vidjil/tools/

# Build and prepare
RUN cd /usr/share/vidjil/browser/ && make icons sha1 && \
	cd /usr/share/vidjil/germline/ && make

# Build cgi (if need be)
# COPY --chown=nginx:nginx algo/ /usr/share/vidjil/algo/
# RUN cd /usr/share/vidjil/algo/ && make forcedep && make all && \
# 	cp /usr/share/vidjil/tools/align.cgi /usr/share/vidjil/browser/cgi/ && \
# 	cp /usr/share/vidjil/tools/similarity.cgi /usr/share/vidjil/browser/cgi/

FROM nginx:1.27-alpine-slim

LABEL version="1.2"
LABEL description="An NGINX-alpine-slim based docker image which comes \
with a full installation of the Vidjil client."

# Install requirements and clean-up
RUN apk update && \
	apk add --no-interactive --progress --purge libstdc++ bash fcgiwrap spawn-fcgi

# Prepare install directories and prompt
ARG build_env='PRODUCTION'
ENV BUILD_ENV=$build_env
RUN mkdir -p /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/web2py && \
	chown nginx:nginx /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/web2py/ && \
	rm /etc/nginx/conf.d/default.conf && chown nginx:nginx /etc/nginx/conf.d/ && \
	echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc && \
	echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

# Switch to nginx user
RUN sed -i 's/^\(user .*\)$/user nginx;/' /etc/nginx/nginx.conf
USER nginx:nginx

# Copy vidjil data
COPY --from=builder --chown=nginx:nginx /usr/share/vidjil/browser/ /usr/share/vidjil/browser/
COPY --from=builder --chown=nginx:nginx /usr/share/vidjil/germline/ /usr/share/vidjil/germline/
COPY --chown=nginx:nginx docker/vidjil-client/conf/Gemfile /usr/share/vidjil/Gemfile
COPY --chown=nginx:nginx docker/vidjil-client/scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
COPY --chown=nginx:nginx docker/vidjil-client/scripts/install.sh /opt/install_scripts/install.sh

# Prepare
RUN bash /opt/install_scripts/install.sh && \
	ln -s /etc/vidjil/nginx_gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf && \
	ln -s /etc/vidjil/nginx_gzip.conf /etc/nginx/conf.d/web2py/gzip.conf && \
	ln -s /etc/vidjil/uwsgi.conf /etc/nginx/conf.d/web2py/uwsgi.conf && \
	ln -s /usr/share/vidjil/browser /usr/share/vidjil/b

# Switch back to root to perform operations in entrypoints
USER root:root
