Install CGI

configure Apache2

add in etc/apache2/sites-available/default and change VIDJIL_PATH by your own installation directory


	ScriptAlias /cgi-bin/ VIDJIL_PATH/vdj/vidjil/interface/cgi/
	<Directory "/home/marc/bonsai/bonsai/vdj/vidjil/interface/cgi/">
	AllowOverride None
	Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
	Order allow,deny
	Allow from all
	</Directory>


In folder interface/js/segmenter.js change CGI_ADRESS with your own server adress

      var CGI_ADRESS ="http://127.0.0.1/cgi-bin/";