#!/bin/awk -f

BEGIN{
    slug=ENVIRON["CI_BUILD_REF_SLUG"]
}
after_volumes{
  printf "            "
  print "- ../browser:/usr/share/vidjil/browser"
  printf "            "
  print "- ../server/web2py/applications/vidjil:/usr/share/vidjil/server/web2py/applications/vidjil"
  after_volumes=0
}

after_volumes2{
    if(/\s*-\s*\/opt\/*/) {
      next
    } else {
      after_volumes2=0
    }
}
/volumes:/{after_volumes=1; after_volumes2=1}1
