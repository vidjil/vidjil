#!/bin/bash

function get_certificate() {
  echo -e "openssl s_client -showcerts -connect $1:443 </dev/null 2>/dev/null | sed -n -e '/BEGIN\ CERTIFICATE/,/END CERTIFICATE/ p' > $2"
  openssl s_client -showcerts -connect $1:443 </dev/null 2>/dev/null | sed -n -e '/BEGIN\ CERTIFICATE/,/END CERTIFICATE/ p' > $2
}


get_certificate $1 $2
# get_certificate "localhost" "certifiacte_localhost.pem"