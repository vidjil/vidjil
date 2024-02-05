!!! note
    This is the help of the Vidjil server.  
    This help is intended for server administrators.  
    Users should consult the [web application manual](http://www.vidjil.org/doc/user/)  
    Other documentation can also be found in [doc/](http://www.vidjil.org/doc/).  



The supported way to install, run, and maintain a Vidjil server
is to use **Docker containers**.
We are developping and deploying them since 2018, and,
as of 2024, these Docker containers are used on all our servers (healthcare, public)
as well as in some partner hospitals.
See the [hosting options](http://wwW.vidjil.org/doc/healthcare/),
including support and remote maintenance
such in-hospital servers through
the [VidjilNet consortium](http://www.vidjil.net/).

## Requirements

## CPU, RAM, Platform

### Minimal

The minimal requirements for Vidjil-algo
(standard multi-core processor, 2GB RAM, recent distribution)
are detailed in [vidjil-algo.md](vidjil-algo.md).

### Recommended

When choosing hardware for your server it is important to know the scale
of usage you require.
If you have many users that use the app on a daily basis, you will need to
have multiple cores to ensure the worker queues don't build up.

One worker will occupy one core completely when running vidjil-algo (which is
currently single-threaded).
When you have several users that use the app on a daily basis, you will need to
have multiple (virtual) CPUs or cores to ensure the worker queues don't build up.

We create less workers for executing Vidjil-algo than there are (virtual) CPU or cores available,
keeping always one CPU core dedicated to the web server, even when the workers run at full capacity.
Running other RepSeq programs through the Vidjil server may require additional CPU and RAM.

#### Minimal (single user)

vidjil-algo typically uses
approx. 1.2GB of RAM to run on a 1GB `.fastq` and will take approx. 5+ minute
on a standard computer.

Therefore in order to process requests from a single user with a few samples,
**any standard multi-core processor with 2GB RAM per worker** will be enough.

#### Recommended (multiple users)

For a single-team lab with one or two weekly sequencing runs, we advise
a standard computer with **4 CPU/cores** (hence 3 workers + 1 client),
at at least 1 GHz and **8GB RAM**.

For reference, here are setups of our public servers 
as of 2023 (300+ users, including 50+ regular users).
🌱 You probably don't need so much resources for your lab!
  
<!-- - 2016-2017 Quad core Intel 2.4GHz, 3 workers, 16 GB
     - 2018-2020? 8vCPU, 6 workers, 28GB 
     -->
- Health certified server: 12 vCPUs, 14GB RAM, with redundant backups
- Public server <https://app.vidjil.org>: 16 vCPUs (11 workers), 120GB RAM



### Storage

#### Full upload of sequences

As for many high-throughput sequencing pipeline, **disk storage to store input data (`.fastq`, `.fasta`, `.fastq.gz` or `.fasta.gz`)
is now the main constraint** in our environment.

Depending on the sequencer, files can weigh several GB.
Depending of the number of users, a full installation's total storage should thus be serveral hundred GB, or even several TB
(as of the end of 2023, 10 TB for the public server).
We recommend a **RAID setup** of at least **2x2TB** to allow for user files and at least one backup.

User files (results, annotations) as well as the metadata database are quite smaller
(as of the end of 2016, on the public server, 3 GB for all user files of 40+ users).
Note that even when the input sequences are deleted, the server is still able to display the results of previous analyses.

#### Remote access on a mounted filesystem

Moreover, it is possible to access `.fastq` files on a mounted filesystem.
See `FILE_SOURCE` below.

### Authentication

By default, accounts are local to the Vidjil server.

An experimental integration to LDAP servers is now available (`LDAP` variable in defs.py).
Contact us if you need help in setting such an authentication.

### Network

Once installed, the server can run on a private network.
However, the following network access are recommended:

  - outbound access
      - for users: several features using external platforms (IgBlast, IMGT/V-QUEST…)
      - for server mainteners: upgrades and reports to a monitor server
  - inbound access
      - through the VidjilNet consortium (http://www.vidjil.net),
        the team in Lille may help local server mainteners in some monitoring, maintenance and upgrade tasks,
        provided a SSH access can be arranged, possibly over VPN.


## Docker -- Installation

All our images are hosted on DockerHub in the [vidjil/](https://hub.docker.com/r/vidjil) repositories.
The last images are tagged with `vidjil/server:latest` and `vidjil/client:latest`.

Individual services are started by docker-compose  (<https://docs.docker.com/compose/>).


### Before installation

Install `docker-compose`. See <https://docs.docker.com/compose/install/#install-compose>

If it doesn't exist yet, you should create a `docker` group.
The users needing to access `docker` must belong to this group.

Install `git`.
Clone the [Vidjil git](https://gitlab.inria.fr/vidjil/vidjil) with `git clone https://gitlab.inria.fr/vidjil/vidjil.git`,
and go to the directory [vidjil/docker](https://gitlab.inria.fr/vidjil/vidjil/tree/dev/docker).
This contains both [docker-compose.yml](http://gitlab.vidjil.org/blob/dev/docker/docker-compose.yml) as well as configuration files.

### Docker environment

The vidjil Docker environment is managed by `docker-compose`, who launches the following services:

From image `vidjil/client`

  - `nginx` The web server, containing the client web application

From image `vidjil/server`

  - `mysql` The database
  - `uwsgi` The Py4web backend server
  - `workers` The Py4web Scheduler workers in charge of executing vidjil users' samples
  - `redis` Allow to dispatch jobs to workers
  - `flowers` A server to monitoring workers status

  - `fuse` The XmlRPCServer that handles queries for comparing samples

  - `restic` Starts a cron job to schedule regular backups
  - `reporter` A monitoring utility that can be configured to send monitoring information to a remote server
  - `postfix` A mail relay to allow `uwsgi` to send error notifications



### Network usage and SSL certificates

*If you are simply using Vidjil from your computer for testing purposes you can skip the next two steps.*

  - Step 1 : Change the hostname in the nginx configuration `vidjil-client/conf/nginx_web2py`,
    replacing `$hostname` with your FQDN.
  - Step 2 : Edit the `vidjil-client/conf/conf.js`
        change all 'localhost' to the FQDN

*You will need the following step whether you are using locally or not.*

Vidjil uses HTTPS by default, and will therefore require SSL certificates.
You can achieve this with the following steps:

  - Configure the SSL certificates
     - A fast option is to create a self-signed SSL certificate.
       Note that it will trigger security warnings when accessing the client.
       From the `docker/` directory:
       ```
       openssl genrsa 4096 > web2py.key
       openssl req -new -x509 -nodes -sha1 -days 1780 -key web2py.key > web2py.crt
       openssl x509 -noout -fingerprint -text < web2py.crt
       mkdir -p vidjil-client/ssl
       mv web2py.* vidjil-client/ssl/
      ```

     + If you are using the `postfix` container you may want to generate certificates (using the same process) and place them in `postfix/ssl`.
       The certificates must bear the name of your mail domain (<maildomain>.crt and <maildomain>.key)

  - A better option is to use other certificates, for example by configuring free [Let's Encrypt](https://letsencrypt.org/) certificates.
    One solution is to use `certbot` on the host to generate the certificates and to copy them in the right directory so that the container
    can access it. 
    See [Nginx and Let’s Encrypt with Docker](https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71).
    To check the integrity of the host, `certbot` needs to set up a challenge. 
    Thus, Nginx needs to provide specific files that are generated by `certbot`. 
    To do so, you should tell `certbot` to put those files in the `/opt/vidjil/certs` 
    directory (this can be changed in the `docker-compose.yml` file.
    You can generate the certificates with the command `certbot certonly --webroot -w /opt/vidjil/certs -d myvidjil.org`. 
    You'll need to update the Nginx configuration in `docker/vidjil-client/conf/nginx_web2py`
    Then 
    ```shell
    cp /etc/letsencrypt/live/vdd.vidjil.org/fullchain.pem vidjil-client/ssl/web2py.crt
    cp /etc/letsencrypt/live/vdd.vidjil.org/privkey.pem vidjil-client/ssl/web2py.key
    ```
    The certificates can be renewed with `certbot renew` to do so, you may wish to mount `/etc/letsencrypt` in the Docker image as a volume (*eg.* `/etc/letsencrypt:/etc/nginx/ssl`).
    However beware, because you would not be able to start Nginx till the certificates are in place.
    On certificate renewal (with `certbot`), you then need to restart the Nginx server. The following `cron` line can be used for certificate renewal (you may want to update the paths):
    ```
0 0 1 * * root (test -x /usr/bin/certbot && perl -e 'sleep int(rand(14400))' && certbot --webroot -w /opt/vidjil/certs renew && (cd /path/to/vidjil/docker/vidjil/docker; sudo -u vidjil docker-compose stop nginx && sudo -u vidjil docker-compose rm -f nginx && sudo -u vidjil docker-compose up -d nginx)) >> /var/log/certbot.log 2>&1
  ```

    
If necessary, in `docker-compose.yml`, update `nginx.volumes`, line `./vidjil-client/ssl:/etc/nginx/ssl`, to set the directory with the certificates.
    The same can be done for the `postfix` container.


If you would prefer to use the vidjil over HTTP (not recommended outside of testing purposes), you can
use the provided configuration files in `docker/vidjil-server/conf` and `docker/vidjil-client/conf`. You will find several files
that contain "http" in their name. Simply replace the existing config files with their HTTP counter-part (for safety reasons, don't
forget to make a backup of any file you replace.)
 
### First configuration and first launch

  - Set the SSL certificates (see above)
  - Change the mysql root password, mysql user password and the py4web admin password in `.env` file
  - Set the desired mail domain and credentials for the `postfix` container in `.env`
  - Set the number of workers in `.env`. Keep at least one threads not used to not overload server

  - Comment reporter services in `docker-compose.yml`

  - It is avised to first launch  with `docker-compose up mysql`.
The first time, this container creates the database and it takes some time.

- When `mysql` is launched,
you can safely launch `docker-compose up -d`.
Then `docker ps` should display seven running containers for a localhost usage:
`docker_nginx_1`, `docker_uwsgi_1`, `docker_mysql_1`, `docker_fuse_1`, `docker_workers_1`, `docker_flowers_1`, `docker_redis_1`.
Service `restic`, `reporter` and `postfix` are usefull for backup and email communication and need to be started for regular installation.

  - Vidjil also need germline files.
      - You can use IMGT germline files if you accept IMGT licence.
        For this, from the `vidjil` directory (root of the git repository),
        run `make germline` to create `germline/` while checking the licence.
      - These germlines are included in the server container with a volume in the fuse block
        in your `docker-compose.yml`: `../germline:/usr/share/vidjil/germline`.
      - Copy also the generated `browser/js/germline.js` into the `docker/vidjil-client/conf/` directory.


  - Open a web browser to `https://localhost`, or to your FQDN if you configured it (see above).
Click on `init database` and create a first account by entering an email.
This account is the main root account of the server. Other administrators could then be created.
It will be also the web2py admin password.

- Once these main service are set, you can also set docker service for backup and mail communication.

*notice* : By default, Nginx HTTP server listens for incoming connection and binds on port 80 on the host, if you encounter the following message error:
```
ERROR: for nginx
Cannot start service nginx: driver failed programming external
connectivity on endpoint docker_nginx_1
(236d0696ed5077c002718541a9703adeee0dfac66fb880d193690de6fa5c462e):
Error starting userland proxy: listen tcp 0.0.0.0:80: bind: address already in use
```

You can resolve it either by changing the port used by Vidjil in the `nginx.ports`
section of the `docker-compose.yml` file or by stopping the service using port
80.

  

### Further configuration

The following configuration files are found in the `vidjil/docker` directory:

  - `vidjil-client/conf/conf.js` various variables for the vidjil client
  - `vidjil-client/conf/nginx_gzip.conf` configuration for gzip in nginx
  - `vidjil-client/conf/nginx_gzip_static.conf`  same as the previous but for static resources

  - `vidjil-server/conf/defs.py` various variables for the vidjil server
  - `vidjil-server/conf/uwsgi.ini`   configuration required to run vidjil with uwsgi
  - `vidjil-server/scripts/nginx-entrypoint.sh` entrypoint for the nginx
  - `vidjil-server/scripts/uwsgi-entrypoint.sh` entrypoint for the uwsgi
service. Ensures the owner of some relevant volumes are correct within
the container and starts uwsgi

  - `sites/nginx` configuration required when running vidjil with nginx
  - `service` (not currently in use)

Here are some notable configuration changes you should consider. Main change can be done by editing `docker/.env` configuration file. List of settable variable is in `docker/.env-default`. Some other should be done in `vidjil-server/conf/defs.py` file.
  -  mysql root and vidjil password can be setted as mentionned above

  - Change the `FROM_EMAIL` and `ADMIN_EMAILS` variables in `vidjil-server/conf/defs.py`.
    They are used for admin emails monitoring the server an reporting errors.
    Change also the `hosting` variable in `vidjil-client/conf/confs.js`.

  - <a name='healthcare'></a>
    If, according yo your local regulations, the server is suitable for hosting clinical data,
    you may update the `HEALTHCARE_COMPLIANCE` variable in `vidjil-server/conf/defs.py`
    and the `healthcare` variable in `vidjil-client/conf/confs.js` to remove warnings related to non-healthcare compliance.
    Updating this variable is the sole responsibility of the institution responsible for the server,
    and should be done in accordance with the regulations that apply in your country.
    See also the [hosting options](healthcare.md) offered by the VidjilNet consortium.

  - To allow users to select files from a mounted volume,
    set `FILE_SOURCE` and `FILE_TYPES` in `vidjil-server/conf/defs.py`.
    In this case, the `DIR_SEQUENCES` directory will be populated with links to the selected files.
    Users will still be allowed to upload their own files.

  - By default path directory for files that
    require saving outside of the containers (the database, third party binaries, uploads, vidjil
    results and log files) is settable in `.env` file. 
    Default path is set in `.env-default` at `VOLUME_PATH` variable.
    Default value is `./volumes/vidjil/` relative to docker directory.
    Change can also be done in `volumes` in `docker-compose.yml` for various services.
    See also <a href="#storage">Requirements / Storage</a> above.

  - Configure the reporter. Ideally this container should be positioned
    on a remote server in order to be able to report on a down server,
    but we have packed it here for convenience.
    You will also
    need to change the `DB_ADDRESS` in `conf/defs.py` to match it.



### Adding external software

Some software can be added to Vidjil for pre-processing or even processing if the
software outputs data compatible with the `.vidjil` or AIRR format.
A dedicated `binaries` volumes is created at your `$VOLUME_PATH`.
Executable should be automatically detected inside your container. 

!!! Warning
    Some binaries working on your computer may not work inside container environment.
    For compatibilities reasons, 
    keep in mind that some softwares need to be build inside a docker image to get correct libraries and compillers.


When the software has compatible inputs and outputs, it will be enough
to configure then the appropriate `pre process` or `analysis config` (to be documented).
In some cases, using the software may require development such as wrappers.
Contact us (<mailto:contact@vidjil.org>) to have more information and help.

### Troubleshooting


## CORS header 'Access-Control-Allow-Origin' missing

Sometime, you want to split the client and the server on different server. 
This type of configuration need to allow cross origin in nginx server.
To do so, you need to modify nginx configuration files `vidjil-client/conf/nginx_web2py` or `.../nginx_web2py_http`.
Adapt and add this line to server declaration: 

```
add_header 'Access-Control-Allow-Origin' 'your_other_domain';
```


#### Error "Can't connect to MySQL server on 'mysql'"

The mysql container is not fully launched. This can happen especially at the first launch.
You may relaunch the containers.

If restarting the containers does not resolve the issue, there are a couple of things
you can look into:

 - Ensure the database password in `vidjil-server/conf/defs.py` matches the password for
 the mysql user: `vidjil`.
 If you are not sure, you can check with the following:
 ```sh
 docker exec -it docker_mysql_1 bash
 mysql -u vidjil -p vidjil
 ```
 or reset it:
 ```sh
 docker exec -it docker_mysql_1 bash
 mysql -u root -p
 SET PASSWORD FOR vidjil = PASSWORD('<new password>');
 ```
 
 - Ensure the database was created correctly. This should have been done automatically,
 but just in case, you can check the console output, or check the database:
 ```sh
 docker exec -it docker_mysql_1 bash
 mysql -u vidjil -p vidjil
 ```
 If the database does not exist, mysql will display an error after logging in.

#### Launching manually the backup

The backup should be handled by the backup container, see [*Making backups* below](#making-backups). Otherwise you can use the `backup.sh` script by connecting to the `backup` or `uwsgi` container (for a full backup, otherwise add the `-i` option when
running `backup.sh`):

```sh
cd /usr/share/vidjil/server
sh backup.sh vidjil /mnt/backup >> /var/log/cron.log 2>&1
```

#### I can't connect to the py4web administration site
The URL to this site is https://mywebsite/_dashboard.
The password should be given in the docker `.env` environment file.

This password will not persist when the container will be restarted.
For a persistent password, please use the environment variable.

Each time you relaunch uwsgi server, the password is update to last value present in `.env`.

### Updating a Docker installation



#### Before the update

We post news on image updates at [changelogs docker](changelog-docker.md).
Check there whether the new image require any configuration change.

By security, we please you to always make a backup (see "Backups", below) before doing this process.
It is especially important to backup the database, as the update process may transform it.

#### Pulling the new images

``` bash
docker pull vidjil/server:latest
docker pull vidjil/client:latest
```

This will pull the latest version of the images.
More tags are available at <https://hub.docker.com/r/vidjil/server/tags/>.

If you do not have access to `hub.docker.com` on your server, then you
should pull and extract the image onto a machine that does,
send it to your server with your favourite method, and finally import
the image on the server.

Extract:
``` sh
docker save -o <output_file> vidjil/server[:<version>] vidjil/client[:<version>]
```

Import:
```sh
docker load -i <input_file>
```

#### Launch the new containers

In some cases, you may need to update your `docker-compose.yml` file or some
of the configuration files. We will describe the changes in the `CHANGELOG` file.
The latest versions of these files are available on our
[Gitlab](http://gitlab.vidjil.org/).

Once the images are pulled, you can relaunch the containers:
```sh
docker-compose down
docker-compose up
```

By default, all previous volumes will be reused and no data will be lost.
If the database schema was updated, web2py will update it on your database.
Check that the containers run well, and that you still manage to log on Vidjil
and to access the database, and to see a result from a sample.

If something is not working properly, you have still the option to rollback
to the previous images (for example by tagging as `latest` a previous image),
and possibly by reusing also your last databse backup if something went wrong.

#### Launching a single container

When an update occurs on a single container, one may not want to relaunch all
the containers, to save time. With `docker-compose` it is possible to do so.

Stop the desired container (for instance the client):
```
docker-compose stop nginx
```

Then launch it again

```
docker-compose up -d nginx
```

### Knowing what docker image version is running

As our latest image is always tagged `latest` you may have troubles to know
what version is currently running on your server. To determine that, you can
use the *digest* of the image. You can view it, for example with `docker image
--digests vidjil/server`. Then you can compare it with the digests shown [on
the Dockerhub page](https://hub.docker.com/r/vidjil/server/tags/).

## Plain server installation

!!! warning

    We used this installation on the public server between 2014 and 2018.
    This installation is not supported anymore.
    Only available installation should use docker service and docker containers (see above).


## Running the server in a production environment

### Introduction

When manipulating a production environment it is important to take certain
precautionnary mesures, in order to ensure production can either be rolled
back to a previous version or simply that any encurred loss of data can be
retrieved.

PY4web and Vidjil are no exception to this rule.

### Making backups

The top priority is to backup *files created during the analysis*
(either by a software or a human).
Should the data be lost, valuable man-hours would be lost.
In order to prevent this, we make several times a day incremental backups of the
data stored on the public Vidjil servers.

This task is done by `restic` service.

To work well, you need to create a dedicated user `backup` in your MySQL database and to give it access to vidjil database.

#### Set backup service

1. Modify user name and password

The `docker/backup/conf/backup.cnf` gives the authentication information to the database so that 
a backup user (read rights only required) can connect to the database.  
User name and password can be change. 
These change should be include to modify also values used by restic service. 
To do that, edit file `docker/backup/conf/backup.cnf`.


1. Open a terminal, open mysql interface inside docker image
```
# open terminal in your MySQL container
docker exec -it docker_mysql_1 bash

# Connect to Mysql as root. 
mysql -u root -p 
# Fill asked password with root password (variable `MYSQL_ROOT_PASSWORD` in .env file)
```


1. Create backup user and grant access to vidjil database

A backup use should be created indise MySQL database. 
Apply value `backup` and `password` according to change made at previous step.

```
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'password';
```

1. Set host availability to connection 

Host value (ip) of newly created user should be set. 
Use '%' to allow access from everywhere.
A more restrictive ip could be use for security, but check that your ip should be fixed and do not change regulary.

```
UPDATE mysql.user SET Host = "%" WHERE User = "backup";
FLUSH PRIVILEGES;
```

1. Add right to read 'vidjil' database content to make backup of data.
```
GRANT SELECT, LOCK TABLES ON `mysql`.* TO 'backup'@'%';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON `vidjil`.* TO 'backup'@'%';
```

1. Check that everything is setted and available.
```
SHOW GRANTS FOR backup;
```

1. Restast restic service

Backup is done by restic service. 
It need to be restarted to take into account change made on configuration file `docker/backup/conf/backup.cnf`.

Read docker logs for restic service to see if everything working well.

#### Note on backup content

Backup does not apply to uploaded files. 
We inform users that they should
keep a backup of their original sequence files.


Then the backup strategy can be configured in the `docker/backup/conf/backup-cron` file. The cron file states how often the backup script will be called. There are three options: backing up all results/analyses since yesterday, since the start of the month, since forever. On top of that the database is exported under two formats (CSV and SQL).

### Autodelete and Permissions

!!! warning
    Behavior not checked for py4web; 
    TODO

Py4web has a handy feature called `AutoDelete` which allows the administrator
to state that file reference deletions should be cascaded if no other
references to the file exist.
When deploying to production one needs to make sure `AutoDelete` is
deactivated.
This is the case for the default Vijdil installation (see `server/py4web/apps/vidjil/models.py`).

As a second precaution it is also wise to temporarily restrict py4web's
access to referenced files.

Taking two mesures to prevent file loss might seem like overkill, but
securing data is more important than the small amount of extra time spent
putting these mesures into place.

### Migrating Data


Usually, when extracting data for a given user or group, the whole database should not be
copied over.
The `migrator` script allows the selective export and import of data,
whether it be a single patient/run/set or a list of them, or even all the sample sets
associated to a group (or to a user).
The script takes care both of database, but also of results and analysis files (see below for sequence files).

See `server/scripts-web2py/migrator.py --help`

#### Exporting an archive

##### Step 1 : prepare the archive directory

First you should create an export directory to receive the exported data, if you are using a docker version of vidjil this directory must be accessible from your vidjil-server docker container.
a possible location could be `[DOCKER DIRECTORY]/vidjil-server/conf/export/`

##### step 2 : give access permission to a group for the results you want to export

Exports are group based, you can export all results owned by a group or create a new group and provide it with permissions on the results you want to export using the vidjil server interface as an admin user.

Keep the `[GROUP_ID]` you can find on the group page (displayed between parenthesis next to the group name) as you will require it for the next step

##### step 3 : run export command

A script `migrator.sh` can be found in vidjil, if you are using the docker version, it can be found at this location in the vidjil-server container: `/usr/share/vidjil/server/scripts-web2py/scripts`.

```bash
sh migrator.sh -p [EXPORT_DIRECTORY] -s [WEB2PY_RESULTS_DIRECTORY] export group [GROUP_ID]
```

- `[EXPORT_DIRECTORY]`:  path to the export directory inside the vidjil-server container you should have prepared in step 1.
- `[WEB2PY_RESULTS_DIRECTORY]`: the results directory path inside the container, it should be defined in your `docker-compose.yml`, by default it is `/mnt/result/results/`
- `[GROUP_ID]`: id of the group owning the results to be exported (see step 2)

The config analyses and pre-processes are currently not exported as they may already exist on the recipient server and are depending on tools that can be missing or installed differently. Config and pre-processes must therefore be recreated or mapped manually to existing one on the recipient server (see next section step 3-4).

#### Importing an archive

##### Step 1 : extract the archive on your server

The export directory must be on your server and accessible from your vidjil-server docker container.
You can define a new shared volume; or simply put the export directory on an already accessible location such as  `[DOCKER DIRECTORY]/vidjil-server/conf/export/`

##### Step 2 : prepare the group that will own the data

The permissions on a vidjil server are *group* based. Users and groups may be different from one server to another one. Before importing data on a server, one must have a group ready to receive the permissions to manage the imported files.

From the admin web interface has, you can create a new group  ("groups" -> "+new group" -> "add group"). The group ID is displayed between parenthesis next to its name on the group page, you will need it later. If you create such a group on a blank vidjil server, the ID is *4*.

##### Step 3 : prepare your server analysis configs

*This step may require bioinformatics support depending on your data, the config previously used, and the ones you intend to use on your new installation. We can offer support via the [VidjilNet consortium](http://www.vidjil.net) for help on setting that.*

Vidjil analysis configs should not be directly transferred between servers. Indeed, they depend on the setup of each server setup (software, paths...) and can collide with existing configs on your installation. Before importing, you thus need to create the missing analysis configs on your server and edit the `config.json` file provided in the export folder.

This `config.json` file initially contains a list of the analysis configs from the original public server, such as:

```
  "2": {
      "description": [
        "IGH",
        "vidjil",
        "-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH,IGK,IGL,TRA,TRB,TRG,TRD -e 1 -w 50 -d -y all",
        "-t 100 -d lenSeqAverage",
        "multi-locus"
      ],
      "link_local": 6
  },
```

- `"2"`           :  the original config ID on the server from which the data was exported
- `"description"` :  the original config parameters (only for information, they are ignoed in the import)
- `"link_local"`  :  the config ID that will be used on the new server

In the `config.json` file, you have to replace all` link_local` values with the corresponding config ID
of a similar config on your server (if you don't have a similar one you should create one).

If much of your imported data was on `old` configs, that you do not intend to run anymore,
a solution is to create a generic `legacy` config for these old data.

Below is an example of such a `config.json`, linking actual configuration on the public `app.vidjil.org` server to configs to a newly installed server.
This should be completed by a mapping of other configs that were used in the migrated data.

```
{
  "2": {
    "description": [ "IGH", "vidjil",  "-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH,IGK,IGL,TRA,TRB,TRG,TRD -e 1 -w 50 -d -y all", "-t 100 -d lenSeqAverage",  "multi-locus" ],
    "link_local": 6
  },
  "25": {
    "description": [ "multi+inc+xxx",  "vidjil",  "-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 -y all",  "-t 100 -d lenSeqAverage",  "default: multi-locus, with some incomplete/unusual/unexpected recombinations"
    ],
    "link_local": 2
  },
  "26": {
    "description": [ "multi+inc", "vidjil", "c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -d -w 50",  "-t 100",  "multi-locus, with some incomplete/unusual recombinations" ],
    "link_local": 3
  },
  "30": {
    "description": [
      "TRG", "vidjil", "-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:TRG -y all", "-t 100 -d lenSeqAverage", "TRG, VgJg"
    ],
    "link_local": 5
  },
  "32": {
    "description": [ "multi", "vidjil", "-c clones -3 -z 100 -r 1 -g germline/homo-sapiens.g:IGH,IGK,IGL,TRA,TRB,TRG,TRD -e 1 -w 50 -d -y all", "-t 100 -d lenSeqAverage", "multi-locus" ],
    "link_local": 4
  }
}
```



##### Step 4 : prepare your server pre-process configs

Proceed as in step 3 for pre-process configs. The file to edit is named `pprocess.json`.


##### Step 5 : import

The import takes place inside the vidjil-server container
```sh
docker exec -it docker_uwsgi_1 bash
cd usr/share/vidjil/server/scripts-web2py/
sh migrator.sh -p [RESULTS DIRECTORY] -s [EXPORT DIRECTORY] import --config [CONFIG.JSON FILE] --pre-process [PPROCESS.JSON FILE] [GROUP ID]
```

- `[RESULTS DIRECTORY]`:          the results directory path inside the container, it should be defined in your `docker-compose.yml`, by default it is `/mnt/result/results/`
- `[EXPORT DIRECTORY]`:        the export directory you installed in step 1, if you set it up in `docker/vidjil-server/conf/export/` is location inside the container should be `/etc/vidjil/export/`
- `[CONFIG.JSON FILE]`         this file is located in the export folder and you should have edited it during step 3
- `[PPROCESS.JSON FILE]`         this file is located in the export folder and you should have edited it during step 4
- `[GROUP ID]`                         ID of the group you should have created/selected during step 2

Usually, the command is thus:
```sh
sh migrator.sh -p /mnt/result/results/ -s /etc/vidjil/export/XXXX/ import --config/etc/vidjil/exportXXXX/config.json --pre-process /etc/vidjil/export/XXXX/pprocess.json  4
```



#### Exporting/importing input sequence files

Note that web2py and the Vidjil server are robust to missing *input* files.
These files are not backuped and may be removed from the server at any time.
Most of the time, these large files won't be migrated along with the database, the results and the analysis files.

However, they can simply be copied over to the new installation. Their filenames
are stored in the database and should therefore be accessible as long as
they are in the correct directories.



#### Exporting/importing a full database

When a full database migration is needed, it can be done with the following command:

``` bash
mysqldump -u <user> -p <db> -c --no-create-info > <file>
```

The `--no-create-info` option is important because web2py needs to be allowed to create tables itself.
Indeed, it keeps track of database migrations and errors will occur if
tables exist which it considers it needs to create.

In order to import the data into an installation you first need to ensure
the tables have been created by Py4web. This can be achieved by simply
accessing a non-static page.

!!! warning

    If the database has been initialised from the interface you will
    likely encounter primary key collisions or duplicated data, so it is best
    to skip the initialisation altogether.

Once the tables have been created, the data can be imported as follows:

``` bash
mysql -u <user> -p <db> < <file>
```

At least the results and analysis files should thus be copied.

Please note that with this method you should have at least one admin user
that is accessible in the imported data. Since the initialization is being
skipped, the usual admin account won't be present.
It is also possible to create a user directly from the database although
this is not the recommended course of action.


## Using CloneDB [Under development]

!!! note

  This documentation is not suitable for py4web version of server.
  Please wait for release 2024.06 to be fixed.
  If you need to use it until this date, please contact us at support@vidjil.org.


The [CloneDB](https://gitlab.inria.fr/vidjil/clonedb) has to be installed
independently of the Vidjil platform.

Then one can easily extract data to be used with CloneDB. A script is provided
(`server/web2py/applications/vidjil/scripts/create_clone_db.py`) which
produces a FASTA file to be indexed with CloneDB. This script takes as
parameter the FASTA output file and one (or many) group IDs, which correspond
to the groups having access to the datasets. Note that for the moment the Vidjil platform only allow a per group access to the CloneDB.

The FASTA output filename must follow the format `clonedb_XXX.fa` where `XXX`
is replaced with the group ID.

Make sure that the `DIR_CLONEDB` variable is set in `defs.py` and points to
the CloneDB server directory. Make sure that in this directory the
`clonedb_defs.py` has been filled correctly.

Then index the created FASTA file with the CloneDB index (follow the
instructions from CloneDB).
