FROM vidjil/server:latest

RUN apt-get update && apt-get install -y mysql-client zip

RUN touch /var/log/cron.log

RUN ln -sf /etc/backup/backup.cnf /root/.my.cnf

RUN echo "* * * * * root cp /etc/backup/backup-cron /etc/cron.d" >> /etc/crontab

RUN ln -sf /dev/stdout /var/log/cron.log && ln -sf /dev/stderr /var/log/cron.log

CMD cron && tail -f /var/log/cron.log
