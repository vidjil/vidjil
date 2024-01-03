# create a self signed ssl certificate if nothing specified
echo -e "\n\e[34m=======================\e[0m"
echo -e "\e[34m=== Start service nginx\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m"; echo

DIR=/etc/nginx/ssl
if test -e "$DIR"; then
    echo "$DIR exists."
else
    echo "Create missing directory for SSL files"
    mkdir "$DIR"
fi

if test -e "/etc/nginx/ssl/web2py.key"; then
    echo "ssl files already exists."
else
    echo "Create a self signed SSL cerificate for this install (please update your config if you wish to use your own certificates)"
    openssl genrsa 4096 > /etc/nginx/ssl/web2py.key
    openssl req -new -x509 -nodes -sha1 -days 1780 \
             -subj "/C=FR/ST=Denial/L=Lille/O=VidjilNet/CN=www.vidjil.org" \
             -key /etc/nginx/ssl/web2py.key > /etc/nginx/ssl/web2py.crt
    openssl x509 -noout -fingerprint -text < /etc/nginx/ssl/web2py.crt
fi

make -C /usr/share/vidjil/browser/

# echo "==== Start healthcheck ==="
# bash /healthchecks/healthcheck_nginx.bash &

spawn-fcgi -u www-data -s /var/run/fcgiwrap.socket /usr/sbin/fcgiwrap
nginx -g 'daemon off;'
