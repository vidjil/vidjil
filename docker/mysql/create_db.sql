CREATE USER vidjil_user;
SET PASSWORD FOR USER vidjil_user = PASSWORD('rootpass');
CREATE DATABASE vidjil;
GRANT ALL ON vidjil.* TO 'vidjil_user'@'%'; 
