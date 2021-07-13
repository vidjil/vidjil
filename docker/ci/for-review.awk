#!/bin/awk -f

BEGIN{
    slug=ENVIRON["CI_BUILD_REF_SLUG"]
}
/\/mnt\/upload\/uploads/ {
    print "            - ./ci/uploads:/mnt/upload/uploads"
    next
}
/\/mnt\/result\/results/ {
    print "            - ./ci/result:/mnt/result"
    next
}
/\/mnt\/result\/tmp/ {
    next
}
after_ports{
    if(/\s*-\s*"[^"]*"/)
        next
    else
        after_ports=0
}
after_service{
    printf "        "
    print "network_mode: bridge"
    after_service=0
}    
after_nginx{
    printf "        "
    print "expose:"
    printf "            "
    print "- 443"
    printf "        "
    print "environment:"
    printf "            "
    print "- VIRTUAL_HOST=" slug ".server.ci.vidjil.org"
    printf "            "
    print "- VIRTUAL_PORT=443"
    printf "            "
    print "- VIRTUAL_PROTO=https"
    print "        depends_on:"
    print "            uwsgi:"
    print "              condition: service_started"
    print "        links:"
    print "            - uwsgi:uwsgi"
    after_nginx=0
}
after_volumes{
  printf "            "
  print "- ../browser:/usr/share/vidjil/browser"
  printf "            "
  print "- ../server/web2py/applications/vidjil:/usr/share/vidjil/server/web2py/applications/vidjil"
  printf "            "
  print "- ./:/usr/share/vidjil/docker"
  printf "            "
  print "- databases:/usr/share/vidjil/server/web2py/applications/vidjil/databases"
  
  after_volumes=0
}

after_volumes2{
    if(/\s*-\s*\/opt\/*/) {
      next
    } else {
      after_volumes2=0
    }
}

after_workers {
    print "        restart: always"
    after_workers=0
}
/volumes:/{
    after_volumes=1
    after_volumes2=1
}
/nginx:$/{
    # Add extra_hosts for fuse
    print "        extra_hosts:"
    print "          - \"fuse:127.0.0.1\""
    after_nginx=1
}
/ports:/{
    after_ports=1
    next
}
/workers:$/ {
    after_workers=1
}
/^\s{3,6}(nginx|fuse|uwsgi|workers|mysql|postfix):$/{
    after_service=1
}
/\/opt\/vidjil\/mysql/ {
    # No volume for MySQL
    next
}
/uwsgi-entrypoint.sh/{
    print $0" --ci"
    next
}
1
END {
  printf "volumes:\n    databases:\n"
}
