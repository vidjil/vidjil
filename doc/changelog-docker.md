!!! note
    This CHANGELOG concerns the Docker images of vidjil.  
    We publish here notes to help to update these images.  
    See <http://www.vidjil.org/doc/server>

## 2024-01-23

**vidjil/server**:

!!! danger
    A complete rewriting of backend server come with this release.
    We also change in depth the docker-compose file. Read this changelog to get more information.

A complete rewriting of backend server from web2py to py4web comes with releases `2024.01`.
We completly change launched services, path of some volumes and we now use an dedicated `.env` environement file.
**Please follow migration documentation**.

See more information at [Migrating from Web2py to Py4web](dev-server.md#migrating-from-web2py-to-py4web).

## 2022-06-28

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
   
