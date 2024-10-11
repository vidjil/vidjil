FROM ubuntu:20.04

LABEL version="0.2"

### See also doc/user.md and BROWSER_COMPATIBILITY in browser/js/model.js
LABEL description="An Cypress based docker image which comes with cypress pipeline and various browsers version.\
Versions: \
    Firefox: 86 (legacy), 102 (supported, ESR), 112 (latest) \
    Chromium: 80 (legacy), 93 (supported), 111 (latest)"


WORKDIR /app

##################################
### Update and install ressources
##################################
ENV DEBIAN_FRONTEND="noninteractive" TZ="Europe/Paris"
RUN apt-get update && apt-get install --no-install-recommends --no-install-suggests -y -q npm libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb wget bzip2 tar unzip nano curl ca-certificates make python python3 python2.7 libxml2-utils &&\
 apt-get -y -q autoremove &&\
 wget -qO- https://deb.nodesource.com/setup_14.x | bash - &&\
 apt install -y nodejs &&\
 mkdir -p /etc/ssl/certs/ /app/browsers


######################
### download browsers
######################
# https://chromium.cypress.io/; allow to get old versions of chromium
## Latests (~firefox 112, Chromium 111/rev 1109224, as April 2023)
## legacy version of browser (firefox 86, chromium 80/rev 722276, minimal for cypress)
## Supported version (firefox 102 ESR, Chromium 100/rev 972774 ~ same release date beginning 2022)

RUN curl -Lo firefox_latest.tar.bz2 'https://download-installer.cdn.mozilla.net/pub/firefox/releases/112.0/linux-x86_64/fr/firefox-112.0.tar.bz2' &&\
 tar -xjf firefox_latest.tar.bz2 &&\
 mv firefox browsers/firefox_latest &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/1109220/chrome-linux.zip -O chrome-latest.zip &&\
 unzip -q chrome-latest.zip &&\
 mv  chrome-linux browsers/chrome_latest &&\

 wget -q https://ftp.mozilla.org/pub/firefox/releases/86.0/linux-x86_64/fr/firefox-86.0.tar.bz2 -O firefox-legacy.tar.bz2 &&\
 tar -xjf firefox-legacy.tar.bz2 && mv firefox browsers/firefox_legacy &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/722276/chrome-linux.zip -O chrome-legacy.zip &&\
 unzip -q chrome-legacy.zip &&\
 mv  chrome-linux browsers/chrome_legacy &&\

 wget -q https://download-installer.cdn.mozilla.net/pub/firefox/releases/102.10.0esr/linux-x86_64/fr/firefox-102.10.0esr.tar.bz2 -O firefox-supported.tar.bz2 &&\
 tar -xjf firefox-supported.tar.bz2 && mv firefox browsers/firefox_supported &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/972774/chrome-linux.zip -O chrome-supported.zip &&\
 unzip -q chrome-supported.zip &&\
 mv  chrome-linux browsers/chrome_supported &&\

 rm chrome-legacy.zip chrome-supported.zip chrome-latest.zip  firefox-legacy.tar.bz2 firefox-supported.tar.bz2  firefox_latest.tar.bz2


COPY  cypress.config.js .
COPY  package.json .
COPY  cypress_script.bash script.bash



RUN npm i cypress && $(npm bin)/cypress verify
