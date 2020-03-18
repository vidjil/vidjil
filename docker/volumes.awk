#!/bin/awk -f

BEGIN{
    slug=ENVIRON["CI_BUILD_REF_SLUG"]
}
s{
  printf "            "
  print "- ../browser:/usr/share/vidjil/browser"
  printf "            "
  print "- ../server/web2py/applications/vidjil:/usr/share/vidjil/server/web2py/applications/vidjil"
  s=0
}

s2{
    if(/\s*-\s*\/opt\/*/) {
      next
    } else {
      s2=0
    }
}
/volumes:/{s=1; s2=1}1
