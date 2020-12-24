FROM vidjil/server:latest

RUN apt-get update && apt-get install -y mysql-client zip

RUN touch /var/log/cron.log

ADD ./conf/backup-cron /etc/cron.d/backup-cron

ADD ./conf/backup.cnf /root/.my.cnf

RUN ln -sf /dev/stdout /var/log/cron.log && ln -sf /dev/stderr /var/log/cron.log

CMD cron && tail -f /var/log/cron.log
