/* replace the default javascript console with a custom one (optional)
 * display important error/log message in popup/flash message instead of the default javascript terminal
 * */
console = new Com(console)

/* Model 
 * model role is to load/save .vidjil file (locally or from url) and provides function to access/edit information easily
 */
var m = new Model();

/* Views
 * produce a view inside an html element and keep it sync with a given model
 * we can add as many views as we want to a single model ( multi
 */
var graph = new Graph("visu2",m);
var list_clones = new List("list", "data", m);
var sp = new ScatterPlot("visu", m);
var segment = new Segment("bot-container",m);




/* [WIP] builder module 
 * complete menu/info and provide some tools
 * TODO replace with a menu and info view
 */
var builder = new Builder(m);


/* [outdated] pdf module
 * replaced by report
 */
var pdf = new PDF(m, "visu2_svg")


/* [WIP] report module (optional)
 * provide html report functions for a given model
 * [WARNING] views access are currently hard-coded]
 */
var report = new Report(m)


/* database module (optional)
 * link a model to a given database (or use the one defined in config.js)
 */
var db = new Database(m);


/* [WIP] shortcut module (optional)
 * provide keyboard shortcut
 */
var shortcut = new Shortcut()


//TODO 
initMenu();