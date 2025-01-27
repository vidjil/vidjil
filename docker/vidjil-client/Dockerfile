FROM nginx:1.27-alpine-slim AS builder

# Install requirements and clean-up
RUN apk update && \
	apk add --no-interactive --progress --purge curl make unzip tar wget gcc musl-dev g++ zlib-dev

RUN mkdir -p /usr/share/vidjil
WORKDIR /usr/share/vidjil/

# Copy vidjil data
COPY --chown=nginx:nginx browser/ browser/
COPY --chown=nginx:nginx germline/ germline/
COPY --chown=nginx:nginx tools/ tools/

# Build and prepare
RUN cd browser/ && make icons sha1 && \
	cd ../germline/ && make

# Build cgi (if need be)
# COPY --chown=nginx:nginx algo/ algo/
# RUN cd algo/ && make forcedep && make all &&  \
# 	cd ../tools && cp align.cgi ../browser/cgi/ && cp similarity.cgi ../browser/cgi/

FROM nginx:1.27-alpine-slim

LABEL version="1.2"
LABEL description="An NGINX-alpine-slim based docker image which comes \
with a full installation of the Vidjil client."

# Install requirements and clean-up
RUN apk update && \
	apk add --no-interactive --progress --purge libstdc++ openssl bash fcgiwrap spawn-fcgi

# Prepare install directories and prompt
ARG build_env='PRODUCTION'
ENV BUILD_ENV=$build_env
RUN mkdir -p /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/vidjil && \
	chown nginx:nginx /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/vidjil && \
	ln -s /usr/share/vidjil /vidjil && \
	rm /etc/nginx/conf.d/default.conf && chown nginx:nginx /etc/nginx/conf.d/ && \
	echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc && \
	echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

# Switch to nginx user
RUN sed -i 's/^\(user .*\)$/user nginx;/' /etc/nginx/nginx.conf
USER nginx:nginx
WORKDIR /usr/share/vidjil/

# Copy vidjil data
COPY --from=builder --chown=nginx:nginx /usr/share/vidjil/browser/ browser/
COPY --from=builder --chown=nginx:nginx /usr/share/vidjil/germline/ germline/
COPY --chown=nginx:nginx docker/vidjil-client/conf/Gemfile Gemfile
COPY --chown=nginx:nginx docker/vidjil-client/scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
COPY --chown=nginx:nginx docker/vidjil-client/scripts/install.sh /opt/install_scripts/install.sh

# Prepare
RUN bash /opt/install_scripts/install.sh

# Switch back to root to perform operations in entrypoints
USER root:root
