#!/bin/sh

(echo "Subject: [`hostname`] Vidjil Morning" ; sh stats.sh || true) | /usr/sbin/sendmail morning@vidjil.org


