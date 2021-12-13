/*
 * Vidjil client, main configuration file
 * This file must be named 'js/conf.js' to be taken into account
 * */

var config = {

    /****************
    * Client identification
    */

    /* Mail for the 'get support' link. You can leave it to support@vidjil.org even with your own instances. */
    "support": "support@vidjil.org",

    /* Hosting information and healthcare compliance */
    "hosting": "⚠️ Research Use Only. This instance of Vidjil is hosted by Xxxxxxxx Xxxxxxxxx. This instance is not compliant for clinical use and comes with no warranty. See options for using Vidjil while <a href='http://www.vidjil.org/doc/healthcare'>hosting healthcare data</a>.",

    /* Please see <http://www.vidjil.org/doc/server#healthcare> */
    "healthcare": false,

    /****************
    * Static alerts
    */

    /* Diplay an alert in the header */
    // "alert": "Rescue server",

    /* With more details available in a notification window */
    /*
    "alert": {
        title: "Server Down", 
        msg :"Server is under maintenance until xx:xx (UTC+1)" +
             "<br> A rescue server for urgent works is available at <a href='https://www.rescue.vidjil.org'>www.rescue.vidjil.org</a>"
    },
    */

    /****************
     * External services
     */

    /* Used for the 'align' script
     * If this is not defined, the 'align' button is not available
     */
    "cgi_address" : "https://localhost/cgi/", // Public test server
    // "cgi_address" : "http://127.0.1.1/cgi-bin/",

    /* Proxy for accessing resources without cross-domain issues */
    "proxy": "https://localhost/vidjil/proxy/imgt",

    /* Used for the standalone http://app.vidjil.org/analyze page */
    "segmenter_address" : "https://db.vidjil.org/vidjil/segmenter",

    /* Do we have access to a CloneDB ? */
    "clonedb": false,


    /****************
    /* Access to .vidjil files
     * Any combination of 1), 2) and 3) should work
     */

    /* 1) Patient database */
    "server_id" : "",
    "use_database" : true,
    "db_address" : "https://localhost/vidjil/", // Public test server
    "login" : "",
    "password" : "",

    /* 2) and 3) Static files
    /* - relative paths if Vidjil browser is online on the same server
     * - absolute paths to a CORS active server only if browser is offline or on another server
     */

    /* 2) Menu with a list of static files */
    /*
    "file_menu" : {
        "path" : "/browser/data/",
        "file" : [
            "Stanford-S22.vidjil",
            "L2-LIL-2.vidjil",
            "http://www.vidjil.org/2016-lr/demo/LIL-L2.vidjil"
        ]
    },
    */

    /* 3) Static file autoload, possibly with an .analysis file */
    // "autoload" : "data/Stanford-S22.vidjil",
    // "autoload_analysis" : "data/Stanford-S22.analysis"


    /****************
     * Load extra scripts
     */
    /* "addons" : ["js/lib/important-lib.js", "js/myscript.js"], */

    //rewrite url to include sample/display infos (default : true)
    //"url_rewriting" : false

    /****************
     * Tips of the day
     */
    "doc_address" : "doctips/",
    "available_tips" : [ ]
    //                 [ 'T01', 'T02', 'T03', 'T30', 'T31', 'T32' ]


}
