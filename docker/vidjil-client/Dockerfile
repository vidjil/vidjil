FROM nginx:1.27

LABEL version="1.2"
LABEL description="An NGINX based docker image which comes \
with a full installation of the Vidjil client."

# Install requirements and clean-up
RUN apt-get update && \
	apt-get install -y --no-install-recommends --no-install-suggests make unzip wget fcgiwrap spawn-fcgi && \ 
	apt-get autoremove -y && apt-get autoclean -y && rm -rf /var/lib/apt/lists/*

# Prepare install directories and prompt
ARG build_env='PRODUCTION'
ENV BUILD_ENV=$build_env
RUN mkdir -p /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/web2py && \
	chown www-data:www-data /usr/share/vidjil /opt/install_scripts /etc/vidjil /etc/nginx/conf.d/web2py/ && \
	rm /etc/nginx/conf.d/default.conf && chown www-data:www-data /etc/nginx/conf.d/ \
	echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc

# Switch to www-data user
RUN sed -i 's/^\(user .*\)$/user www-data;/' /etc/nginx/nginx.conf
USER www-data:www-data

# Copy vidjil data
COPY --chown=www-data:www-data browser/ /usr/share/vidjil/browser/
COPY --chown=www-data:www-data demo/ /usr/share/vidjil/demo/
COPY --chown=www-data:www-data germline/ /usr/share/vidjil/germline/
COPY --chown=www-data:www-data tools/ /usr/share/vidjil/tools/
COPY --chown=www-data:www-data docker/vidjil-client/conf/Gemfile /usr/share/vidjil/Gemfile
COPY --chown=www-data:www-data docker/vidjil-client/scripts/nginx-entrypoint.sh /entrypoints/nginx-entrypoint.sh
COPY --chown=www-data:www-data docker/vidjil-client/scripts/install.sh /opt/install_scripts/install.sh

# Build and prepare
RUN cd /usr/share/vidjil/demo/ && make && \
	cd /usr/share/vidjil/browser/ && make icons sha1 && \
	cd /usr/share/vidjil/germline/ && make && \
	bash /opt/install_scripts/install.sh && \
	ln -s /etc/vidjil/nginx_gzip_static.conf /etc/nginx/conf.d/web2py/gzip_static.conf && ln -s /etc/vidjil/nginx_gzip.conf /etc/nginx/conf.d/web2py/gzip.conf && ln -s /etc/vidjil/uwsgi.conf /etc/nginx/conf.d/web2py/uwsgi.conf && ln -s /usr/share/vidjil/browser /usr/share/vidjil/b

# Switch back to root to perform operations in entrypoints
USER root:root
