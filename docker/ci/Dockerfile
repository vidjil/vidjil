FROM ubuntu:20.04

LABEL version="0.1"
LABEL description="An Cypress based docker image which comes with cypress pipeline and various browsers version."

WORKDIR /app
COPY  cypress.json .
COPY  package.json .
COPY  cypress_script.bash script.bash

##################################
### Update and install ressources
##################################
ENV DEBIAN_FRONTEND="noninteractive" TZ="Europe/Paris"
RUN apt-get update && apt-get install --no-install-recommends --no-install-suggests -y -q npm libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb wget bzip2 tar unzip nano curl ca-certificates make &&\
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
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/886661/chrome-linux.zip &&\
 unzip -q chrome-linux.zip &&\
 mv  chrome-linux browsers/chrome_latest &&\
 wget -q https://ftp.mozilla.org/pub/firefox/releases/62.0/linux-x86_64/fr/firefox-62.0.tar.bz2 &&\
 tar -xjf firefox-62.0.tar.bz2 && mv firefox browsers/firefox_legacy &&\
 wget -q http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/652428/chrome-linux.zip &&\
 unzip -q chrome-linux.zip &&\
 mv  chrome-linux browsers/chrome_legacy &&\
 rm chrome-linux.zip chrome-linux.zip.1  firefox-62.0.tar.bz2  firefox_latest.tar.bz2


RUN npm i cypress && $(npm bin)/cypress verify
