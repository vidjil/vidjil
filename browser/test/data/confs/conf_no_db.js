/* 
 * Vidjil browser, main configuration file
 * This file must be named 'js/conf.js' to be taken into account
 * */

var config = {

    "cgi_address" : "https://db.vidjil.org/cgi/", // Public test server
    "use_database" : false,
    "proxy": "https://localhost/vidjil/proxy/imgt",

    /* Do we have access to a CloneDB ? */
    "clonedb": false,
    "IMGT": true,
    "arrestSubset":false,
    // Will be modify by cypress script to include all addons file present
    "addons" : [] 
}
