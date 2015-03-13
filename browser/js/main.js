var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")


initMenu()

/* Model
 */
var m = new Model();

/* views
 */
var graph = new Graph("visu2",m);
var list_clones = new List("list", "data", m);
var sp = new ScatterPlot("visu", m);
var segment = new Segment("bot-container",m);

var builder = new Builder(m);
var pdf = new PDF(m, "visu2_svg")
var report = new Report()
var db = new Database("plop!", m);


var shortcut = new Shortcut()


initTag();//TODO a enlever
