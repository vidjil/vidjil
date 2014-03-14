
/* Model
 *
 * */
var m = new Model();


/* views
 * 
 * */
var graph = new Graph("visu2",m);
var list = new List("listClones",m);
var sp = new ScatterPlot("visu",m);
var segment = new Segment("bot-container",m);
var builder = new Builder(m);

initTag();//TODO a enlever
