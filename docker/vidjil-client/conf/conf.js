/* 
 * Vidjil browser, main configuration file
 * This file must be named 'js/conf.js' to be taken into account
 * */

var config = {

    /* Used for the 'align' script 
     * If this is not defined, the 'align' button is not available
     */    
    "cgi_address" : "https://localhost/cgi/", // Public test server
    // "cgi_address" : "http://127.0.1.1/cgi-bin/",

    /* The following options control how the user may have access to .vidjil files.
     * Any combination of 1), 2) and 3) should work
     */

    /* 1) Patient database */
    "use_database" : true,
    "db_address" : "https://localhost/vidjil/", // Public test server
    "login" : "",
    "password" : "",

    /* 2) and 3) Static files
    /* - relative paths if Vidjil browser is online on the same server
     * - absolute paths to a CORS active server only if browser is offline or on another server 
     */

    /* 2) Menu with a list of static files */
    "file_menu" : {
        "path" : "/browser/data/",
        "file" : [
            "Stanford-S22.vidjil",
            "L2-LIL-2.vidjil"
        ]
    },
    
    /* 3) Static file autoload, possibly with an .analysis file */
    // "autoload" : "data/Stanford-S22.vidjil",
    // "autoload_analysis" : "data/Stanford-S22.analysis"

    // Proxy config for IMGT querying
    "proxy": "https://localhost/vidjil/proxy/imgt",

    /* Used for the standalone segmenter page */
    "segmenter_address" : "https://db.vidjil.org/vidjil/segmenter",

    /* Do we have access to a CloneDB ? */
    "clonedb": false,

    /****************
     * Tips of the day
     */
    "doc_address" : "doctips/",
    "available_tips" : []

    /****************
     * Static alerts
     */

    // "alert": "Server is down",
}
