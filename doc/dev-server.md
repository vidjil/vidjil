!!! note
    Here are aggregated notes forming a part of the developer documentation on the vidjil server.  
    These notes are a work-in-progress, they are not as polished as the user documentation.  
    Developers should also have a look at the documentation for [bioinformaticians](vidjil-algo.md) and [server administrators](admin.md), at the [issues](http://gitlab.vidjil.org), at the commit messages, and at the source code.

## Development notes -- Server

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
available here: <http://commonmark.org/help/>

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
specialised to Vidjil's characteristics through the `VidjilAuth` class.

### Login

1. Redirect after login

    The URL at which we access after login is defined in the controllers
    `sample_set/all` and in `default/home`.

## Database

### Export

``` bash
mysqldump -u <user> -p <database> -c –no-create-info > <file>
```

### Import

In order to import the data from another server, you need to ensure
there will be no key collision, or the import will fail.
If the database contains data, the easiest is to drop the database and
create a new empty database.
This will require you to delete the .table file in `web2py/applications/vidjil/databases`  
In order to create the tables you should then load a page from the
webapp, but DO NOT init the database, because this will raise the problem
of colliding primary keys again.

Then run:

```bash
mysql -u <user> -p <database> < file
```

### VidjilAuth

One VidjilAuth is launched for a given user when a controller is called.
During that call, we cache as much as possible the calls to the DB. For
doing so the `get_permission` method is defined (overriding the native
`has_permission`). It calls the native `has_permission` only when that call
hasn't already been done (this is particularly useful for DB intensive
queries, such as the compare patients).

Also some user characteristics are preloaded (groups and whether the person
is an admin), which also prevents may DB calls.

## Scheduler

The scheduler is handled by Py4web. Here we summarise the way it works.

Py4web has several workers. Its number is determined by the value of `WORKERS_POOL` given 
in `docker/.env-default`/`docker/.env` file. 
Redis and flowers service are associated to workers to work.

At regular interval the worker signals that it is still alive (it is called
the heartbeat and can be customised in Vidjil through the
`SCHEDULER_HEARTBEAT` parameter in `defs.py`).

