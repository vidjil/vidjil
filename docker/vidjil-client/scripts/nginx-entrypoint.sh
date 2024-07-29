echo -e "\n\e[34m=======================\e[0m"
echo -e "\e[34m=== Start service nginx\e[0m"
echo -e "\e[34m=== `date +'%Y/%m/%d; %H:%M'`\e[0m\n"

DIR=/etc/nginx/ssl
if test -e "$DIR"; then
    echo "$DIR exists."
else
    echo "Create missing directory for SSL files"
    mkdir "$DIR"
fi

# Create a self signed ssl certificate if nothing specified
if test -e "/etc/nginx/ssl/vidjil.key"; then
    echo "ssl files already exists."
else
    echo "Create a self signed SSL cerificate for this install (please update your config if you wish to use your own certificates)"
    openssl genrsa 4096 > /etc/nginx/ssl/vidjil.key
    openssl req -new -x509 -nodes -sha1 -days 1780 \
             -subj "/C=FR/ST=Denial/L=Lille/O=VidjilNet/CN=www.vidjil.org" \
             -key /etc/nginx/ssl/vidjil.key > /etc/nginx/ssl/vidjil.crt
    openssl x509 -noout -fingerprint -text < /etc/nginx/ssl/vidjil.crt
fi

# Set the DB address if given
if test -v "DB_ADDRESS"; then
    echo "Setting DB address to $DB_ADDRESS"
    sed -i "s/https:\/\/localhost/https:\/\/${DB_ADDRESS}/g" /etc/vidjil/conf.js
fi

# Set the DB address if set
if test -v "DB_ADDRESS"; then
   sed -i "s/https:////localhost/${DB_ADDRESS}/g" /etc/vidjil/conf.js
fi

spawn-fcgi -U nginx -u nginx -G nginx -g nginx -s /var/run/fcgiwrap.socket /usr/bin/fcgiwrap
nginx -g 'daemon off;'
