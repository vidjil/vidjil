from ubuntu_systemd

label version="1.0"
label description="An Ubuntu based docker image which comes \
with a full installation of the Vidjil algoright and browser/server."

run apt-get update
run apt-get -y -q install apt-utils sudo curl nginx-full

run echo deb http://apt.vidjil.org:8080/archive sid/all/ >> /etc/apt/sources.list
run echo deb http://apt.vidjil.org:8080/archive sid/amd64/ >> /etc/apt/sources.list
run echo deb http://apt.vidjil.org:8080/archive wheezy/all/ >> /etc/apt/sources.list
run echo deb http://apt.vidjil.org:8080/archive wheezy/amd64/ >> /etc/apt/sources.list

# Install Postfix. Shamelessly stolen from https://github.com/noteed/docker-postfix/blob/master/Dockerfile
run echo "postfix postfix/main_mailer_type string Internet site" > preseed.txt
run echo "postfix postfix/mailname string mail.example.com" >> preseed.txt
# Use Mailbox format.
run debconf-set-selections preseed.txt
run DEBIAN_FRONTEND=noninteractive apt-get install -q -y postfix

run postconf -e myhostname=mail.example.com
run postconf -e mydestination="mail.example.com, example.com, localhost.localdomain, localhost"
run postconf -e mail_spool_directory="/var/spool/mail/"
run postconf -e mailbox_command=""

run echo "vidjil-server vidjil/reconfigure-webserver string nginx" > preseed.txt
run echo "vidjil-server vidjil/restart-webserver boolean true" >> preseed.txt
run echo "vidjil-server vidjil/configure-startup string systemd" >> preseed.txt
run echo "vidjil-server vidjil/start-services boolean false" >> preseed.txt
run echo "vidjil-server vidjil/web2py-password string VidjilAdm1n" >> preseed.txt
run echo "vidjil-server vidjil/ssl-country string AU" >> preseed.txt
run echo "vidjil-server vidjil/ssl-state string Some-State" >> preseed.txt
run echo "vidjil-server vidjil/ssl-locality string Some-Locality" >> preseed.txt
run echo "vidjil-server vidjil/ssl-organisation string Internet Widgits Pty Ltd" >> preseed.txt
run echo "vidjil-server vidjil/ssl-section string Some-Section" >> preseed.txt
run echo "vidjil-server vidjil/ssl-name string VidjilTeam" >> preseed.txt
run echo "vidjil-server vidjil/ssl-email string team@vidjil.org" >> preseed.txt

run debconf-set-selections preseed.txt
run echo 91.121.76.104 apt.vidjil.org >> /etc/hosts ;\
 gpg --recv-key --keyserver apt.vidjil.org 9187987418E1A625 ;\
 apt-get update ;\
 DEBIAN_FRONTEND=noninteractive apt-get -y -q --allow-unauthenticated install vidjil-archive-keyring ;\
 apt-get update ;\
 DEBIAN_FRONTEND=noninteractive apt-get install -y -q --allow-unauthenticated vidjil-server

run cd /usr/share/vidjil/germline && make
run cd /usr/share/web2py && chown -R www-data:www-data .

run systemctl enable web2py.scheduler.service fuse.server.service

cmd ["/bin/systemctl", "start", "nginx.service"]
cmd ["/bin/systemctl", "start", "uwsgi.service"]

expose 80
expose 443
cmd ["/usr/sbin/init"]
