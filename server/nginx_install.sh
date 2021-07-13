#!/bin/bash
echo 'setup-web2py-nginx-uwsgi-ubuntu-precise.sh'
echo 'Requires Ubuntu > 12.04 and installs Nginx + uWSGI + Web2py'

CWD=$(pwd)

# Check if user has root privileges
if [[ $EUID -ne 0 ]]; then
   echo "You must run the script as root or using sudo"
   exit 1
fi

# Get Web2py Admin Password
echo -e "Web2py Admin Password: \c "
read  PW

echo "installing useful packages"
echo "=========================="
apt-get update
apt-get -y upgrade
apt-get autoremove
apt-get autoclean
apt-get -y install ssh
apt-get -y install zip unzip
apt-get -y install tar
apt-get -y install openssh-server
apt-get -y install python
apt-get -y install ipython
apt-get -y install libapache2-mod-wsgi
apt-get -y install python2.5-psycopg2
apt-get -y install postfix
apt-get -y install wget
apt-get -y install python-matplotlib
apt-get -y install python-reportlab
apt-get -y install mercurial
apt-get -y install nginx-full
apt-get -y install fcgiwrap
apt-get -y install build-essential python-dev libxml2-dev python-pip
pip install setuptools --no-use-wheel --upgrade
PIPPATH=`which pip`
$PIPPATH install --upgrade uwsgi

# Create common nginx sections
mkdir /etc/nginx/conf.d/web2py
echo '
gzip_static on;
gzip_http_version   1.1;
gzip_proxied        expired no-cache no-store private auth;
gzip_disable        "MSIE [1-6]\.";
gzip_vary           on;
' > /etc/nginx/conf.d/web2py/gzip_static.conf

echo '
gzip on;
gzip_disable "msie6";
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;
' > /etc/nginx/conf.d/web2py/gzip.conf

echo '
#uwsgi_pass      127.0.0.1:9001;
uwsgi_pass      unix:///tmp/web2py.socket;
include         uwsgi_params;
uwsgi_param     UWSGI_SCHEME \$scheme;
uwsgi_param     SERVER_SOFTWARE    nginx/\$nginx_version;
###remove the comments to turn on if you want gzip compression of your pages
# include /etc/nginx/conf.d/web2py/gzip.conf;
### end gzip section
' > /etc/nginx/conf.d/web2py/uwsgi.conf

# Create configuration file /etc/nginx/sites-available/web2py
echo "server {
    listen 80;
    server_name \$hostname;
    return 301 https://\$hostname$request_uri;

}
server {
        listen 443 default_server ssl;
        server_name     \$hostname;
        ssl_certificate         /etc/nginx/ssl/web2py.crt;
        ssl_certificate_key     /etc/nginx/ssl/web2py.key;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_ciphers ECDHE-RSA-AES256-SHA:DHE-RSA-AES256-SHA:DHE-DSS-AES256-SHA:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        keepalive_timeout    70;

        client_body_temp_path /mnt/data/tmp;
        uwsgi_max_temp_file_size 20480m;
        uwsgi_temp_path /mnt/data/tmp;

        location / {
            rewrite /([0-9]+)/([0-9]+)(/+) /?set=$1&conf=$2 break;
            root $CWD/../browser;
            expires 1h;

            error_page 405 = $uri;
        }

        location /vidjil {
            include /etc/nginx/conf.d/web2py/uwsgi.conf
            proxy_read_timeout 600;
            client_max_body_size 20G;
            ###
        }
        ## if you serve static files through https, copy here the section
        ## from the previous server instance to manage static files

        location /browser {
            rewrite /browser/([0-9]+)/([0-9]+)(\/?) /browser/?set=$1&conf=$2 break;
            rewrite /browser/([0-9/]+)/(css|js|images|test)/(.*) /browser/$2/$3 redirect;
            root $CWD/../;
            expires 1h;

            error_page 405 = $uri;
        }

        location /germline {
            root $CWD/../;
            expires 1h;
            add_header Cache-Control must-revalidate;

            error_page 405 = $uri;
        }

        ###to enable correct use of response.static_version
        #location ~* ^/(\w+)/static(?:/_[\d]+\.[\d]+\.[\d]+)?/(.*)$ {
        #    alias $CWD//web2py/applications/\$1/static/\$2;
        #    expires max;
        #}
        ###

        location ~* ^/(\w+)/static/ {
            root $CWD/web2py/applications/;
            expires max;
            ### if you want to use pre-gzipped static files (recommended)
            ### check scripts/zip_static_files.py and remove the comments
            # include /etc/nginx/conf.d/web2py/gzip_static.conf;
            ###
        }

        client_max_body_size 20G;

        location /cgi/ {
            gzip off;
            root  $CWD/../browser/;
            # Fastcgi socket
            fastcgi_pass  unix:/var/run/fcgiwrap.socket;
            # Fastcgi parameters, include the standard ones
            include /etc/nginx/fastcgi_params;
            # Adjust non standard parameters (SCRIPT_FILENAME)
            fastcgi_param SCRIPT_FILENAME  \$document_root\$fastcgi_script_name;
        }

        location /vidjil/file/upload {
            include /etc/nginx/conf.d/web2py/uwsgi.conf
            uwsgi_read_timeout 10m;
            client_max_body_size 20G;
        }

}" >/etc/nginx/sites-available/web2py

