var DB_ADDRESS = "http://134.206.11.64:8000/Vidjil/default/";
var CGI_ADDRESS = "http://127.0.1.1/cgi-bin/";

/*load user config if exist
 * 
 * */
if (typeof config != 'undefined' && config.cgi_address){
    if (config.cgi_address) CGI_ADDRESS = config.cgi_address
    if (config.db_address) DB_ADDRESS = config.db_address
}

/* Model
 *
 * */
var m = new Model();


/* views
 * 
 * */
var graph = new Graph("visu2",m);
var list = new List("list",m);
var sp = new ScatterPlot("visu",m);
var segment = new Segment("bot-container",m, CGI_ADDRESS);
var builder = new Builder(m);


/* connections
 * 
 * */
var db = new Database("plop!", DB_ADDRESS);

initTag();//TODO a enlever