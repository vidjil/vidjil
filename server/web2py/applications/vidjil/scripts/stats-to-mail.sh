#!/bin/sh

(echo "Subject: [app] Vidjil Morning" ; sh stats.sh || true) | /usr/sbin/sendmail morning@vidjil.org


