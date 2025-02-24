!!! note
    Here are aggregated notes forming a part of the developer documentation on the vidjil server.  
    These notes are a work-in-progress, they are not as polished as the user documentation.  
    Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md), at the [issues](https://gitlab.inria.fr/vidjil/vidjil), at the commit messages, and at the source code.

# Development notes -- Server

## Notifications

The news system is a means of propagating messages to the users of a vidjil server installation.
Messages are propagated in near-realtime for users interacting directly with the server and at a slightly slower rate for users simply using the browser but for which the server is configured.

### Message Retrieval

The browser by default periodically queries the server to retrieve any new messages and are displayed on a per user basis. This means that any message having already been viewed by the user is not displayed in the browser.
Older messages can be viewed from the index of news items.

### Caching

News items are kept in cache in order to relieve the database from a potentially large amount of queries.
The cache is stored for each user and is updated only when a change occurs (message read, message created or message edited).

### Formatting

Messages can be formatted by using the Markdown syntax. Syntax details are
available here: <https://commonmark.org/help/>

### Priority

The priority determines how the notification is shown (see [here for more details](browser:priority)). From the server we have two ways of modifying the priority.
Either by defining the `success` field to `'true'` or to `'false'`, or
by explicitly specifying the priority in the field `priority`.

For more details see 35054e4

## Getting data and analysis

How the data files (.vidjil) and analysis files are retrieved from the server?

### Retrieving the data file

This is done in the `default.py` controller under the `get_data` function.
However the .vidjil file is not provided as its exact copy on the
server. Several information coming from the DB are fed to the file
(original filename, time stamps, information on each point, …)

### Retrieving the analysis file

This is done in the `default.py` controller under the `get_analysis` function.
Actually the real work is done in the `analysis_file.py` model, in the
`get_analysis_data` function.

## Permissions

Permissions are handled by Web2py's authentication mechanism which is
specialized to Vidjil's characteristics through the `VidjilAuth` class.

### Login

1. Redirect after login

    The URL at which we access after login is defined in the controllers
    `sample_set/all` and in `default/home`.

## Database

### Database export

```bash
docker compose up -d mysql # to be sure mysql is running
docker compose exec -it mysql bash
mysqldump -u <backup-user> -p --no-create-info --complete-insert --no-tablespaces vidjil > <backup-file.sql>
```

Then move the created sql file to a mounted folder to access it outside the container, and store it in a proper location.

NB: `mysqldump` may be replaced by `mariadb-dump` some times soon.

An important element to note here is the `--no-create-info`. We add this parameter because py4web needs to be allowed to create tables itself because it keeps track of database migrations and errors will occur if tables exist which it considers it needs to create.

### Database import

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

## VidjilAuth

One VidjilAuth is launched for a given user when a controller is called.
During that call, we cache as much as possible the calls to the DB. For
doing so the `get_permission` method is defined (overriding the native
`has_permission`). It calls the native `has_permission` only when that call
hasn't already been done (this is particularly useful for DB intensive
queries, such as the compare patients).

Also some user characteristics are preloaded (groups and whether the person
is an admin), which also prevents may DB calls.

## Scheduler

