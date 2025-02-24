#!/bin/sh

apk update && apk add mysql-client mariadb-connector-c

rm -rf /mnt/volumes/sql/*
echo "[mysqldump]" > additional_conf.cnf
echo "user = backup" >> additional_conf.cnf
echo "password = \"$MYSQL_BACKUP_PASSWORD\"" >> additional_conf.cnf
echo "host = mysql" >> additional_conf.cnf
chmod 600 additional_conf.cnf
mariadb-dump --defaults-file=./additional_conf.cnf --no-create-info --complete-insert --no-tablespaces --skip-ssl vidjil > /mnt/volumes/sql/dump.sql
rm additional_conf.cnf
