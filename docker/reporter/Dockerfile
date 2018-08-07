from vidjil/server:test

run apt-get clean && rm -rf /var/lib/apt/lists/* && apt-get update && apt-get install -y cron python python-pip iputils-ping

run pip install crontab requests

add crontab /etc/cron.d/reporter

run chmod 0644 /etc/cron.d/reporter

run touch /var/log/cron.log

cmd cron && tail -f /var/log/cron.log
