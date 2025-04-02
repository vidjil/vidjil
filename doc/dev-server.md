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

See [Docker installation doc](server.md#installation-with-docker)

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
