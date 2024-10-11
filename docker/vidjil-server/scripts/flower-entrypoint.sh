echo -e "\n\e[34m========================\e[0m"
echo -e "\e[34m=== Start service flower\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo

cd usr/share/vidjil/server/py4web
celery -b redis://redis:6379/0 -A apps.vidjil.tasks flower
