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
    after_nginx=0
}
after_volumes{
  printf "            "
  print "- ../browser:/usr/share/vidjil/browser"
  printf "            "
  print "- ../server/web2py/applications/vidjil:/usr/share/vidjil/server/web2py/applications/vidjil"
  printf "            "
  print "- ./:/usr/share/vidjil/docker"
  after_volumes=0
}

after_volumes2{
    if(/\s*-\s*\/opt\/*/) {
      next
    } else {
      after_volumes2=0
    }
}
/volumes:/{
    after_volumes=1
    after_volumes2=1
}
/nginx:$/{
    after_nginx=1
}
/ports:/{
    after_ports=1
    next
}
/^\s{3,6}(nginx|fuse|uwsgi|workers|mysql):$/{
    after_service=1
}
/\/opt\/vidjil\/mysql/ {
    # No volume for MySQL
    next
}
1
END {
  printf "volumes:\n    databases:\n"
}