ln -s /etc/nginx/sites-available/web2py /etc/nginx/sites-enabled/web2py
rm /etc/nginx/sites-enabled/default
mkdir /etc/nginx/ssl
cd /etc/nginx/ssl

openssl genrsa 1024 > web2py.key
chmod 400 web2py.key
openssl req -new -x509 -nodes -sha1 -days 1780 -key web2py.key > web2py.crt
openssl x509 -noout -fingerprint -text < web2py.crt > web2py.info

# Prepare folder for vidjil log
sudo mkdir /var/vidjil
sudo touch /var/vidjil/vidjil.log
sudo touch /var/vidjil/vidjil-debug.log
sudo chown -R www-data:www-data /var/vidjil

# Prepare folders for uwsgi
sudo mkdir /etc/uwsgi
sudo mkdir /var/log/uwsgi

# Create configuration file /etc/uwsgi/web2py.xml
echo "[uwsgi]

socket = /tmp/web2py.socket
pythonpath = $CWD/web2py/
mount = /=wsgihandler:application
processes = 4
master = true
harakiri = 1200
reload-mercy = 8
cpu-affinity = 1
stats = /tmp/stats.socket
max-requests = 2000
limit-as = 512
reload-on-as = 256
reload-on-rss = 192
touch-reload = $CWD/web2py/applications/vidjil/modules/defs.py
uid = www-data
gid = www-data
cron = 0 0 -1 -1 -1 python $CWD/web2py/web2py.py -Q -S welcome -M -R scripts/sessions2trash.py -A -o
no-orphans = true
ignore-sigpipe = true
env = TMPDIR=/mnt/data/tmp
" >/etc/uwsgi/web2py.ini

#Create a configuration file for uwsgi in emperor-mode
#for Upstart in /etc/init/uwsgi-emperor.conf
echo '# Emperor uWSGI script

description "uWSGI Emperor"
start on runlevel [2345]
stop on runlevel [06]
##
#remove the comments in the next section to enable static file compression for the welcome app
#in that case, turn on gzip_static on; on /etc/nginx/nginx.conf
##
#pre-start script
#    python /home/www-data/web2py/web2py.py -S welcome -R scripts/zip_static_files.py
#    chown -R www-data:www-data /home/www-data/web2py/*
#end script
respawn
exec uwsgi --master --die-on-term --emperor /etc/uwsgi --logto /var/log/uwsgi/uwsgi.log
' > /etc/init/uwsgi-emperor.conf

# Install Web2py
cd $CWD
make install_web2py
chown -R www-data:www-data web2py
cd $CWD/web2py
sudo -u www-data python -c "from gluon.main import save_password; save_password('$PW',443)"
mkdir /mnt/upload
mkdir /mnt/upload/uploads
mkdir /mnt/result
mkdir -p /mnt/data/tmp
chown -R www-data:www-data /mnt/upload
chown -R www-data:www-data /mnt/result
start uwsgi-emperor
/etc/init.d/nginx restart

echo "config browser"
echo "=============="
echo "
var config = {
    /*cgi*/
    \"cgi_address\" : \"default\",
    
    /*database */
    \"use_database\" : true,
    \"db_address\" : \"default\",
    
    \"debug_mode\" : false  
}
" > $CWD/../browser/js/conf.js 

echo "install simple worker"
echo "====================="

echo "
description \"web2py vidjil task scheduler\"
start on (local-filesystems and net-device-up IFACE=eth0)
stop on shutdown
respawn
respawn limit 8 60 # Give up if restart occurs 8 times in 60 seconds.
exec  sudo -u www-data python $CWD/web2py/web2py.py -K vidjil,vidjil,vidjil
" > /etc/init/web2py-scheduler.conf

echo "
description \"fuse server vidjil\"
start on (local-filesystems and net-device-up IFACE=eth0)
stop on shutdown
respawn
respawn limit 8 60 # Give up if restart occurs 8 times in 60 seconds.
chdir $CWD
exec  sudo -u www-data python fuse_server.py
" > /etc/init/fuse-server.conf


## you can reload uwsgi with
# restart uwsgi-emperor
## and stop it with
# stop uwsgi-emperor
## to reload web2py only (without restarting uwsgi)
# touch /etc/uwsgi/web2py.xml
