CREATE USER vidjil;
SET PASSWORD FOR vidjil = PASSWORD('rootpass');
CREATE DATABASE vidjil;
GRANT ALL ON vidjil.* TO 'vidjil'@'%';
