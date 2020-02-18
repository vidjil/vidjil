
Here are aggregated notes forming a part of the developer documentation on the Vidjil server,
on client-server interaction as well as on packaging.
These notes are a work-in-progress, they are not as polished as the user documentation.
Developers should also have a look at the [documentation for bioinformaticians and server administrators](/),
at the [issues](http://gitlab.vidjil.org), at the commit messages, and at the source code.

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
available here: <http://commonmark.org/help/>

### Priority

The priority determines how the notification is shown (see [here for more details](browser:priority)). From the server we have two ways of modifiying the priority.
Either by defining the `success` field to `'true'` or to `'false'`, or
by explicitly specifying the priority in the field `priority`.

For more details see 35054e4

## Getting data and analysis

How the data files (.vidjil) and analysis files are retrieved from the server?

### Retrieving the data file

This is done in the `default.py` controller under the `get_data` function.
However the .vidjil file is not provided as its exact copy on the
server. Several informations coming from the DB are fed to the file
(original filename, time stamps, information on each point, …)

### Retrieving the analysis file

This is done in the `default.py` controller under the `get_analysis` function.
Actually the real work is done in the `analysis_file.py` model, in the
`get_analysis_data` function.

## Permissions

Permissions are handled by Web2py's authentication mechanism which is
specialised to Vidjil's characteristics through the `VidjilAuth` class.

### Login

1.  Redirect after login
    
    The URL at which we access after login is defined in the controllers
    `sample_set/all` and in `default/home`.

## Database

### Export

mysqldump -u \<user\> -p \<database\> -c –no-create-info \> \<file\>

### Import

In order to import the data from another server, you need to ensure
there will be no key collision, or the import will fail.
If the database contains data, the easiest is to drop the database and
create a new empty database.
This will require you to delete the .table file in web2py/applications/vidjil/databases
In order to create the tables you should then load a page from the
webapp, but DO NOT init the database, because this will raise the problem
of colliding primary keys again.

Then run:
mysql -u \<user\> -p \<database\> \< file

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
The scheduler is handled by Web2py. Here we summarise the way it works.

Web2py has several workers. Its number is determined by the number of items
given after the `-K` parameter to `web2py.py`. One of them is called the
*ticker*. It is the master worker that will assign tasks to all the workers
(including itself).

At regular interval the worker signals that it is still alive (it is called
the heartbeat and can be customised in Vidjil through the
`SCHEDULER_HEARTBEAT` parameter in `defs.py`).

Every 5 heartbeats (it is hardcoded in web2py in `gluon/scheduler.py`) the
*ticker* will assign jobs. Each worker will also try to remove the dead
workers. In our case it often produces an “*Error cleaning up*” error in the
logs (see #3558).

When a job timeouts it is not killed (see #2213). In `gluon/scheduler.py` a
worker seems to be able to kill a process when the worker's state (and not the
task's state) is `STOP_TASK`.
# Tests

# Packaging

## Script driven building

In order to make packaging Vidjil simple and facilitate releases scripts
have been made and all meta data files required for the Debian packages
can be found in the packaging directory in each package's subdirectory.

In the packaging directory can be found the scripts for building each of
the vidjil packages: germline, algo (named vidjil) and server.
Note: build-generic.sh is a helper script that is used by the other
build-\* scripts to build a package.

Executing one of the scripts will copy the necessary files to the
corresponding packaging subdirectory (germline, vidjil and server)
And build the package in the /tmp folder along with all the files needed
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

Note: This document is currently incomplete. This process will not produce a
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

  - mysql The database
  - uwsgi The Web2py backend server
  - fuse The XmlRPCServer that handles custom fuses (for comparing
    samples)
  - nginx The web server
  - workers The Web2py Scheduler workers in charge of executing vidjil
    users' samples
  - backup Starts a cron job to schedule regular backups
  - reporter A monitoring utility that can be configured to send
    monitoring information to a remote server

For more information about Docker Compose and how to install it check out
<https://docs.docker.com/compose/>

## Starting the environment

Ensure your docker-compose.yml contains the correct reference to the
vidjil image you want to use. Usually this will be vidjil/vidjil:latest,
but more tags are available at <https://hub.docker.com/r/vidjil/vidjil/tags/>.

You may also want to uncomment the volume in the fuse volume block "-
./vidjil/conf:/etc/vidjil" this will provide easier access to all of the
configuration files, allowing for tweaks.

Running the following command will automatically download any missing
images and start the environment:

``` bash
docker-compose up
```

If you are using the backup and reporter images, then you need to first
build these from the image you are using by running the following:

``` bash
docker-compose up --build
```

This will also start the environment for you.

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

<!-- end list -->

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
   parameter because web2py needs to be allowed to create tables itself
   because it keeps track of database migrations and errors will occur if
   tables exist which it considers it needs to create.

   In order to import the data into an installation you first need to ensure
   the tables have been created by Web2py this can be achieved by simply
   accessing a non-static page.

   /!\ If the database has been initialised from the interface you will
   likely encounter primary key collisions or duplicated data, so it is best
   to skip the initialisation altogether.

   Once the tables have been created, the data can be imported as follows:

   $ mysql -u <user> -p <db> < <file>

   Please note that with this method you should have at least one admin user
   that is accessible in the imported data. Since the initialisation is being
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
