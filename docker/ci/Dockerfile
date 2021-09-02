FROM ubuntu:20.04

LABEL version="0.2"
LABEL description="An Cypress based docker image which comes with cypress pipeline and various browsers version.\
Versions: \
    Firefox: 62 (legacy), 78 (supported), 89 (latest) \
    Chromium: 75 (legacy), 79 (supported), 93 (latest)"

WORKDIR /app
COPY  cypress.json .
COPY  package.json .
COPY  cypress_script.bash script.bash

##################################
### Update and install ressources
##################################
ENV DEBIAN_FRONTEND="noninteractive" TZ="Europe/Paris"
RUN apt-get update && apt-get install --no-install-recommends --no-install-suggests -y -q npm libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb wget bzip2 tar unzip nano curl ca-certificates make python python3 python2.7 &&\
 apt-get -y -q autoremove &&\
 wget -qO- https://deb.nodesource.com/setup_14.x | bash - &&\
 apt install -y nodejs &&\
 mkdir -p /etc/ssl/certs/ /app/browsers


######################
### download browsers
######################
# https://chromium.cypress.io/; allow to get old versions of chromium
RUN curl -Lo firefox_latest.tar.bz2 'https://download.mozilla.org/?product=firefox-latest&os=linux64&lang=en-US' &&\
 tar -xjf firefox_latest.tar.bz2 &&\
 mv firefox browsers/firefox_latest &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/886661/chrome-linux.zip -O chrome-latest.zip &&\
 unzip -q chrome-latest.zip &&\
 mv  chrome-linux browsers/chrome_latest &&\

 wget -q https://ftp.mozilla.org/pub/firefox/releases/62.0/linux-x86_64/fr/firefox-62.0.tar.bz2 -O firefox-legacy.tar.bz2 &&\
 tar -xjf firefox-legacy.tar.bz2 && mv firefox browsers/firefox_legacy &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/652428/chrome-linux.zip -O chrome-legacy.zip &&\
 unzip -q chrome-legacy.zip &&\
 mv  chrome-linux browsers/chrome_legacy &&\

 wget -q https://ftp.mozilla.org/pub/firefox/releases/78.0/linux-x86_64/fr/firefox-78.0.tar.bz2 -O firefox-supported.tar.bz2 &&\
 tar -xjf firefox-supported.tar.bz2 && mv firefox browsers/firefox_supported &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/706915/chrome-linux.zip -O chrome-supported.zip &&\
 unzip -q chrome-supported.zip &&\
 mv  chrome-linux browsers/chrome_supported &&\

 rm chrome-legacy.zip chrome-supported.zip chrome-latest.zip  firefox-legacy.tar.bz2 firefox-supported.tar.bz2  firefox_latest.tar.bz2


RUN npm i cypress && $(npm bin)/cypress verify
