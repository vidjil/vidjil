!!! note
    This is the help of the Vidjil server.  
    This help is intended for server administrators.  
    Users should consult the [web application manual](https://www.vidjil.org/doc/user/)  
    Other documentation can also be found in [doc](https://www.vidjil.org/doc/).  

The supported way to install, run, and maintain a Vidjil server
is to use **Docker containers**.
We are developing and deploying them since 2018, and,
as of 2025, these Docker containers are used on all our servers (healthcare, public)
as well as in some partner hospitals.
See the [hosting options](https://wwW.vidjil.org/doc/healthcare/),
including support and remote maintenance
such in-hospital servers through
the [VidjilNet consortium](https://www.vidjil.net/).

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
- Health certified server: 8 cores/16 threads, 64 Go RAM, with redundant backups
- [Public server](https://app.vidjil.org): 16 vCPUs (11 workers), 120GB RAM

### Storage

#### Full upload of sequences

As for many high-throughput sequencing pipeline, **disk storage to store input data (`.fastq`, `.fasta`, `.fastq.gz` or `.fasta.gz`)
is now the main constraint** in our environment.

Depending on the sequencer, files can weigh several GB.
Depending of the number of users, a full installation's total storage should thus be several hundred GB, or even several TB
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
Contact us if you need help in setting up such an authentication.

### Network

Once installed, the server can run on a private network.
However, the following network access are recommended:

- outbound access
  - for users: several features using external platforms (IgBlast, IMGT/V-QUEST…)
  - for server maintainers: upgrades and reports to a monitor server
- inbound access
  - through the [VidjilNet consortium](https://www.vidjil.net),
    the team may help local server maintainers in some monitoring, maintenance and upgrade tasks,
    provided a SSH access can be arranged, possibly over VPN.

## Installation with docker

All our images are hosted on DockerHub in the [vidjil](https://hub.docker.com/r/vidjil) repositories.
The last images are tagged with `vidjil/server:latest` and `vidjil/client:latest`.

Individual services are started by [docker-compose](https://docs.docker.com/compose/).

### Before installation

- Install [docker](https://docs.docker.com/engine/install/) and [docker compose](https://docs.docker.com/compose/install/#install-compose)
  If it doesn't exist yet, you should create a `docker` group. The users needing to access docker (typically administrators) must belong to this group.

- Install [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).
  Clone the [Vidjil git](https://gitlab.inria.fr/vidjil/vidjil) with `git clone https://gitlab.inria.fr/vidjil/vidjil.git`,
  and go to the directory [vidjil/docker](https://gitlab.inria.fr/vidjil/vidjil/tree/dev/docker).
  It contains [docker-compose.yml](https://gitlab.inria.fr/vidjil/vidjil/-/blob/dev/docker/docker-compose.yml) as well as configuration files.

### Docker environment

The vidjil Docker environment is managed by `docker compose`, who launches the following services:

From image `vidjil/client`

- `nginx` The front web server, containing the client web application and redirecting requests to uwsgi if needed

From image `vidjil/server`

- `uwsgi` py4web backend server
- `workers-all` and `workers-short`: The [scheduler workers](dev-server.md#scheduler) to run vidjil users' samples and other pre/post-process
- `flowers` Front-end to monitor the status of py4web workers
- `fuse` XmlRPCServer that handles custom fuses (for comparing samples)

From other images

- `mysql` The database
- `redis` Queue service to dispatch jobs to [workers](dev-server.md#scheduler)
- `restic` Service that schedules regular backups

### Network usage and SSL certificates

*If you are simply using Vidjil from your computer for testing purposes you can skip the next two steps.*

- Step 1 : Change the hostname in the nginx configuration `vidjil-client/conf/nginx_vidjil`,
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

   ```sh
   openssl genrsa 4096 > vidjil.key
   openssl req -new -x509 -nodes -sha1 -days 1780 -key vidjil.key > vidjil.crt
   openssl x509 -noout -fingerprint -text < vidjil.crt
   mkdir -p vidjil-client/ssl
   mv vidjil.* vidjil-client/ssl/
   ```

  - If you are using the `postfix` container you may want to generate certificates (using the same process) and place them in `postfix/ssl`.
    The certificates must bear the name of your mail domain (\<mail-domain\>.crt and \<mail-domain\>.key)

- A better option is to use other certificates, for example by configuring free [Let's Encrypt](https://letsencrypt.org/) certificates.
  One solution is to use `certbot` on the host to generate the certificates and to copy them in the right directory so that the container
  can access it.
  See [Nginx and Let’s Encrypt with Docker](https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71).
  To check the integrity of the host, `certbot` needs to set up a challenge.
  Thus, Nginx needs to provide specific files that are generated by `certbot`.
  To do so, you should tell `certbot` to put those files in the `/opt/vidjil/certs`
  directory (this can be changed in the `docker-compose.yml` file).
  You can generate the certificates with the command `certbot certonly --webroot -w /opt/vidjil/certs -d myvidjil.org`.
  You'll need to update the Nginx configuration in `docker/vidjil-client/conf/nginx_vidjil`
  Then:

  ```sh
  ln -s /etc/letsencrypt/live/vdd.vidjil.org/fullchain.pem vidjil-client/ssl/vidjil.crt
  ln -s /etc/letsencrypt/live/vdd.vidjil.org/privkey.pem vidjil-client/ssl/vidjil.key
  ```

  The certificates can be renewed with `certbot renew` to do so, you may wish to mount `/etc/letsencrypt` in the Docker image as a volume (*eg.* `/etc/letsencrypt:/etc/nginx/ssl`).
  However beware, because you would not be able to start Nginx till the certificates are in place.
  On certificate renewal (with `certbot`), you then need to restart the Nginx server. The following `cron` line can be used for certificate renewal (you may want to update the paths):

  ```sh
  0 0 1 * * root (test -x /usr/bin/certbot && perl -e 'sleep int(rand(14400))' && certbot --webroot -w /opt/vidjil/certs renew && (cd /path/to/vidjil/docker/vidjil/docker; sudo -u vidjil docker-compose stop nginx && sudo -u vidjil docker-compose rm -f nginx && sudo -u vidjil docker-compose up -d nginx)) >> /var/log/certbot.log 2>&1
  ```

If necessary, in `docker-compose.yml`, update `nginx.volumes`, line `./vidjil-client/ssl:/etc/nginx/ssl`, to set the directory with the certificates.

If you would prefer to use the vidjil over HTTP (not recommended outside of testing purposes), you can
use the provided configuration files in `docker/vidjil-server/conf` and `docker/vidjil-client/conf`. You will find several files
that contain "http" in their name. Simply replace the existing config files with their HTTP counter-part (for safety reasons, don't
forget to make a backup of any file you replace.)

### First configuration and first launch

- Set the [SSL certificates](#network-usage-and-ssl-certificates)
- Change the mysql root password, mysql user password and the py4web admin password in `.env.default` file
  - `MYSQL_ROOT_PASSWORD` is the password for the root user of MySQL
  - `MYSQL_PASSWORD` is the password for the `vidjil` user of MySQL
  - `PY4WEB_ADMIN_PASSWORD` is the password for the py4web admin user
- Set the number of workers and uwsgi threads in `.env.default`. Keep at least one threads not used to not overload server
  - `WORKERS_POOL` is the number of workers to run. The default value is the number of threads minus 1.
  - `UWSGI_POOL` is the number of threads to run for uwsgi. The default value is 6.
- Start the services with `docker-compose up -d`.

Then `docker ps` should display seven running containers for a localhost usage:
`vidjil-nginx`, `vidjil-uwsgi`, `vidjil-mysql`, `vidjil-fuse`, `vidjil-workers`, `vidjil-flowers`, `vidjil-redis`.
Service `restic` is useful for backup and email communication and need to be started for regular installation.

- Vidjil also need germline files.
  - You can use IMGT germline files if you accept IMGT license.
    For this, from the `vidjil` directory (root of the git repository),
    run `make germline` to create `germline/` while checking the license.
  - These germlines are included in the server container with a volume in the fuse block
    in your `docker-compose.yml`: `../germline:/usr/share/vidjil/germline`.
  - Copy also the generated `browser/js/germline.js` into the `docker/vidjil-client/conf/` directory.

- Open a web browser to `https://localhost`, or to your FQDN if you configured it (see [above](#network-usage-and-ssl-certificates)).
Click on `init database` and create a first account by entering an email.
This account is the main root account of the server. Other administrators could then be created.

- Once these main service are set, you can also set docker service for backup and mail communication.

*notice* : By default, Nginx HTTP server listens for incoming connection and binds on port 80 on the host, if you encounter the following message error:

```txt
ERROR: for nginx
Cannot start service nginx: driver failed programming external
connectivity on endpoint vidjil-nginx
(236d0696ed5077c002718541a9703adeee0dfac66fb880d193690de6fa5c462e):
Error starting userland proxy: listen tcp 0.0.0.0:80: bind: address already in use
```

You can resolve it either by changing the port used by Vidjil in the `nginx.ports`
section of the `docker-compose.yml` file or by stopping the service using port
80.

### Connect to docker containers

Sometimes, in order to perform some maintenance operations, one may need to connect to a running docker container:

```bash
# Using docker and container name
docker exec -it <container_name> bash
# In docker folder using compose service name
docker compose exec -it <service_name> bash
```

For example, to connect to uwsgi, if the default container name was not modified:

```bash
# Using docker and container name
docker exec -it vidjil-uwsgi bash
# In docker folder using compose service name
docker compose exec -it uwsgi bash
```

NB: modifications done inside the container will be lost if container is destroyed (`docker compose down` or server restart), unless the modified files are stored in a mounted folder.

### Further configuration

Configuration files can be found in the `vidjil/docker` directory. Among them:

- `.env.default` various variables use and transmit by docker to container: path, password, pool of workers, ...
- `vidjil-client/conf/conf.js` various variables for the vidjil client
- `vidjil-client/conf/nginx_vidjil` configuration for the nginx server
- `vidjil-client/conf/nginx_gzip.conf` configuration for gzip in nginx
- `vidjil-server/conf/uwsgi.ini` configuration required to run vidjil with uwsgi
- `vidjil-server/scripts/uwsgi-entrypoint.sh` entrypoint for the uwsgi service. Ensures the owner of some relevant volumes are correct within the container and starts uwsgi

Here are some notable configuration changes you should consider. List of settable variables is in `docker/.env.default`. It can be modified directly in the file or by creating a new `.env.something` file. In this case, you need to update the `env-file` option in the `docker-compose.yml` or `docker-compose.override.yml` file (see [docker compose docs](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/#use-the-env_file-attribute)).

- mysql root and vidjil passwords, as well as py4web password should be set as mentioned [above](#first-configuration-and-first-launch).

- Vidjil is able to send emails to users or admins. You need to configure the mail server to use.
  You can use an external SMTP server (or set up your own with postfix for example).
  The configuration should be done in the `docker/.env.default` file:
  - `SMTP_SERVER` is the SMTP server to use, with format "address:port"
  - `SMTP_CREDENTIALS` is the credentials to use, with format "user:password"
  - `SMTP_FROM_EMAIL` is the sender address to use, with format "name@domain". It can be different from the credentials, but in this case, the receiver may consider it as spam.
  - `SMTP_DOMAIN` is the domain to use, with format "domain".
  - `SMTP_ADMIN_EMAILS` is the list of admin emails to use when sending emails to admin (in case of errors on the server for example). The format to use is ["name1@domain1", "name2@domain2"] (or ["name1@domain1"] if only one admin).
  - `SMTP_EMAIL_SUBJECT_START` is the subject prefix to use when sending emails to admin (in case of errors on the server for example). Default is "[Vidjil]".
  - `SMTP_TLS` defines if TLS should be used, with format "true" or "false". Default is "true".
  - `SMTP_SSL` defines if SSL should be used, with format "true" or "false". Default is "false".
  The configuration can be tested in the `admin` page of the web application (see [admin documenation](admin.md#database-maintenance))

- <a name='healthcare'></a>
  If, according yo your local regulations, the server is suitable for hosting clinical data,
  you may update the `HEALTHCARE_COMPLIANCE` variable in `.env.default` to `true`.
  and the `healthcare` variable in `vidjil-client/conf/conf.js` to remove warnings related to non-healthcare compliance.
  Updating this variable is the sole responsibility of the institution responsible for the server,
  and should be done in accordance with the regulations that apply in your country.
  See also the [hosting options](healthcare.md) offered by the VidjilNet consortium.

- To allow users to select files from a mounted volume,
  set `FILE_SOURCE` and `FILE_TYPES` in `.env.default`.
  In this case, the `DIR_SEQUENCES` directory will be populated with links to the selected files.
  Users will still be allowed to upload their own files.

- By default path directory for files that require saving outside of the containers (the database, third party binaries, uploads, vidjil results and log files) is settable in `.env.default` file. Default path is set in `.env.default` at `VOLUME_PATH` variable. Default value is `./volumes/vidjil/` relative to docker directory. Change can also be done directly in `volumes` in `docker-compose.yml` for various services or in `docker-compose.override.yml`. See also [Requirements / Storage](#storage) above.

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
    keep in mind that some softwares need to be built inside the docker container to get correct libraries and compilers.

When the software has compatible inputs and outputs, it only requires
to configure the appropriate `pre process` or `analysis config` (to be documented).
In some cases, using the software may require development such as wrappers.
[Contact us](mailto:contact@vidjil.org) to have more information and help.

### Troubleshooting

#### CORS header 'Access-Control-Allow-Origin' missing

Sometime, you want to split the client and the server on different server.
This type of configuration need to allow cross origin in nginx server.
To do so, you need to modify nginx configuration files `vidjil-client/conf/nginx_vidjil` or `.../nginx_vidjil_http`.
Adapt and add this line to server declaration:

```nginx
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
  docker exec -it vidjil-mysql bash
  mysql -u vidjil -p vidjil
  ```

  or reset it:

  ```sh
  docker exec -it vidjil-mysql bash
  mysql -u root -p
  SET PASSWORD FOR vidjil = PASSWORD('<new password>');
  ```

- Ensure the database was created correctly. This should have been done automatically,
  but just in case, you can check the console output, or check the database:

  ```sh
  docker exec -it vidjil-mysql bash
  mysql -u vidjil -p vidjil
  ```

  If the database does not exist, mysql will display an error after logging in.

#### Launching the backup manually

The backup should be handled by the restic container, see [*Making backups* below](#making-backups). Otherwise backup can be done manually, see [database doc](server.md#database).

#### I can't connect to the py4web administration site

The URL to this site is your-website/_dashboard.
The password should be given in the docker `.env` environment file.

### Updating a Docker installation

1. Adapt the config for the new version (see [docker changelog](https://www.vidjil.org/doc/changelog-docker))
    1. See if modifications are needed in `.env` files
    1. See if modifications are needed in other specific configuration file (`docker-compose.yml`, `conf.js`, `defs.py`, ...). **Be careful**: do not apply the config right now, wait for the new version to be deployed.
1. Set-up a warning message on your front end server if it is separated (otherwise, the front will be shutdown and the server will not answer):
    1. Connect to the front-end server.
    1. In `conf.js` file, set `use_database` to `false`. This will deactivate db access. In order to display an explicit message, uncomment the `alert:` part, setting explicit `title` and `msg`.
    1. Restart the nginx service to take new config into account: `docker compose restart nginx`.
    1. Re-load front-end webpage with no cache (Ctrl+F5 for example) and check the alert message is correctly displayed and database cannot be accessed.
1. Stop docker (on the backend server): `docker compose down`
1. Check if server needs to be updated (for instance `sudo apt-get update && apt-get upgrade`), and may be restarted. This is a good time to do that !
1. Check restic ran after the last modification. If need be, restart restic services: `docker compose up -d restic`. This should trigger an immediate save. After that, connect to restic service to see that an up-to-date snapshot exists.
1. Check if there are uncommitted changes in vidjil repo in `vidjil` folder. The idea here is to prevent having specific element in the server. Check if specificity can be committed to vidjil, or if it can be in the specific config repo. If not, save the modifications before checkout.
1. Backup database (!! Before update !!). The backup file may be found in the path mounted by restic. If need be, it can be done manually using [database export](#database-export)
1. git checkout the new vidjil tag/branch.
1. Re-apply local modifications if need be.
1. Update specific config, either by running the corresponding [pipeline](https://gitlab.inria.fr/vidjil/config/-/pipelines) or by pulling the branch and applying config `./apply_targets.sh`
1. Download new docker images: `docker pull vidjil/server` and `docker pull vidjil/client` (hopefully we should improve this to use defined versions of images and not `latest` sometimes...)
1. If need be, update the `contrib` repo
1. If need be, the database backup should be loaded from a fresh db, see [database import](#database-import)
1. Start all services: `docker compose up -d`
1. Tests modification directly in back-end website (do not forget to empty browser cache)
1. Update front-end server if it is separated using the same procedure, then reactivate front-end: modify `conf.js` file back to its old value

### Knowing what docker image version is running

As our latest image is always tagged `latest` you may have troubles to know
what version is currently running on your server. To determine that, you can
use the *digest* of the image. You can view it, for example with `docker image
--digests vidjil/server`. Then you can compare it with the digests shown [on
the Docker Hub page](https://hub.docker.com/r/vidjil/server/tags/).

## Running the server in a production environment

### Introduction

When manipulating a production environment it is important to take certain
precautionary measures, in order to ensure production can either be rolled
back to a previous version or simply that any incurred loss of data can be
retrieved.

PY4web and Vidjil are no exception to this rule.

### Database

#### Database export

```bash
docker compose up -d mysql # to be sure mysql is running
docker compose exec -it mysql bash
mysqldump -u <backup-user> -p --no-create-info --complete-insert --no-tablespaces vidjil > <backup-file.sql>
```

Then move the created sql file to a mounted folder to access it outside the container, and store it in a proper location.

NB: `mysqldump` may be replaced by `mariadb-dump` some times soon.

An important element to note here is the `--no-create-info`. We add this parameter because py4web needs to be allowed to create tables itself because it keeps track of database migrations and errors will occur if tables exist which it considers it needs to create.

#### Database import

In order to import the data from another server, you need to ensure there will be no key collision, or the import will fail.

If the database contains data, the easiest is to drop the database and create a new database with empty tables:

1. Stop the running services: `docker compose down`
1. Drop the database : You need to
   1. Delete the `volumes/vidjil/mysql` folder (or the corresponding mounted folder)
   1. Delete the .table files used by py4web in `volumes/vidjil/databases` (or the corresponding mounted folder).
1. Recreate a database with empty tables: this is done by starting `mysql` and `uwsgi` services: `docker compose up -d mysql uwsgi`

NB: Let the tables be uninitialized here to prevent keys collisions.

Once the tables have been created, the data can be imported as follows:

```bash
docker compose exec -it mysql bash
mysql -u <user> -p vidjil < <backup-file.sql>
```

After this, starts all services using `docker compose up -d`.

### Making backups

The top priority is to backup *files created during the analysis*
(either by a software or a human).
Should the data be lost, valuable man-hours would be lost.
In order to prevent this, we make several times a day incremental backups of the
data stored on the public Vidjil servers.

#### Setting up `restic` service

The backup task is done using the [restic](https://restic.net/) tool. To do this, we add a `restic` service in our docker compose configuration. An example of how to set the service up is implemented in `docker-compose-dev.yml`. Restic password is to modify in .env file.

To be able to get data from the database, you need to create a dedicated user `backup` in your MySQL database and to give it access to vidjil database, see [below](#create-backup-user).

Some commands (see [restic doc](https://restic.readthedocs.io/en/stable/) for more details):

- to see snapshots:
  1. Get in the docker container from vdb server:
    `docker exec -it vidjil-restic bash`
  1. Run command `restic snapshots`

- to load a snapshot:
  1. Get in the docker container from vdb server:
    `docker exec -it vidjil-restic bash`
  1. Run command `sudo restic restore [snapshot id] --target [/folder]`

#### Create backup user

1. Set backup user password

  The password for the backup user is to be defined in your .env file (either `.env.default` or you specific .env.something file), setting the value of `MYSQL_BACKUP_PASSWORD`.

1. Open a terminal, open mysql interface inside docker image

  ```sh
  # open terminal in your MySQL container
  docker exec -it vidjil-mysql bash

  # Connect to Mysql as root. 
  mysql -u root -p 
  # Fill asked password with root password (variable `MYSQL_ROOT_PASSWORD` in .env file)
  ```

1. Create backup user and grant access to vidjil database

  A backup use should be created inside MySQL database.
  Apply value `backup` and `password` according to change made at previous step.

  ```sql
  CREATE USER 'backup'@'localhost' IDENTIFIED BY 'password';
  ```

1. Set host availability to connection

  Host value (ip) of newly created user should be set.
  Use '%' to allow access from everywhere.
  A more restrictive ip could be use for security, but check that your ip should be fixed and do not change regularly.

  ```sql
  UPDATE mysql.user SET Host = "%" WHERE User = "backup";
  FLUSH PRIVILEGES;
  ```

1. Add right to read 'vidjil' database content to make backup of data.

  ```sql
  GRANT SELECT, LOCK TABLES ON `mysql`.* TO 'backup'@'%';
  GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON `vidjil`.* TO 'backup'@'%';
  ```

1. Check that everything is set and available.

  ```sql
  SHOW GRANTS FOR backup;
  ```

1. Restart restic service to force backup now

  If you want to save now, restart restic: `docker compose restart restic`. Check logs to verify that backup is OK. One can also check size and date of `dump.sql` file in the folder mounted on `/mnt/volumes/sql` in restic container.

!!! note
    Read docker logs for restic service to see if everything is working as expected.

#### Note on backup content

By default, backup does not apply to uploaded files. In the server we run, we inform users that they should keep a backup of their original sequence files.

However, the configuration of `restic` service could be modified to save uploaded files, or other ones, see [restic documentation](https://restic.readthedocs.io/en/stable/).

### Autodelete and Permissions

!!! warning
    Behavior not checked for py4web;
    TODO

Py4web has a handy feature called `AutoDelete` which allows the administrator
to state that file reference deletions should be cascaded if no other
references to the file exist.
When deploying to production one needs to make sure `AutoDelete` is
deactivated.
This is the case for the default Vidjil installation (see `server/py4web/apps/vidjil/models.py`).

As a second precaution it is also wise to temporarily restrict py4web's
access to referenced files.

Taking two measures to prevent file loss might seem like overkill, but
securing data is more important than the small amount of extra time spent
putting these measures into place.

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
sh migrator.sh -p [EXPORT_DIRECTORY] -s [PY4WEB_RESULTS_DIRECTORY] export group [GROUP_ID]
```

- `[EXPORT_DIRECTORY]`:  path to the export directory inside the vidjil-server container you should have prepared in step 1.
- `[PY4WEB_RESULTS_DIRECTORY]`: the results directory path inside the container, it should be defined in your `docker-compose.yml`, by default it is `/mnt/result/results/`
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

*This step may require bioinformatics support depending on your data, the config previously used, and the ones you intend to use on your new installation. We can offer support via the [VidjilNet consortium](https://www.vidjil.net) for help on setting that.*

Vidjil analysis configs should not be directly transferred between servers. Indeed, they depend on the setup of each server setup (software, paths...) and can collide with existing configs on your installation. Before importing, you thus need to create the missing analysis configs on your server and edit the `config.json` file provided in the export folder.

This `config.json` file initially contains a list of the analysis configs from the original public server, such as:

```json
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
- `"description"` :  the original config parameters (only for information, they are ignored in the import)
- `"link_local"`  :  the config ID that will be used on the new server

In the `config.json` file, you have to replace all `link_local` values with the corresponding config ID
of a similar config on your server (if you don't have a similar one you should create one).

If much of your imported data was on `old` configs, that you do not intend to run anymore,
a solution is to create a generic `legacy` config for these old data.

Below is an example of such a `config.json`, linking actual configuration on the public `app.vidjil.org` server to configs to a newly installed server.
This should be completed by a mapping of other configs that were used in the migrated data.

```json
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
docker exec -it vidjil-uwsgi bash
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

Note that py4web and the Vidjil server are robust to missing *input* files.
These files are not backed up and may be removed from the server at any time.
Most of the time, these large files won't be migrated along with the database, the results and the analysis files.

However, they can simply be copied over to the new installation. Their filenames
are stored in the database and should therefore be accessible as long as
they are in the correct directories.

## Server Monitoring

![New with release 2024.12](https://img.shields.io/badge/Release-2024.12-blue)

Some monitoring features are accessible through the web application with the addition of a new dedicated controller, allowing the retrieval of metrics from a Vidjil server instance. A full list of available metrics will be described below.

The goal of these metrics is to be regularly called by an [API instance](https://gitlab.inria.fr/vidjil/metrics/metrics-instance) to be integrated into an external monitoring service. The tools used in our pipeline combine the [Vidjil API](api.md) for metrics requests, [Prometheus](https://prometheus.io/) for metrics storage, and [Grafana](https://grafana.com/) for visualization.

``` mermaid
graph TB
    subgraph Metrics servers
    D[Grafana<br>viewer] -- ask<br>metrics  --> C;
    C -- serve<br>metrics  --> D;
    C -- recurrent<br>requests  --> B;
    B -- formatted<br>metrics --> C[Prometheus<br>DB];
    end

    V1 ~~~ V2;
    V1 ~~~ VX;
    V2 ~~~ VX;

    V1(**Vidjil<br>server 1**) -- raw<br>metrics --> B[API<br>server];
    V2(**Vidjil<br>server 2**) -- raw<br>metrics --> B[API<br>server];
    VX(**Vidjil<br>server X**) -- raw<br>metrics --> B[API<br>server];
    B -- request<br>metrics --> V1;
    B -- request<br>metrics --> V2;
    B -- request<br>metrics --> VX;
```

A dedicated configuration of these tools can be found at this [page](https://gitlab.inria.fr/vidjil/metrics/metrics-server) and could be set up with a simple docker configuration.

### Set up monitoring

A set of three steps/conditions should be filled:

#### Add a dedicated metrics user and group

This new group will only see metrics information.

If you start from a fresh installation initialized from scratch, a dedicated group named *metrics* will be automatically created.  
If not, you will have to create it yourself (see [Creating groups](admin.md#creating-groups)), name it *metrics*, and remove all rights in it.

An automatic creation of this user can be set at database initialization. To do this, various metrics variables should be set in `docker/.env.default` at the initialization of the database (`METRICS_USER_PASSWORD`, `METRICS_USER_EMAIL`).  
If you have already initialized the database or done a server upgrade, you can also create a dedicated user and add it to this group.

#### Start a metrics server instance

A metrics server instance should be installed, that will launch the combination of Vidjil API/Prometheus/Grafana to monitor server. More documentation on this last point will be found on [dedicated repository](https://gitlab.inria.fr/vidjil/metrics/metrics-server) and updated regularly with usage adoption.

#### Update some data in database

A call to `set_creator_samples_set` should be done at migration to be able to access previous data more efficiently.

### Available metrics

A complete list of available metrics is listed here, and can be found in `metrics.py` file.

Note that some metrics are more computational intensive than others. We chose to split metrics in 2 lists: `fast`, `long`. Note that metrics server will call `long` metrics less often than `fast` ones.

| Metrics                           | List | Descriptions                                                                                         |
| :-------------------------------- | :--- | :--------------------------------------------------------------------------------------------------- |
| group_count                       | fast | Get number of groups                                                                                 |
| set_patients_count                | fast | Get number of patients for all users                                                                 |
| set_runs_count                    | fast | Get number of runs for all users                                                                     |
| set_generics_count                | fast | Get number of generic sets for all users                                                             |
| set_patients_by_user              | fast | Get number of patients split by user id                                                              |
| set_runs_by_user                  | fast | Get number of runs split by user id                                                                  |
| set_generics_by_user              | fast | Get number of generic split by user id                                                               |
| sequence_count                    | fast | Get number of sequences files                                                                        |
| results_count                     | fast | Get number of results present on server                                                              |
| sequence_by_user                  | fast | Get number of sequences files by user                                                                |
| sequence_size_by_user             | fast | Get sump of sequence files by users                                                                  |
| config_analysis                   | fast | Get list of analysis split by configurations                                                         |
| config_analysis_by_users_patients | fast | Get list of analysis, split by configurations, only for patients                                     |
| config_analysis_by_users_runs     | fast | Get list of analysis, split by configurations, only for runs                                         |
| config_analysis_by_users_generic  | fast | Get list of analysis, split by configurations, only for generics sets                                |
| login_count                       | fast | Get number of login count, group by user id                                                          |
| status_analysis                   | fast | Get number of analysis grouped by status (allows to see pending, finish, running or failed analysis) |
| set_patients_by_group             | long | Get number of patients split by groups                                                               |
| set_runs_by_group                 | long | Get number of runs split by groups                                                                   |
| set_generics_by_group             | long | Get number of generic split by groups                                                                |
| config_analysis_by_groups         | long | Get number of analysis split by configs and by groups                                                |

## Using CloneDB [Under development]

!!! note
  This documentation is not suitable for py4web version of server.
  Please wait for release 2025.06 to be fixed.
  If you need to use it until this date, please [contact us](mailto:support@vidjil.org).

The [CloneDB](https://gitlab.inria.fr/vidjil/clonedb) has to be installed
independently of the Vidjil platform.

Then one can easily extract data to be used with CloneDB. A script is provided
(`server/scripts-web2py/create_clone_db.py`) which
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