The scheduler is handled by [py4web](https://py4web.com/), using [Celery](https://docs.celeryq.dev/en/stable/). Here we summarize the way it works.

Py4web has several workers. The number of workers is determined by the value of `WORKERS_POOL` given in `docker/.env.default` file, and can be overridden in a specific `.env` file. The jobs are then sent to the workers using [Redis](https://redis.io/), then the workers run the jobs independently, and store the results in database.
Workers status can be monitored using [Flower](https://flower.readthedocs.io/en/latest/).

There are now two workers queues working in parallel:

- one can only handle `short` jobs
- the other can handle any jobs

This was done in order to prevent server being stuck by a lot of very long jobs. By default, this is no specific `short` jobs queue, but this can be modified in `.env` configuration using `SHORT_JOBS_WORKERS_POOL` and `CELERY_SIZE_LIMIT_FOR_LONG_JOB`.

## Batch creation of patients/runs/sets

Data should be tabulated (row separated with a break line, cells separated with a tabulation).

Browser cannot access data from the clipboard in the following cases:

- the browser does not support it (FF)
- the user refused to grant the access

In that cases, a textarea is provided.

# Security

- task.py: Responsible for file processing => If the file becomes compromised (developer error, unexpected third-party intervention, etc.), it could result in data leakage, data loss, or even malicious processing.
- VidjilAuth: Responsible for permission management and (by inheritance) user login/logout => A compromised file (developer error or unforeseen access) may lead to data leaks or even admin access for an unexpected user.
- The database itself is protected by a password.
- `.env`: Configuration file containing the passwords (including database password) => Potential data leakage
- def.py: Configuration file containing several path => can lead to the use of modified software for processing (DIR_VIDJIL, DIR_PEAR, etc.)
- conf.js: File responsible for directing the client to the server. => A compromised conf.js file could result in a client pointing to a server with malicious intent (man-in-the-middle, password phishing, etc.).

# Tests

## Review environments (CI)

To deploy review environments, we need to customize the Docker configuration.
So that the docker containers are named depending on the branch they're built on we rename the docker directory.
Also a script rewrites the `docker-compose.yml` file in order to:

- provide the path to the SSL certificates
- set volumes that will point to the source code
- mount the volumes to existing sequence files and results
- have a dedicated volume for the database (so that each branch has its own database)
- the `network_mode` has to be set to `bridge` in order to work with the Nginx proxy

Also a sample database is loaded in the `uwsgi-entrypoint.sh` script (from the `docker/ci/ci.sql` file).

Self-signed certificates need to exist on the host and two scripts `install_certs.sh` and `uninstall_certs.sh` are used to copy the certificates in the right directory when setting the review environment.

Here is the `install_certs.sh`:

```sh
#!/bin/bash

BRANCH=$1
DIR=$(dirname $0)

echo "Install certificates for $BRANCH"

cd $DIR/$BRANCH/docker_$BRANCH/vidjil-client/
mkdir ssl
cd ssl
ln ~/nginx/certs/vidjil.crt
ln ~/nginx/certs/vidjil.info
ln ~/nginx/certs/vidjil.key
cp ~/nginx/certs/vidjil.crt ~/nginx/certs/$BRANCH.server.ci.vidjil.org.crt
cp ~/nginx/certs/vidjil.info ~/nginx/certs/$BRANCH.server.ci.vidjil.org.info
cp ~/nginx/certs/vidjil.key ~/nginx/certs/$BRANCH.server.ci.vidjil.org.key
```

And the `uninstall_certs.sh`:

```sh
#!/bin/bash
BRANCH=$1
DIR=$(dirname $0)

echo "Uninstall certificates for $BRANCH"

rm -f $DIR/$BRANCH/docker_$BRANCH/vidjil-client/ssl/web2py.{ctr,info,key}
rm -f ~/nginx/certs/$BRANCH.ci.vidjil.org.crt ~/nginx/certs/$BRANCH.ci.vidjil.org.info ~/nginx/certs/$BRANCH.ci.vidjil.org.key
```

## Functional with cypress

We use [Cypress](https://docs.cypress.io/guides/overview/why-cypress#In-a-nutshell) for functional tests.
The testing pipeline is build on a docker image which include chrome and firefox browsers in different versions.
It is now used to launch pipeline for client and for server aspect.
See [dev_client.md] for more information on cypress pipeline.

To launch these pipeline, a vidjil server should be available at localhost.
Address should be updated if you use https or http (see troubleshooting section).

1. Usage in cli

```bash
make functional_server_cypress
```

1. Interactive mode

For interactive mode, Cypress should be installed on local computer and some symbolic links should be created.
All actions for linking are made by the rule `functional_server_cypress_open` of the makefile.
To open the GUI and select tests to launch, command will be:

```bash
make functional_server_cypress_open
```

# Docker

The vidjil Docker environment is managed by Docker Compose since it is
composed of several different services this allows us to easily start and
stop individual services.
The services are as follows:

| Services                      | function                                                                                   |
| :---------------------------- | :----------------------------------------------------------------------------------------- |
| mysql                         | The database                                                                               |
| uwsgi                         | The Py4web backend server                                                                  |
| fuse                          | The XmlRPCServer that handles custom fuses (for comparing samples)                         |
| nginx                         | The front web server                                                                       |
| workers-all and workers-short | The [scheduler workers](Scheduler) to run vidjil users' samples and other pre/post-process |
| redis                         | Queue system to dispatch jobs to [workers](Scheduler)                                      |
| flower                        | Front-end to monitor the status of py4web workers                                          |
| backup                        | Starts a cron job to schedule regular backups                                              |

For more information about Docker Compose and how to install it check out [Docker Compose doc](https://docs.docker.com/compose/)

## Starting the environment

Ensure your docker-compose.yml contains the correct reference to the
vidjil image you want to use. Usually this will be vidjil/server:latest and vidjil/client:latest,
but more tags are available at [docker hub](<https://hub.docker.com/r/vidjil/vidjil/tags/>).

You may also want to uncomment the volume in the uwsgi volume block `-
./vidjil/conf:/etc/vidjil` this will provide easier access to all of the
configuration files, allowing for tweaks.

You may also set some variable values in order to get configuration that you want : volume path, pool of thread for server, pool of workers, passwords, ...
This variables are defined inside `docker/.env.default`. They can be overridden using a specific `.env` file (for example `.env.my`), and setting `docker-compose.yml` or `docker-compose.override.yml` to point to this file (see for example what is done with `docker-compose-dev.yml` and `.env.dev` files)

You can also change some docker behavior as volume declaration or ports by modifying `docker-compose.override.yml` file.
Each declaration in this file will be taken into account as an overload of default values set in `docker-compose.yml` file.

Running the following command will automatically download any missing
images and start the environment:

``` bash
docker-compose up -d
```

This will also start the environment for you.

## Deploy a local version for development purpose

You may want to make some modification into the code of Vidjil web application, server, browser or tools side.
In these cases, you should get a copy of the vidjil repository where you will be able to make your changes, and also set some modifications into the `docker-compose.yml`.

A specific docker-compose file is provided under `docker-compose-dev.yml` file.
It overloads some volume declaration to use script and content of the local repository from the launch directory.

``` bash
docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d
```

If you don't want to have to give path for docker-compose files, you can link or rename `docker-compose-dev.yml` as `docker-compose.override.yml`.
In will then be automatically apply at launch.

## Building images for DockerHub

Make sure your Dockerfile is up to date with any changes you may want to
make in the containers. The Dockerfile accepts some build arguments:

- build-env: TEST or PRODUCTION. If unspecified, PRODUCTION is assumed.
  The main difference is that TEST will build the image with an HTTP
  configuration whereas PRODUCTION uses HTTPS.

``` bash
docker build --build-arg build_env=PRODUCTION -t vidjil/client:<version> -f docker/vidjil-client/Dockerfile ../
docker build --build-arg build_env=PRODUCTION -t vidjil/server:<version> -f docker/vidjil-server/Dockerfile ../
```

Tag the image you have just built:

``` bash
docker tag vidjil:test vidjil/client:latest
docker tag vidjil:test vidjil/server:latest
```

Push the image to DockerHub:

``` bash
docker push vidjil/client:<tag>
docker push vidjil/server:<tag>
```

You may be required to log in, in which case you can consult the [following doc](https://docs.docker.com/engine/reference/commandline/login/).

If you encounter an issue where docker is unable to access
archive.ubuntu.org then you may need to add your dns to /etc/docker/daemon.json

``` json
{
    "dns":["dns1", "dns2"]
}
```

## Migrating Data

### Migrating Database

The easiest way to perform a database migration is to first extract the
data as described in [database export part](#database-export).

Data can the be reimported in the fresh database using the [database import part](#database-import).

### Migrating Files

Files can simply be copied over to the new installation, their filenames
are stored in the database and should therefore be accessible as long as
they are in the correct directories.

If one only want to migrate data for a user, see [below](#exporting-sample-sets)

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

``` bash
sh copy_files <file source> <file destination> <input file>
```

## Update vidjil server

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

| Metrics                           | List | Descriptions                                                                                        |
| :-------------------------------- | :--- | :-------------------------------------------------------------------------------------------------- |
| group_count                       | fast | Get number of groups                                                                                |
| set_patients_count                | fast | Get number of patients for all users                                                                |
| set_runs_count                    | fast | Get number of runs for all users                                                                    |
| set_generics_count                | fast | Get number of generic sets for all users                                                            |
| set_patients_by_user              | fast | Get number of patients split by user id                                                             |
| set_runs_by_user                  | fast | Get number of runs split by user id                                                                 |
| set_generics_by_user              | fast | Get number of generic split by user id                                                              |
| sequence_count                    | fast | Get number of sequences files                                                                       |
| results_count                     | fast | Get number of results present on server                                                             |
| sequence_by_user                  | fast | Get number of sequences files by user                                                               |
| sequence_size_by_user             | fast | Get sump of sequence files by users                                                                 |
| config_analysis                   | fast | Get list of analysis split by configurations                                                        |
| config_analysis_by_users_patients | fast | Get list of analysis, split by configurations, only for patients                                    |
| config_analysis_by_users_runs     | fast | Get list of analysis, split by configurations, only for runs                                        |
| config_analysis_by_users_generic  | fast | Get list of analysis, split by configurations, only for generics sets                               |
| login_count                       | fast | Get number of login count, group by user id                                                         |
| status_analysis                   | fast | Get number of analysis grouped by status (allows to see pending, finish, running or failed analysis) |
| set_patients_by_group             | long | Get number of patients split by groups                                                              |
| set_runs_by_group                 | long | Get number of runs split by groups                                                                  |
| set_generics_by_group             | long | Get number of generic split by groups                                                               |
| config_analysis_by_groups         | long | Get number of analysis split by configs and by groups                                               |