<!-- When a job timeouts it is not killed (see #2213). In `gluon/scheduler.py` a -->
<!-- worker seems to be able to kill a process when the worker's state (and not the -->
<!-- task's state) is `STOP_TASK`. -->

## Batch creation of patients/runs/sets

Data should be tabulated (row separated with a break line, cells separated with a tabulation).

Browser cannot access data from the clipboard in the following cases:

- the browser does not support it (FF)
- the user refused to grant the access

In that cases, a textarea is provided.

# Tests

# Security

- task.py: Responsible for file processing => If the file becomes compromised (developer error, unexpected third-party intervention, etc.), it could result in data leakage, data loss, or even malicious processing.
- VidjilAuth: Responsible for permission management and (by inheritance) user login/logout => A compromised file (developer error or unforeseen access) may lead to data leaks or even admin access for an unexpected user.
- The database itself is protected by a password.
- .env: Configuration file containing the database password => Potential data leakage
  - Docker secrets could be used to limit access and visibility of these values ?
- def.py: Configuration file containing several path => can lead to the use of modified software for processing (DIR_VIDJIL, DIR_PEAR, etc.)
- conf.js: File responsible for directing the client to the server. => A compromised conf.js file could result in a client pointing to a server with malicious intent (man-in-the-middle, password phishing, etc.).

# Packaging

## Script driven building

In order to make packaging Vidjil simple and facilitate releases scripts
have been made and all meta data files required for the Debian packages
can be found in the packaging directory in each package's subdirectory.

In the packaging directory can be found the scripts for building each of
the vidjil packages: germline, algo (named vidjil) and server.
Note: `build-generic.sh` is a helper script that is used by the other
build-\* scripts to build a package.

Executing one of the scripts will copy the necessary files to the
corresponding packaging subdirectory (germline, vidjil and server)
And build the package in the `/tmp` folder along with all the files needed
to add the package to a repository

It is worth noting that while all packages can be built directly from the
project sources, the algorithm is actually built from the releases found
at <http://www.vidjil.org/releases>.

## Packaging Vidjil into a Debian Binary Package

In this section we will explain how to package a pre-compiled version of
Vidjil that will allow easy installation although it will not meet all the
requirements for a full Debian package and therefore cannot be added to the
default Debian repositories.

In this document we will not go over the fine details of debian packaging
and the use of each file. For more information you can refer to this page
from which this document was inspired:
<http://www.tldp.org/HOWTO/html_single/Debian-Binary-Package-Building-HOWTO/>

Being a binary package it will simply contain the vidjil binary which will
be copied to the chosen location on installation.

### Let's Get Started

You will first and foremost need to compile vidjil. Refer to \#TODO for
more information.

Create a base directory for the package and the folders to which the binary
will be installed. Let's call our folder debian and copy the binary to *usr/bin*

``` bash
mkdir -p debian/usr/bin
```

And copy the vidjil binary

``` bash
cp vidjil debian/usr/bin
```

Now create the necessary control file. It should look something like this:

``` example
Package: vidjil
Version: <version> (ie. 2016.03-1)
Section: misc
Priority: optional
Architecture: all
Depends: bash (>= 2.05a-11)
Maintainer: Vidjil Team <team@vidjil.org>
Description: Count lymphocyte clones
vidjil parses a fasta or fastq file and produces an output with a list
of clones and meta-data concerning these clones
```

And place it in the correct folder.

``` bash
mkdir -p debian/DEBIAN
cp control debian/DEBIAN/
```

Now build the package and rename it.

``` bash
dpkg-deb --build debian
mv debian.deb vidjil_<version>_all.deb
```

It can be installed but running

``` bash
sudo dpkg -i vidjil_<version>_all.deb
```

## Packaging Vidjil into a Debian Source Package

!!! note
    This document is currently incomplete. This process will not produce a
    working debian package. The package build will fail when attempting to
    emulate \`make install\`

### Requirements

- The release version of Vidjil you wish to package
- Knowledge of Debian packaging

In this documentation we will not go over all the specifics of creating a
debian package. You can find the required information here:
<https://wiki.debian.org/HowToPackageForDebian>
and <https://wiki.debian.org/Packaging/Intro?action=show&redirect=IntroDebianPackaging>

### Creating the orig archive

In order to build a debian package, it is required to have a folder named
debian with several files required for the package which contain meta
data and permit users to have information on packages and updates for
packages.

In order to generate this folder run the following from the source base
directory.

``` bash
dh_make -n
```

You can remove all files from the debian folder that match the patterns \*.ex, **.EX and README**

Update debian/changelog, debian/control and debian/copyright to contain the correct
information to reflect the most recent changes and metadata of Vidjil.

Vidjil has no install rule so we need to use a debian packaging feature.
Create a file named debian/install with the following line:

``` example
vidjil usr/bin/
```

Vidjil currently depends on some unpackaged files that need to be
downloaded before compiling.

``` bash
mkdir browser
make germline
make data
```

Debian packaging also requires archives of the original source. This is
to manage people packaging software they haven't developed with changes
they have made. To make things simpler, we simply package the current
source as the reference archive and build the package with the script
that can be obtained here: <https://people.debian.org/~wijnen/mkdeb> (Thanks
to Bas Wijnen \<wijnen@debian.org\> for this script)

From the source directory, run that script to create the package.

You're done\! You can now install the debian package with:

``` bash
sudo dpkg -i path/to/package
```

# Docker

The vidjil Docker environment is managed by Docker Compose since it is
composed of several different services this allows us to easily start and
stop individual services.
The services are as follows:

|Services | function       |
|:--------| :--------------|
|mysql    | The database   |
|uwsgi    | The Py4web backend server |
|fuse     | The XmlRPCServer that handles custom fuses (for comparing samples)|
|nginx    | The web server |
|workers  | The Py4web Scheduler workers in charge of executing vidjil users' samples and other pre/post-process |
|flower   |   |
|redis    |   |
|backup   | Starts a cron job to schedule regular backups |
|reporter | A monitoring utility that can be configured to send monitoring information to a remote server |

For more information about Docker Compose and how to install it check out
<https://docs.docker.com/compose/>

## Starting the environment

Ensure your docker-compose.yml contains the correct reference to the
vidjil image you want to use. Usually this will be vidjil/vidjil:latest,
but more tags are available at <https://hub.docker.com/r/vidjil/vidjil/tags/>.

You may also want to uncomment the volume in the fuse volume block `-
./vidjil/conf:/etc/vidjil` this will provide easier access to all of the
configuration files, allowing for tweaks.

You may also set some variable values in order to get configuration that you want : volume path, pool of thread for server, pool of workers, passwords, ...
This variables are defined inside `docker/.env-default` and can be set in `docker/.env`.

You can also change some docker behavior as volume declaration or ports by modifying `docker-compose.override.yml` file.
Each declaration in this file will be taken into account as an overload of default values set in `docker-compose.yml` file.

Running the following command will automatically download any missing
images and start the environment:

``` bash
docker-compose up
```

If you are using the reporter images, then you need to first
build these from the image you are using by running the following:

``` bash
docker-compose up --build
```

This will also start the environment for you.

## Deploy a local version for developpment purpose

You may want to make some modification into the code of Vidjil web application, server, browser or tools side.
In these cases, you should get a copy of the vidjil repository where you will be able to make your changes, and also set some modifiaction into the `docker-compose.yml`.

A specific docker-compose file is provided under `docker-compose-dev.yml` file. 
It overload some volume declaration to use script and content of the local repository from the launch directory.

``` bash
docker-compose -f docker-compose.yml -f docker-compose-dev.yml up -d
```

If you don't want to have to give path for docker-compose files, you can rename `docker-compose-dev.yml` as `docker-compose.override.yml`.
In will then be automatically apply at launch.

## Building images for DockerHub

Make sure your Dockerfile is up to date with any changes you may want to
make to the containers. The Dockerfile accepts some build arguments:

- build-env: TEST or PRODUCTION. If unspecified, PRODUCTION is assumed.
  The main difference is that TEST will build the image with an HTTP
  configuration whereas PRODUCTION uses HTTPS.
- git<sub>repo</sub> : The repository to build the image from. By default, our main
  repository is assumed.
- git<sub>branch</sub> : The git branch to clone from the repository. By default:
  dev.

``` bash
docker build --build-arg build_env=PRODUCTION --build-arg git_branch=<my_feature_branch> docker/vidjil-client -t vidjil/client:<version>
docker build --build-arg build_env=PRODUCTION --build-arg git_branch=<my_feature_branch> docker/vidjil-server -t vidjil/server:<version>
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

You may be required to log in, in which case you can consult
<https://docs.docker.com/engine/reference/commandline/login/> for more
information.

If you encounter an issue where docker is unable to access
archive.ubuntu.org then you may need to add your dns to /etc/docker/daemon.json

``` json
      {
          "dns":["dns1", "dns2"]
      }

* Migrating Data
** Database
   The easiest way to perform a database migration is to first extract the
   data with the following command:

   $ mysqldump -u <user> -p <db> -c --no-create-info > <file>

   An important element to note here is the --no-create-info we add this
   parameter because py4web needs to be allowed to create tables itself
   because it keeps track of database migrations and errors will occur if
   tables exist which it considers it needs to create.

   In order to import the data into an installation you first need to ensure
   the tables have been created by Py4web this can be achieved by simply
   accessing a non-static page.

   /!\ If the database has been initialized from the interface you will
   likely encounter primary key collisions or duplicated data, so it is best
   to skip the initialization altogether.

   Once the tables have been created, the data can be imported as follows:

   $ mysql -u <user> -p <db> < <file>

   Please note that with this method you should have at least one admin user
   that is accessible in the imported data. Since the initialization is being
   skipped, you will not have the usual admin account present.
   It is also possible to create a user directly from the database although
   this is not the recommended course of action.

** Files
   Files can simply be copied over to the new installation, their filenames
   are stored in the database and should therefore be accessible as long as
   they are in the correct directories.

** Filtering data
   When extracting data for a given user, the whole database should not be
   copied over.
   There are two courses of action:
     - create a copy of the existing database and remove the users that are
       irrelevant. The cascading delete should remove any unwanted data
       barring a few exceptions (notably fused_file, groups and sample_set_membership)

     - export the relevant data directly from the database. This method
       requires multiple queries which will not be detailed here.

  Once the database has been correctly extracted, a list of files can be
  obtained from sequence_file, fused_file, results_file and analysis_file
  with the following query:

  #+BEGIN_SRC sql
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

## Review environments (CI)

To deploy review environments, we need to customise the Docker configuration.
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
ln ~/nginx/certs/web2py.crt
ln ~/nginx/certs/web2py.info
ln ~/nginx/certs/web2py.key
cp ~/nginx/certs/web2py.crt ~/nginx/certs/$BRANCH.server.ci.vidjil.org.crt
cp ~/nginx/certs/web2py.info ~/nginx/certs/$BRANCH.server.ci.vidjil.org.info
cp ~/nginx/certs/web2py.key ~/nginx/certs/$BRANCH.server.ci.vidjil.org.key
```

And the `uninstall_certs.sh`:

```sh
#!/bin/bash
BRANCH=$1
DIR=$(dirname $0)

echo "Uninstall certificates for $BRANCH"

rm -f $DIR/$BRANCH/docker_$BRANCH/vidjil-client/ssl/web2py.{ctr,info,key}
rm -f  ~/nginx/certs/$BRANCH.ci.vidjil.org.crt ~/nginx/certs/$BRANCH.ci.vidjil.org.info ~/nginx/certs/$BRANCH.ci.vidjil.org.key
```

### Functional with cypress (release candidate)

To avoid `Watir` limitation on latest versions of browsers, we adopt [Cypress](https://docs.cypress.io/guides/overview/why-cypress#In-a-nutshell).
The testing pipeline is build on a docker image which include chrome and firefox browser in different versions.
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

1. Troubleshooting

    1. visit error

    By default, test on CI are launch on a http address.
    Cypress take into account this and try to visit localhost as a http.
    If an error occur, you should modify the url in `browser/test/cypress/support/login.js` to change `http` to `https`.

## Update server images

Once again, if not already done, **make backup** before going further.

Generic case is the following. Please read section further to know for each upgrade how to make it since some specific change in docker-compose, file organisation or variable in configuration files can be made.

Once docker-compose and configuration changes are made, you can simply launch update as usually:

```shell
# Stop current running server and other service
docker-compose down

# Pull new version of images. 
docker-compose pull

# Start again 
docker-compose up -d
```

### Specific update notes

#### Migrating from Web2py to Py4web (release-2024.01)

!!! danger
    At release 2024.01, we migrate our backend server from Web2py to Py4web.  
    This section described the way to update your anterior server.  
    We **HIGHLY** recommand to use a second server with duplicate content to set correctly docker-compose files.

Since release 2024.01, we migrated to a new framwork: Py4web.  
We also made a major refactoring of docker-compose organisation.  
We tried to make it the most transparent but some major changes in volumes and docker declaration were still needed.

**MAKE BACKUP BEFORE MIGRATING YOUR SERVER**


##### docker compose organisation. 
  
Pull a version of vidjil repository of release 2024.01.

Service have changed, but you could use more or less default configuration.
You will need to update path for volume declaration.  
Note that now volumes declaration moved from `fuse` to `uwsgi` docker service.
New services were added (redis, flowers).

We also changed environment variable declaration.  
Now variable at set to restricted places:

* vidjil-client/conf/conf.js: As previous, conf for browser are done in this file
* vidjil-server/conf/defs.py: As previous, conf for server are done in this file. Note some change in `DIR_xxx` default declaration
* `.env-default` and `.env` files: Docker environment variable are loaded from these 2 files. The first one have default values and explanation about effect, the second is meant to store your overload values of these variable. For the moment, at least one variable should be set in `.env` file to work.
* backup/conf/backup.cnf: user and password to use for backup. Will likely be moved to `.env` files at next release.

In docker-compose volume, you should not have to change volume path except the ones refering to web2py.
A typical needed change is the path for database destination in volume

```yaml title="docker/docker-compose.yml"
  uwsgi:
    volumes:
      - $VOLUME_PATH/databases:`/usr/share/vidjil/server/web2py/applications/vidjil/databases` 
      # change to 
      - $VOLUME_PATH/databases:`/usr/share/vidjil/server/py4web/apps/vidjil/databases`.
```

Please, use for migration an image target of release 2024.01 and do not jump directly to an higher release image.
To do so, change `vidjil-server:latest` to `vidjil-server:release-2024.01`. Do the same for client.


##### Troubleshooting

Sometimes, migration of database don't work immediatly between web2py and py4web. We didn't isolate origin of this inconvenience.

In this case, the simpler way to pass through is to use a new MySQL database and to re-import backup inside.

In this case, follow these step:

1. shutdown server.
1. Move your current mysql volume to another place or change path of mysql volume in your docker-compose.
1. Add volume path to include your sql backup in mysql service
1. Start again mysql and uwsgi services `docker-compose up -d mysql uwsgi`. Default init of mysql should be done when uwsgi finish his starting step.
1. Connect inside you mysql container to import your backup file (see server.md) and launch import: `mysql -u vidjil -p vidjil < backup_file`.
1. Don't forget to recreate your mysql backup user (see server.md)

If everything works well, you should now be able to connect to your server with your usual credential and to see your data.


#### Migrating Py4web release-2024.01 to release-2024.05.1

This release don't have breaking change.

Notable change is that now preproces, pre-fuse and post-fuse need to be declared in three differents directories and use the same organisation that [vidjil-contribs](https://gitlab.inria.fr/vidjil/contrib) repository.

To unify this, a new value should be add to docker-compose in uwsgi volume:

```yaml title="docker/docker-compose.yml"
    uwsgi:
        volumes:
            # Tools and external scripts
            - ./vidjil-server/conf/defs-tools.py:/usr/share/vidjil/tools/defs.py
            - ./scripts/:/usr/share/vidjil/tools/scripts
```
`./scripts/` directory can be a path to a local clone of vidjil-contrib.

These modifications are already present in last version of docker-compose file. If you compose your own version, think about to add it and adapt it yourself.

A new variable is also present in definitions of vidjil server.
Please add it in directory for tasks section.

```py title="docker/vidjil-server/conf/defs.py"
DIR_PREPROCESS = '/usr/share/vidjil/tools/scripts/preprocess/'
``` 