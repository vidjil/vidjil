!!! note
    This CHANGELOG concerns the Docker images of vidjil.  
    The generic way to update a vidjil server is described in [update vidjil server part](dev-server.md#update-vidjil-server). All steps between previously installed version and target version should be followed to adapt configuration correctly.
    In this file, the specific migration parts are described.

## 2024.12 release

### vidjil/server 2024.12

We made plenty change on docker usage, allowing to be more efficient, more robust and easier to set-up.

- We always fix rights inside docker to user www-data. See [migration 2024.12](dev-server.md#migrating-release-202405-to-release-202412). #5305
- We package `restic` backup tool in our docker-compose configuration #5347
- We refactored docker image construction to be more efficient, with correct user, rights and minimized dependencies #5351
- We refactor usage of `.env` files. It will be now easier to set up variables of your vidjil server instance in one place #5272, #5256, #5231
- Images server and client are build on ubuntu 24.04

!!! warning
    With the new version of mysql, it is required to migrate the database, ses below

- Version of mysql was bumped to 8.4 (newest LTS version). In order to migrate to the new version, the easiest way to do this is to backup your sql data, start a fresh instance, and import the previously exported data (see [database export](dev-server.md#database-export) and [database export](dev-server.md#database-import))

- Owner of volumes will be automatically set to `www-data` for right reasons. On an already existing instance, a `chown change` will be called on various directories (see file docker/vidjil-server/scripts/uwsgi-entrypoint.sh). A parameter `CHANGE_OWNER` is given in `.env.default` conf file, that can be set to `false` in this file or in a specific configuration file to prevent this behavior.

### vidjil/client 2024.12

No changes in client image usage.

### Migrating release-2024.05 to release-2024.12

The mysql version was bumped in this release. The easiest way to migrate the database is to follow [update vidjil server instructions](dev-server.md#update-vidjil-server) and apply the optional [re-import](dev-server.md#database-import) part.

Docker images, docker-compose files and env files have been modified in this release:

- Regarding env files, we had a confusion between the way env files are used in docker-compose, either to [load environnement variables in the container](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/#use-the-env_file-attribute), or directly in the [docker-compose.yml file interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/). We tried to be cleaner around this:
  - we now have default values for interpolation in `docker-compose.yml`. It can still be override using `.env` file, using `.env.docker-compose-interpolation` as a base file.
  - Variables to be used in containers are now listed in `.env.default` file. Most of your custom values are now located here. You can either modify `.env.default`, or in a cleaner way create a `.env.override` (or whatever name) file. In this last case, one can only override the needed variables, and load the file in `docker-compose.yml` directly, or in a `docker-compose.override.yml` file.
- New variables were introduced in `.env.default` file:
  - Some variables linked to the new metrics feature (see #5156)
  - `CHANGE_OWNER`, true by default, to change the rights of the data files. This can takes some time at first start after migration, but this allows files rights management to be cleaner.
  - `SHORT_JOBS_WORKERS_POOL` and `CELERY_SIZE_LIMIT_FOR_LONG_JOB`: as described in `.env.default` file, allow admin to configure some dedicated workers to allow short jobs to run even if many long jobs are already running. In most deployments, this won't be needed.
- `docker-compose.yml` was cleaned. To migrate, compare it with the version you had built before or use it as a base for a `docker-compose.override.yml` file.

## 2024.05 release

### vidjil/server 2024.05

- The containers are now named `vidjil-*service-name*`
- Use requirements.txt to build image
- script directory for preprocess is reorganized and new variables is needed in `vidjil-server/confs/defs*` files.

### vidjil/client 2024.05

No changes in client image usage.

#### Migrating release-2024.01 to release-2024.05.1

This release don't have breaking change.

Notable change is that now preprocess, pre-fuse and post-fuse need to be declared in three different directories and use the same organization that [vidjil-contrib](https://gitlab.inria.fr/vidjil/contrib) repository.

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

## 2024.01 release

### vidjil/server 2024.01

!!! danger
    A complete rewriting of backend server comes with this release.
    We also changed in depth the docker-compose file. Read this changelog to get more information.

A complete rewriting of backend server from web2py to py4web comes with releases `2024.01`.  
We completely changed launched services, path of some volumes and we now use an dedicated `.env` environment file.

### vidjil/client 2024.01

No changes in client image usage.

#### Migrating release-2022.06 (web2py) to release-2024.05.1 (py4web)

!!! danger
    At release 2024.01, we migrated our backend server from web2py to py4web.
    This section describes the way to update your anterior server.  
    We **HIGHLY** recommend to use a second server with duplicate content to correctly tune docker-compose files.

Since release 2024.01, we migrated to a new python back-end framework: [py4web](https://py4web.com/).  
We also made a major refactoring of [docker compose](https://docs.docker.com/compose/) organization.  
We tried to make it the most transparent but some major changes in volumes and docker declaration were still needed.

**MAKE BACKUP BEFORE MIGRATING YOUR SERVER** (see [database export](dev-server.md#database-export))

##### py4web database migration

In order to prevent some errors with database migration when migrating to py4web, the easiest way is to [export database](dev-server.md#database-export), [clean-up the db and reimport the data](dev-server.md#database-import) with the new py4web images

##### docker compose organization
  
Pull a version of vidjil repository of release 2024.01.

Service have changed, but you could use more or less default configuration.
You will need to update path for volume declaration.  
Note that now volumes declaration moved from `fuse` to `uwsgi` docker service.
New services were added (redis, flowers).

We also changed environment variable declaration.  
Now variable at set to restricted places:

- vidjil-client/conf/conf.js: As previous, conf for browser are done in this file
- vidjil-server/conf/defs.py: As previous, conf for server are done in this file. Note some change in `DIR_xxx` default declaration
- `.env.default` files: Docker environment variable are loaded from this files. It contains default values and explanation about effect. It can be overridden using `docker compose` command line or `env_files` in `docker-compose.yml` or `docker-compose.override.yml`.
- backup/conf/backup.cnf: user and password to use for backup. Will likely be moved to `.env.default` files at next release.

In docker-compose volume, you should not have to change volume path except the ones referring to web2py.
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

## 2022.06 release

**vidjil/server**: 0f7a2655

- New cron job `check_queued.py` to reset workers.
  Please perform a `git pull` in the `docker` repository.

## 2021-11-03

**vidjil/server**: 53b0fc0a

- New variable in defs.py: `LDAP` (set it to False by default).
  Please restart the `workers` container after modifying it.
- Database migration: if you encounter a `Duplicate column name 'pre_process_file'` MySQL error, then you should drop the corresponding column in the table : `ALTER TABLE sequence_file DROP COLUMN pre_process_file;`. As this is a new column, dropping it won't have any consequences.

## 2021-04-05

**vidjil/server**:

- vidjil-algo updated to 2021.04 (from 2020.06)
- Default backup service now use a volume for initialisation
Please ensure to update both your docker-compose.yml and backup/Dockerfile if you want to rebuild the backup service
- New variable in defs.py: `HEALTHCARE_COMPLIANCE`
## 2020-06-22

**vidjil/server**: 6ec207d2

 - vidjil-algo updated to 2020.06 (from 2019.05)
## 2020-06-15

**vidjil/server**: 6ec207d2

- New variable in defs.py: `EMAIL_SUBJECT_START`
- Docker containers should now be able to send emails even if you didn't have a mail server (added a postfix container).
  Please customize the ADMIN_EMAILS in the vidjil-server/conf/defs.py file also.

## 2020-04-21
**vidjil/server**: 8190bd6c

- Adding a new field in the database
- Changes in docker-compose to wait for MySQL
- Fix issue with upload not working with a single file
- Fix the possibility to relaunch some processes (#4242)

## 2020-03-16

**vidjil/server**: 657ac608

- Fix issues with jobs run while the second file is still uploading (#3907)
- Warning this image contains bugs that have been corrected in the following versions

## 2019-12-12
**vidjil/server**: 2ef3187e

- Fix issues with CloneDB with several sample sets

## 2019-11-27
**vidjil/server**: b19f850b

- The web2py password is now provided through an environment
  variable in the docker-compos.yml file.

## 2018-10-19
**vidjil/server**: 3a690203

## 2018-10-18
**vidjil/client**: f959661a

- Tag initialization while creating the database
- Updated default location for SSL certificates
- Ubuntu 18.04 image
- Corrected and updated documentation

## 2018-10-15
**vidjil/server**: f0df4cd9

## 2018-10-15
**vidjil/client**: f0df4cd9

- Initial release, following refactor of the containers and of the documentation
