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

# Set the front address if given
if test -v "FRONT_ADDRESS"; then
    echo "Setting front address to $FRONT_ADDRESS"
    sed -i "s/server_name \$hostname;/server_name ${FRONT_ADDRESS};/g" /etc/vidjil/nginx_vidjil.conf
    sed -i "s/server_name \$hostname;/server_name ${FRONT_ADDRESS};/g" /etc/vidjil/nginx_vidjil_http.conf
fi

# Set the DB address if given
if test -v "DB_ADDRESS"; then
    echo "Setting DB address to $DB_ADDRESS"
    sed -i "s/:\/\/localhost/:\/\/${DB_ADDRESS}/g" /etc/vidjil/conf.js
    sed -i "s/:\/\/localhost/:\/\/${DB_ADDRESS}/g" /etc/vidjil/conf_http.js
fi

# Set the healthcare config is given
if test -v "HEALTHCARE_COMPLIANCE"; then
    if [ "$HEALTHCARE_COMPLIANCE" = "True" ]; then
        echo "Setting HEALTHCARE_COMPLIANCE to True"
        sed -i "s/healthcare: false/healthcare: true/g" /etc/vidjil/conf.js
        sed -i "s/healthcare: false/healthcare: true/g" /etc/vidjil/conf_http.js
        sed -i "s/\";*Research Use Only. This instance of Vidjil is hosted by.*/\"This server has been set up to be compliant for clinical use by the server maintainers. You should ensure that you comply with the applicable regulations in your country concerning storage and processing of healthcare data.\",/g" /etc/vidjil/conf.js
        sed -i "s/\".*Research Use Only. This instance of Vidjil is hosted by.*/\"This server has been set up to be compliant for clinical use by the server maintainers. You should ensure that you comply with the applicable regulations in your country concerning storage and processing of healthcare data.\",/g" /etc/vidjil/conf_http.js
    fi
fi

spawn-fcgi -U nginx -u nginx -G nginx -g nginx -s /var/run/fcgiwrap.socket /usr/bin/fcgiwrap
nginx -g 'daemon off;'
