
This is the preliminary help of the Vidjil server on Ubuntu server 14.04.
This help is intended for server administrators.
Users should consult the web application manual.
Other documentation can also be found in [dev.org](http://git.vidjil.org/blob/dev/doc/dev.org).


# Plain installation or Docker containers

There are two ways to install and run a Vidjil server:

  - We are developping and deploying in 2018 **Docker containers** to ease the installation and the maintenance.
    These Docker containers are now used in some partner hospitals.
    We recommend this installation for new instances of Vidjil.

  - The **plain installation of the server** should run on any Linux/Unix server with Nginx (recommanded) or Apache.
    We provide below detailed instructions for Ubuntu 14.04 LTS.
    We use this installation on the public server (<https://app.vidjil.org>) since October 2014.

# Requirements

## CPU, RAM

### Minimal

vidjil-algo typically uses
approx. 1.2GB of RAM to run on a 1GB `.fastq` and will take approx. 5+ minutes.
Therefore in order to process requests from a single user with a few samples,
any standard multi-core processor with 2GB RAM will be enough.

### Recommended

When choosing hardware for your server it is important to know the scale
of usage you require.
If you have many users that use the app on a daily basis, you will need to
have multiple cores to ensure the worker queues don't build up.
One worker will occupy one core completely when running vidjil-algo (which is
currently single-threaded).

For reference, here are various setups we used on our public
testing server <https://app.vidjil.org> during two years


#### 2016 -- 2017 (40+ users, including 15 regular users)
  - Processor: Quad core Intel 2.4MHz
  - 3 workers
  - RAM: 16GB


#### since 2018  (100+ users, including 30+ regular users)
  - Virtual Machine: 8 virtual CPUs, similar capacity Xxxxx
  - 6 workers
  - RAM: Xxxx
  
  
We create less workers for executing Vidjil-algo than there are (virtual) CPU availabe,
keeping always one CPU core dedicated to the web server, even when the workers run at full capacity.
Running other RepSeq programs through the Vidjil server may require additional CPU and RAM.

## Storage

### Full upload of sequences

As for many high-throughput sequencing pipeline, **disk storage to store input data (`.fastq`, `.fasta`, `.fastq.gz` or `.fasta.gz`)
is now the main constraint** in our environment.

Depending on the sequencer, files can weigh several GB.
Depending of the number of users, a full installation's total storage should thus be serveral hundred GB, or even several TB
(as of the end of 2018, 4 TB for the public server).
We recommend a RAID setup of at least 2x2TB to allow for user files and at least one backup.

User files (results, annotations) as well as the metadata database are quite smaller
(as of the end of 2016, on the public server, 3 GB for all user files of 40+ users).
Note that even when the input sequences are deleted, the server is still able to display the results of previous analyses.

### Remote access on a mounted filesystem

Moreover, it is possible to access `.fastq` files on a mounted filesystem.
XXX Document me ! XXXX


## Authentication

The accounts are now local to the Vidjil server.
We intend to implement some LDAP access at some point of 2020.

## Network

Once installed, the server can run on a private network.
However, the following network access are recommended:

  - outbound access
      - for users: several features using external platforms (IgBlast, IMGT/V-QUEST…)
      - for server mainteners: upgrades and reports to a monitor server
  - inbound access
      - through the VidjilNet consortium (http://www.vidjil.net),
        the team in Lille may help local server mainteners in some monitoring, maintenance and upgrade tasks,
        provided a SSH access can be arranged, possibly over VPN.


# Docker -- Installation

All our images are hosted on DockerHub in the [vidjil/](https://hub.docker.com/r/vidjil) repositories.
The last images are tagged with `vidjil/server:latest` and `vidjil/client:latest`.

Individual services are started by docker-compose  (<https://docs.docker.com/compose/>).


## Before installation

Install `docker-compose`. See <https://docs.docker.com/compose/install/#install-compose>

If it doesn't exist yet, you should create a `docker` group.
The users needing to access `docker` must belong to this group.

Install `git`.
Clone the [Vidjil git](https://gitlab.inria.fr/vidjil/vidjil) with `git clone https://gitlab.inria.fr/vidjil/vidjil.git`,
and go to the directory [vidjil/docker](https://gitlab.inria.fr/vidjil/vidjil/tree/dev/docker).
This contains both [docker-compose.yml](http://gitlab.vidjil.org/blob/dev/docker/docker-compose.yml) as well as configuration files.

## Docker environment

The vidjil Docker environment is managed by `docker-compose`, who launches the following services:

From `vidjil/client`

  - `nginx` The web server, containing the client web application

From `vidjil/server`

  - `mysql` The database
  - `uwsgi` The Web2py backend server
  - `workers` The Web2py Scheduler workers in charge of executing vidjil users' samples

  - `fuse` The XmlRPCServer that handles queries for comparing samples
  - `backup` Starts a cron job to schedule regular backups
  - `reporter` A monitoring utility that can be configured to send monitoring information to a remote server



## Configuring the Vidjil container for a network usage

If you plan to use Vidjil only locally, these steps are not required.

  - Change the hostname in the nginx configuration `vidjil-client/conf/nginx_web2py`,
    replacing `$hostname` with your FQDN.
  - Edit the `vidjil-client/conf/conf.js`
        change all 'localhost' to the FQDN

  - Configure the SSL certificates
       - A fast option is to create a self-signed SSL certificate.
         Note that it will trigger security warnings when accessing the client.
       	 ```
	 openssl genrsa 4096 > web2py.key
	 openssl req -new -x509 -nodes -sha1 -days 1780 -key web2py.key > web2py.crt
	 openssl x509 -noout -fingerprint -text < web2py.crt
	 mv web2py.* docker/vidjil-client/ssl/
	 ```

       - A better option is to use other certificates, for example by configuring free [Let's Encrypt](https://letsencrypt.org/) certificates;
         In `docker-compose.yml`, update `nginx.volumes` to add the directory with the certifictes.
 
## First configuration and first launch

  - Change the mysql root password in `docker-compose.yml`
  - Change the mysql vidjil password in `mysql/create_db.sql` and sets it also in `vidjil-server/conf/defs.py`

  - Comment backup/reporter services in `docker-compose.yml`

  - It is avised to first launch  with `docker-compose up mysql`.
The first time, this container create the database and it takes some time.

- When `mysql` is launched,
you can safely launch `docker-compose up`.
Then `docker ps` should display four running containers:
`docker_nginx_1`, `docker_uwsgi_1`, `docker_fuse_1`, `docker_mysql_1`


  - Vidjil also need germline files.
      - You can use IMGT germline files if you accept IMGT licence.
        For this, from the `vidjil` directory (root of the git repository),
        run `make germline` to create `germline/` while checking the licence.
      - These germlines are included in the server container with a volume in the fuse block
        in your `docker-compose.yml`: `../germline:/usr/share/vidjil/germline`.
      - Copy also the generated `browser/js/germline.js` into the `docker/vidjil-client/conf/` directory.


  - Open a web browser to <https://your-hostname>.
Create a first account by entering an email.
This account is the main root account of the server. Other administrators could then be created.
It will be also used for the  web2py admin passwor.



  

## Further configuration

The following configuration files are found in the `vidjil/docker` directory:

  - `conf/conf.js` various variables for the vidjil browser
  - `conf/defs.py` various variables for the vidjil server
  - `conf/gzip.conf` configuration for gzip in nginx
  - `conf/gzip_static`.conf same as the previous but for static resources
  - `conf/uwsgi.ini`   configuration required to run vidjil with uwsgi
  - `sites/nginx` configuration required when running vidjil with nginx
  - `scripts/nginx-entrypoint.sh` entrypoint for the nginx
  - `service` (not currently in use)
  - `scripts/uwsgi-entrypoint.sh` entrypoint for the uwsgi
service. Ensures the owner of some relevant volumes are correct within
the container and starts uwsgi

Here are some notable configuration changes you should consider:

  -  mysql root password (`mysql.environment` in `docker-compose.yml`),  mysql vidjil password (`docker-compose.yml` and  `vidjil-server/conf/defs.py`),
     as mentionned above

  - Change the `FROM_EMAIL` and `ADMIN_EMAILS` variables in `vidjil-server/conf/defs.py`. These
    represent the sender email address and the destination email addresses,
    used in reporting patient milestones and server errors.

  - Change the `volumes` in `docker-compose.yml`. By default all files that
    require saving outside of the containers (the database, uploads, vidjil
    results and log files) are stored in `/opt/vidjil`, but you can change
    this by editing the paths in the volumes.
    See also <a href="#storage">Requirements / Storage</a> above.


  - Configure the reporter. Ideally this container should be positioned
    on a remote server in order to be able to report on a down server, but we have packed it here for convenience.
  You will also
    need to change the `DB_ADDRESS` in `conf/defs.py` to match it.



### XXX ? XXX

Ensure your `docker-compose.yml` contains the correct reference to the
vidjil image you want to use. Usually this will be `vidjil/server:latest`,
but more tags are available at <https://hub.docker.com/r/vidjil/server/tags/>.

XXXX ? XXXX
The volumes in the fuse and nginx volume block
`./vidjil-server/conf:/etc/vidjil` and `./vidjil-client/conf:/etc/vidjil`
will provide easier access to all of the
configuration files, allowing for tweaks.
From this location, it will be easier to enable more software or pipelines
by putting their binaries in this location taht will be see by the docker instance.


# Docker -- Troubleshooting

###  Error "Can't connect to MySQL server on 'mysql'"

The mysql container is not fully launched. This can happen especially at the first launch.
Relaunch the containers.
XXXX Relaunch the workers.


# Docker -- Updating a Docker installation

**(October 2018: Temporary instructions, please wait.)**

By security, we please you to make a backup before doing this process.

Usually our docker installation will only require the following:

``` bash
docker pull vidjil/server[:<version>]
docker pull vidjil/client[:<version>]
```

If you do not have access to `hub.docker.com` on your server, then you
should pull the image onto a machine that does and extract it into a tar
archive and send it to your server with your favourite method and import
the image on the server.

Extract:
``` sh
docker save -o <output_file> vidjil/server[:<version>] vidjil/client[:<version>]
```

Import:
```sh
     docker load -i <input_file>
```

In some cases you may need to update your docker-compose.yml file or some
of the configuration files. The latest versions are available on our
[Gitlab](https://inria.gitlab.com/vidjil/vidjil).

By default, all previous volumes will be reused and no datas will be lost.
If needed, the MYSQL database will be updated to match the newest format.
this step is automaticly done by web2py.
XXX TODO XXX (****demande confirmation par test****)


# Plain server installation


## Requirements

``` bash
apt-get install git
apt-get install g++
apt-get install make
apt-get install unzip
apt-get install python-dev python-pip
apt-get install libyajl2 libyajl-dev
pip install unittest2
pip install unittest-xml-reporting
pip install enum34
pip install ijson cffi
```

## Server installation and initialization

Enter in the `server/` directory.

If you just want to do some tests without installing a real web server,
then launch `make install_web2py_standalone`. In the other case, launch
`make install_web2py`.


## Detailed manual server installation and browser linking

Requirements:
ssh, zip unzip, tar, openssh-server, build-essential, python, python-dev,
mysql, python2.5-psycopg2, postfix, wget, python-matplotlib, python-reportlab,
python-enum34, mercurial, git

If you want to run Vidjil with an Apache webserver you will also need:
apache2, libapache2-mod-wsgi

Or if you want to use Nginx:
nginx-full, fcgiwrap

For simplicity this guide will assume you are installing to `/home/www-data`

Clone <https://github.com/vidjil/vidjil.git>

Download and unzip web2py. Copy the contents of web2py to the server/web2py
folder of you Vidjil installation
(in this case /home/www-data/vidjil/server/web2py) and give ownership to www-data:

``` bash
chown -R www-data:www-data /home/www-data/vidjil
```

If you are using apache, you can run the following commands to make sure all the apache modules you need
are activated:

``` bash
a2enmod ssl
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod expires
a2enmod wsgi
a2enmod rewrite  # for 14.04
```

In order to setup the SSL encryption a key to give to apache. The safest option
is to get a certicate from a trusted Certificate Authority, but for testing
purposes you can generate your own:

``` bash
mkdir /etc/<webserver>/ssl
openssl genrsa 1024 > /etc/<webserver>/ssl/self_signed.key
chmod 400 /etc/<webserver>/ssl/self_signed.key
openssl req -new -x509 -nodes -sha1 -days 365 -key
    /etc/<webserver>/ssl/self_signed.key > /etc/apache2/ssl/self_signed.cert
openssl x509 -noout -fingerprint -text <
    /etc/<webserver>/ssl/self_signed.cert > /etc/<webserver>/ssl/self_signed.info
```

\<webserver\> should be replaced with the appropriate webserver name
(ie. apache2 or nginx)

Given that Vidjil is a two-part application, one that serves routes from a server
and one that is served statically, we need to configure the apache to do so.
Therefore we tell the apache to:

  - Start web2py as a wsgi daemon (allows apache to serve the application).
  - Reserve two virtual hosts (one to be served with ssl encryption, and one not).
  - We configure the first host to serve static content and prevent overriding
    by the sever (otherwise all routes are redirected through web2py) and to follow symlinks
    this allows us to symlink to our browser app in the /var/www directory and keep both parts
    of Vidjil together.
  - The second is set to use SSL encryption, and only serve very specific folders statically (such
    as javascript files and images because we don't want to create a controller to serve that kind of data)

you can replace your apache default config with the following
(/etc/apache2/sites-available/default.conf - remember to make a backup just in case):

``` example
WSGIDaemonProcess web2py user=www-data group=www-data processes=1 threads=1

<VirtualHost *:80>

  DocumentRoot /var/www
  <Directory />
    Options FollowSymLinks
    AllowOverride None
  </Directory>

  <Directory /var/www/>
    Options Indexes FollowSymLinks MultiViews
    AllowOverride all
    Order allow,deny
    allow from all
  </Directory>

  ScriptAlias /cgi/ /usr/lib/cgi-bin/

  <Directory /usr/lib/cgi-bin/>
    Options Indexes FollowSymLinks
    Options +ExecCGI
    #AllowOverride None
    Require all granted
    AddHandler cgi-script cgi pl
  </Directory>

  <Directory /home/www-data/vidjil/browser>
    AllowOverride None
  </Directory>

  CustomLog /var/log/apache2/access.log common
  ErrorLog /var/log/apache2/error.log
</VirtualHost>


<VirtualHost *:443>
  SSLEngine on
  SSLCertificateFile /etc/apache2/ssl/self_signed.cert
  SSLCertificateKeyFile /etc/apache2/ssl/self_signed.key

  WSGIProcessGroup web2py
  WSGIScriptAlias / /home/www-data/vidjil/server/web2py/wsgihandler.py
  WSGIPassAuthorization On

  <Directory /home/www-data/vidjil/server/web2py>
    AllowOverride None
    Require all denied
    <Files wsgihandler.py>
      Require all granted
    </Files>
  </Directory>

  AliasMatch ^/([^/]+)/static/(?:_[\d]+.[\d]+.[\d]+/)?(.*) \
        /home/www-data/vidjil/server/web2py/applications/$1/static/$2

  <Directory /home/www-data/vidjil/server/web2py/applications/*/static/>
    Options -Indexes
    ExpiresActive On
    ExpiresDefault "access plus 1 hour"
    Require all granted
  </Directory>

  CustomLog /var/log/apache2/ssl-access.log common
  ErrorLog /var/log/apache2/error.log
</VirtualHost>
```

Now we want to activate some more apache mods:

``` bash
a2ensite default                   # FOR 14.04
a2enmod cgi
```

Restart the server in order to make sure the config is taken into account.

And create some symlinks to avoid splitting our app:

``` bash
ln -s /home/www-data/vidjil/browser /var/www/browser
ln -s /home/www-data/vidjil/browser/cgi/align.cgi /usr/lib/cgi-bin
ln -s /home/www-data/vidjil/germline /var/www/germline
ln -s /home/www-data/vidjil/data /var/www/data
```

If you are using Nginx, the configuration is the following:

``` example
server {
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
        location / {
            #uwsgi_pass      127.0.0.1:9001;
            uwsgi_pass      unix:///tmp/web2py.socket;
            include         uwsgi_params;
            uwsgi_param     UWSGI_SCHEME \$scheme;
            uwsgi_param     SERVER_SOFTWARE    nginx/\$nginx_version;
            ###remove the comments to turn on if you want gzip compression of your pages
            # include /etc/nginx/conf.d/web2py/gzip.conf;
            ### end gzip section

            proxy_read_timeout 600;
            client_max_body_size 20G;
            ###
        }
        ## if you serve static files through https, copy here the section
        ## from the previous server instance to manage static files

        location /browser {
            root /home/www-data/vidjil/;
            expires 1h;

            error_page 405 = $uri;
        }

        location /germline {
            root $CWD/../;
            expires 1h;

            error_page 405 = $uri;
        }

        ###to enable correct use of response.static_version
        #location ~* ^/(\w+)/static(?:/_[\d]+\.[\d]+\.[\d]+)?/(.*)$ {
        #    alias /home/www-data/vidjil/server/web2py/applications/\$1/static/\$2;
        #    expires max;
        #}
        ###

        location ~* ^/(\w+)/static/ {
            root /home/www-data/vidjil/server/web2py/applications/;
            expires max;
            ### if you want to use pre-gzipped static files (recommended)
            ### check scripts/zip_static_files.py and remove the comments
            # include /etc/nginx/conf.d/web2py/gzip_static.conf;
            ###
        }

        client_max_body_size 20G;

        location /cgi/ {
            gzip off;
            root  /home/www-data/vidjil/browser/;
            # Fastcgi socket
            fastcgi_pass  unix:/var/run/fcgiwrap.socket;
            # Fastcgi parameters, include the standard ones
            include /etc/nginx/fastcgi_params;
            # Adjust non standard parameters (SCRIPT_FILENAME)
            fastcgi_param SCRIPT_FILENAME  \$document_root\$fastcgi_script_name;
        }

}
```

We also do not create symlinks since all references are managed
correctly.

Now we need to configure the database connection parameters:

  - create a file called conf.js in /home/www-data/vidjil/browser/js containing:
    
    ``` example
    var config = {
        /*cgi*/
        "cgi_address" : "default",
    
        /*database */
        "use_database" : true,
        "db_address" : "default",
    
        "debug_mode" : false
    }
    ```

This tells the browser to access the server on the current domain.

  - copy vidjil/server/web2py/applications/vidjil/modules/defs.py.sample
    to vidjil/server/web2py/applications/vidjil/modules/defs.py
    and change the value of DB<sub>ADDRESS</sub> to reference your database.

You can now access your app.
All that is left to do is click on the init database link above the login page.
This creates a default admin user: plop@plop.com and password: 1234 (make sure to
remove this user in your production environment) and creates the configurations you can have
for files and results.

# Testing the server

If you develop on the server, or just want to check if everything is ok, you
should launch the server tests.

First, you should have a working fuse server by launching `make
  launch_fuse_server` (just launch it once, then it is running in the
background and can be killed with `make kill_fuse_server`).

Then you can launch the tests with `make unit`.

# Troubleshootings

## Web2py runs but does not allow any connection

Check whether the relevant disks are properly mounted.
Disks failures or other events could have triggered a read-only partition.

## Jobs stay in `QUEUED`, workers seem to be stuck

For some reasons, that are not clear yet, it may happen that workers are not
assigned any additional jobs even if they don't have any ongoing jobs.

In such a (rare) case, it may be useful to restart web2py schedulers
with `service web2py-scheduler restart` or `initctl restart web2py-scheduler`
depending on your installation.


## Debugging Web2py workers

One can launch the workers by hand (see in the `/etc/init` script and add a
`-D 0` option. It prints debugging information on what the workers are doing.

The most useful information are from the TICKER worker: the one that
assigns jobs to workers. So you'd better first kill all the workers and
then launch one by hand to be sure that it will be the ticker.

## Restarting web2py

Just touch the file `/etc/uwsgi/web2py.ini`.

Another of restarting it is by touching the file
`server/web2py/applications/vidjil/modules/defs.py`.
This will tell `uwsgi` to restart web2py (including the workers).

## Restarting uwsgi

When one modifies an uwsgi config file (usually in `/etc/uwsgi` directory, it
may be necessary to restart uwsgi so that the modifications are taken into
account. This can be done using

``` bash
initctl restart uwsgi-emperor
```

## Logging database queries

### MySQL

One can see some [insightful SO post](https://stackoverflow.com/questions/650238/how-to-show-the-last-queries-executed-on-mysql).
To summarize, this can either be done at runtime:

``` sql
SET GLOBAL log_output = "FILE";
SET GLOBAL general_log_file = "/path/to/your/logfile.log";
SET GLOBAL general_log = 'ON';
```

Or directly in the configuration file (less recommended):

``` conf
general_log_file        = /var/log/mysql/mysql.log
general_log             = 1
```

In that case the server must be restarted afterwards.

# Running the server in a production environment

## Introduction

When manipulating a production environment it is important to take certain
precautionnary mesures, in order to ensure production can either be rolled
back to a previous version or simply that any encurred loss of data can be
retrieved.

Web2py and Vidjil are no exception to this rule.

## Making backups

The top priority is to backup *files created during the analysis*
(either by a software or a human).
Should the data be lost, valuable man-hours would be lost.
In order to prevent this, we make twice a day incremental backups of the
data stored on the public Vidjil servers.

This does not apply to uploaded files. We public servers that they should
keep a backup of their original sequence files.

To ease the backup, the `backup.sh` script provides an example.  For this
script to be ran automatically, it is required that `mysqldump` does not ask
for a password. The credentials informations should be provided in a `~/.my.cnf` file (in the case of MySQL).

``` conf
[client]
user = backup
password = "strongpassword"
host = localhost
```
It is also advised that the backup user has a read-only access to the database.


## Autodelete and Permissions

Web2py has a handy feature called `AutoDelete` which allows the administrator
to state that file reference deletions should be cascaded if no other
references to the file exist.
When deploying to production one needs to make sure `AutoDelete` is
deactivated.
This is the case for the default Vijdil installation (see `server/web2py/applications/vidjil/models/db.py`).

As a second precaution it is also wise to temporarily restrict web2py's
access to referenced files.

Taking two mesures to prevent file loss might seem like overkill, but
securing data is more important than the small amount of extra time spent
putting these mesures into place.

# Plain server installation -- updating the server

**(information to be updated)**

Currently deploying changes to production is analogous to merging into the
rbx branch and pulling from the server.

Once this has been done, it is important that any database migrations have
been applied.
This can be verified by refreshing the server (calling a controller) and
then looking at the database.

## Step by Step

  - Check permissions on the uploads folder (set to 100)
      - you can also check the amount of files present at this point for future
        reference
  - Backup database: Archive old backup.csv and then from admin page: backup
    db
  - pull rbx (if already merged dev)
  - Check the database (for missing data or to ensure mmigrations have been
    applied)
  - Check files to ensure no files are missing
  - Reset the folder permissions on uploads (755 seems to be the minimum
    requirement for web2py)
  - Run unit tests (Simply a precaution: Continuous Integration renders this
    step redundant but it's better to be sure)
  - Check site functionnality

# Resetting user passwords

Currently there is not easy way of resetting a user's password.
The current method is the following:
\`cd server/web2py\`
\`python web2py -S vidjil -M\`
\`db.auth<sub>user</sub>\[\<user-id\].update<sub>record</sub>(password=CRYPT(key=auth.settings.hmac<sub>key</sub>)('\<password\>')\[0\],reset<sub>passwordkey</sub>='')\`

# Migrating Data

## Database

The easiest way to perform a database migration is to first extract the
data with the following command:

``` bash
mysqldump -u <user> -p <db> -c --no-create-info > <file>
```

An important element to note here is the –no-create-info we add this
parameter because web2py needs to be allowed to create tables itself
because it keeps track of database migrations and errors will occur if
tables exist which it considers it needs to create.

In order to import the data into an installation you first need to ensure
the tables have been created by Web2py this can be achieved by simply
accessing a non-static page.

/\!\\ If the database has been initialised from the interface you will
likely encounter primary key collisions or duplicated data, so it is best
to skip the initialisation altogether.

Once the tables have been created, the data can be imported as follows:

``` bash
mysql -u <user> -p <db> < <file>
```

Please note that with this method you should have at least one admin user
that is accessible in the imported data. Since the initialisation is being
skipped, you will not have the usual admin account present.
It is also possible to create a user directly from the database although
this is not the recommended course of action.

## Files

Files can simply be copied over to the new installation, their filenames
are stored in the database and should therefore be accessible as long as
they are in the correct directories.

## Filtering data (soon deprecated)

When extracting data for a given user, the whole database should not be
copied over.
There are two courses of action:

  - create a copy of the existing database and remove the users that are
    irrelevant. The cascading delete should remove any unwanted data
    barring a few exceptions (notably fused<sub>file</sub>, groups and sample<sub>setmembership</sub>)

  - export the relevant data directly from the database. This method
    requires multiple queries which will not be detailed here.

Once the database has been correctly extracted, a list of files can be
obtained from sequence<sub>file</sub>, fused<sub>file</sub>, results<sub>file</sub> and analysis<sub>file</sub>
with the following query:

``` sql
SELECT <filename field>
FROM <table name>
INTO OUTFILE 'filepath'
FIELDS TERMINATED BY ','
ENCLOSED BY ''
LINES TERMINATED BY '\n'
```

Note: We are managing filenames here which should not contain any
character such as quotes or commas so we can afford to refrain from
enclosing the data with quotes.

This query will output a csv file containing a filename on each line.
Copying the files is now just a matter of running the following script:

``` bash
sh copy_files <file source> <file destination> <input file>
```

## Exporting sample sets

The migrator script allows the export and import of data, whether it be a
single patient/run/set or a list of them, or even all the sample sets
associated to a group.

``` example
usage: migrator.py [-h] [-f FILENAME] [--debug] {export,import} ...

Export and import data

positional arguments:
{export,import}  Select operation mode
  export         Export data from the DB into a JSON file
  import         Import data from JSON into the DB

optional arguments:
  -h, --help       show this help message and exit
  -f FILENAME      Select the file to be read or written to
  --debug          Output debug information
```

Export:

``` example
usage: migrator.py export [-h] {sample_set,group} ...

positional arguments:
  {sample_set,group}  Select data selection method
    sample_set        Export data by sample-set ids
    group             Extract data by groupid

optional arguments:
  -h, --help          show this help message and exit
```

``` example
usage: migrator.py export sample_set [-h] {patient,run,generic} ID [ID
...]

positional arguments:
  {patient,run,generic}
                          Type of sample
    ID                    Ids of sample sets to be extracted

  optional arguments:
    -h, --help            show this help message and exit
```

``` example
usage: migrator.py export group [-h] groupid

positional arguments:
  groupid     The long ID of the group

optional arguments:
  -h, --help  show this help message and exit
```

Import:

``` example
usage: migrator.py import [-h] [--dry-run] [--config CONFIG] groupid

positional arguments:
  groupid     The long ID of the group

optional arguments:
  -h, --help  show this help message and exit
  --dry-run   With a dry run, the data will not be saved to the database
  --config CONFIG  Select the config mapping file
```
