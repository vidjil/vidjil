#!/bin/awk -f

BEGIN{
    slug=ENVIRON["CI_BUILD_REF_SLUG"]
    a=1
}
s&&a{
    printf "        "
    print "expose:"
    printf "            "
    print "- 443"
    printf "        "
    print "environment:"
    printf "            "
    print "- VIRTUAL_HOST=" slug ".ci.vidjil.org"
    printf "            "
    print "- VIRTUAL_PORT=443"
    printf "            "
    print "- VIRTUAL_PROTO=https"
    s=0
    a=0
} /nginx:/{s=1}1
