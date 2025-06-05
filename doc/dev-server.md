!!! note
    Here are aggregated notes forming part of the developer documentation on the Vidjil server.  
    These notes are a work-in-progress; they are not as polished as the user documentation.  
    Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md), the [issues](https://gitlab.inria.fr/vidjil/vidjil), the commit messages, and the source code.

# Development notes -- Server

## Notifications

The news system is a means of propagating messages to the users of a Vidjil server installation.
Messages are propagated in near-real time for users interacting directly with the server and at a slightly slower rate for users simply using the browser when the server is configured for this.

### Message Retrieval

The browser by default periodically queries the server to retrieve any new messages, which are displayed on a per user basis. This means that any message already viewed by the user is not displayed in the browser again.
Older messages can be viewed from the index of news items.

### Caching

News items are kept in cache in order to relieve the database of a potentially large amount of queries.
The cache is stored for each user and is updated only when a change occurs (message read, message created or message edited).

### Formatting

Messages can be formatted using [Markdown syntax](https://commonmark.org/help/).

### Priority

The priority determines how the notification is shown (see [here for more details](browser:priority)). From the server, we have two ways of modifying the priority.
Either by setting the `success` field to `'true'` or to `'false'`, or
by explicitly specifying the priority in the `priority` priority.

For more details, see [35054e4](https://gitlab.inria.fr/vidjil/vidjil/-/commits/35054e45114d9cfef9163e75f68b4b0f4c8a321b).

## Getting data and analysis

### Retrieving the data file

This is done in the `default.py` controller under the `get_data` function.
However, the .vidjil file is not provided as its exact copy on the
server. Several pieces of information coming from the DB are fed to the file
(original filename, time stamps, information on each point, …)

### Retrieving the analysis file

This is done in the `default.py` controller under the `get_analysis` function.
In fact, the real work is done in the `analysis_file.py` model, in the
`get_analysis_data` function.

## Permissions

Permissions are handled by py4web's authentication mechanism, which is
specialized to Vidjil's characteristics through the `VidjilAuth` class.

### Login

1. Redirect after login

    The URL that we access after login is defined in the controllers `sample_set/all` and in `default/home`.

## VidjilAuth

`VidjilAuth` is child class of `py4web.Auth` and is used to handle user authentication and permissions.

## Scheduler

The scheduler is handled by [py4web](https://py4web.com/), using [Celery](https://docs.celeryq.dev/en/stable/). Here, we summarize the way it works.

Py4web has several workers. The number of workers is determined by the value of `WORKERS_POOL` given in the `docker/.env.default` file, and can be overridden in a specific `.env` file. The jobs are sent to the workers using [Redis](https://redis.io/). The workers then run the jobs independently and store the results in the database.
Workers' status can be monitored using [Flower](https://flower.readthedocs.io/en/latest/).

There are now two workers queues working in parallel:

- one can only handle `short` jobs
- the other can handle any jobs

This was done in order to prevent the server from being stuck by a lot of very long jobs. By default, there is no specific `short` jobs queue, but this can be modified in `.env` configuration using `SHORT_JOBS_WORKERS_POOL` and `CELERY_SIZE_LIMIT_FOR_LONG_JOB`.

## Batch creation of patients/runs/sets

Data should be tabulated (rows separated with a break line, cells separated with a tab).

The browser cannot access data from the clipboard in the following cases:

- the browser does not support it (FF)
- the user refused to grant the access

In those cases, a textarea is provided.

# Security

- task.py: Responsible for file processing => If the file becomes compromised (developer error, unexpected third-party intervention, etc.), it could result in data leakage, data loss, or even malicious processing.
- VidjilAuth: Responsible for permission management and (by inheritance) user login/logout => A compromised file (developer error or unforeseen access) may lead to data leaks or even admin access for an unexpected user.
- The database itself is protected by a password.
- `.env` files: Configuration files containing the passwords (including database password) => Potential data leakage
- conf.js: File responsible for directing the client to the server => A compromised conf.js file could result in a client pointing to a server with malicious intent (man-in-the-middle, password phishing, etc.).

# Tests

## Review environments (CI)

To deploy review environments, we need to customize the Docker configuration. In order to name the docker containers depending on the git branch they're built on, the `docker` directory is renamed with the git branch name..
A script also rewrites the `docker-compose.yml` file in order to:

- provide the path to the SSL certificates
- set volumes that will point to the source code
- mount the volumes to existing sequence files and results
- have a dedicated volume for the database (so that each branch has its own database)
- the `network_mode` has to be set to `bridge` in order to work with the Nginx proxy

A sample database is also loaded in the `uwsgi-entrypoint.sh` script (from the `docker/ci/ci.sql` file).

Self-signed certificates need to exist on the host, and two scripts (`install_certs.sh` and `uninstall_certs.sh`) are used to copy the certificates in the right directory when setting the review environment.

Here is `install_certs.sh`:

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

And `uninstall_certs.sh`:

```sh
#!/bin/bash
BRANCH=$1
DIR=$(dirname $0)

echo "Uninstall certificates for $BRANCH"

rm -f $DIR/$BRANCH/docker_$BRANCH/vidjil-client/ssl/web2py.{ctr,info,key}
rm -f ~/nginx/certs/$BRANCH.ci.vidjil.org.crt ~/nginx/certs/$BRANCH.ci.vidjil.org.info ~/nginx/certs/$BRANCH.ci.vidjil.org.key
```

## Functional with cypress

We use [Cypress](https://docs.cypress.io/guides/overview/why-cypress#In-a-nutshell) for functional testing.
The testing pipeline is built on a docker image which includes Chrome and Firefox browsers in different versions.
It is now used to launch pipelines for both the client and server aspects.
See [client documentation](dev-client.md) for  more information on the Cypress pipelines.

To launch these pipelines for the server part, a Vidjil server should be available at localhost.
Address should be updated whether you use HTTP or HTTPS.

1. Usage in CLI

```bash
make functional_server_cypress
```

1. Interactive mode

For interactive mode, Cypress should be installed on the local computer and some symbolic links should be created.
All actions for linking are performed by the rule `functional_server_cypress_open` of the Makefile.
To open the GUI and select tests to launch, the command will be:

```bash
make functional_server_cypress_open
```

# Docker

See [Docker installation documentation](server.md#installation-with-docker)

## Deploy a local version for development purpose

You may want to make some modifications to the code of Vidjil web application, server, browser or tools side.
In these cases, you should get a copy of the Vidjil repository where you will be able to make your changes, and also make some modifications to the `docker-compose.yml`.

A specific docker-compose file is provided as `docker-compose-dev.yml`.
It overrides some volume declaration to use scripts and content of the local repository in docker.

``` bash
docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d
```

If you don't want to have to specify the path docker-compose files, you can link or rename `docker-compose-dev.yml` as `docker-compose.override.yml`. It will then be automatically applied at launch.

## Building images for DockerHub

Make sure your Dockerfile is up to date with any changes you may want to
make in the containers. The Dockerfile accepts the following build arguments:

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

You may be required to log in, in which case you can consult the [following documentation](https://docs.docker.com/engine/reference/commandline/login/).

If you encounter an issue where docker is unable to access
archive.ubuntu.org, you may need to add your DNS to /etc/docker/daemon.json

``` json
{
    "dns":["dns1", "dns2"]
}
```
