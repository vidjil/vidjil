
/* replace the default javascript console with a custom one (optional)
 * display important error/log message in popup/flash message instead of the default javascript terminal
 * */
console = new Com(console)

/* Model 
 * 
 */
var m = new Model();

/* Views/Modules
 */
var graph = new Graph("visu2",m);
var list_clones = new List("list", "data", m);
var sp = new ScatterPlot("visu", m);
var segment = new Segment("bot-container",m);

var builder = new Builder(m);
var pdf = new PDF(m, "visu2_svg")
var report = new Report(m)
var db = new Database("plop!", m);

initMenu();
/*
 */
var shortcut = new Shortcut()

