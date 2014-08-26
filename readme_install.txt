os : ubuntu server 14.04

les prérequis
=============
    apt-get install git
    apt-get install g++
    apt-get install make
    apt-get install unzip

on récupére le projet sur son dépot préféré
===========================================
    git clone ....                              copy git repository

installation de Vidjil
======================
    /vidjil                     make            compil command line program
    /vidjil/data                make            download/unzip stanford default file
    /vidjil/germline            make            download germlines from IMGT
    /vidjil/algo/cgi            make            compil cgi

installation et initialisation du serveur
=========================================
    /vidjil/server              make                            download/unzip/install web2py server
    /vidjil/server/web2py       python web2py.py -K vidjil      start web2py worker


durant l'installation du serveur il faut configurer apache2 et le certificat ssl (la config par defaut fonctionne), 
a la fin de l'installation le mot de passe pour l'administration du serveur web2py est demandé.


web2py est accessible a httpS://xxx.xxx.xxx.xxx/ (a visité pour valider le certificat avant d'utiliser le browser)
le browser est accessible a http://xxx.xxx.xxx.xxx/browser pré configuré avec la bdd et le cgi

