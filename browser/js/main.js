var DB_ADDRESS = "http://134.206.11.64:8000/Vidjil/";
var CGI_ADDRESS = "http://127.0.1.1/cgi-bin/";

/*load user config if exist
 * 
 * */
if (typeof config != 'undefined') {
    if (config.cgi_address){
        if (config.cgi_address) CGI_ADDRESS = config.cgi_address
        if (config.db_address) DB_ADDRESS = config.db_address
        if (config.db_address == "default") DB_ADDRESS = "https://"+window.location.hostname+"/vidjil/"
        if (config.cgi_address == "default") CGI_ADDRESS = "http://"+window.location.hostname+"/cgi-bin/"
    }

    if (config.demo && config.demo.file.length != 0){
        
        //detect if files are available
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: config.demo.path + config.demo.file[0],
            success: function (result) {
                $('#demo_file_menu').css("display", "")
                var demo_file = document.getElementById("demoSelector").firstChild

                for (var i = 0; i < config.demo.file.length; i++) {
                    (function (i) {

                        var a = document.createElement('a');
                        a.className = "buttonSelector"
                        a.onclick = function () {
                            m.loadDataUrl(config.demo.path + config.demo.file[i])
                        }
                        
                        a.appendChild(document.createTextNode(config.demo.file[i]))

                        demo_file.appendChild(a);
                    })(i)
                }
            },
            error: function() {
                myConsole.flash("demo file list not available", 1)
            }
        });

    }
    
    if (config.use_database){
        
        var a = document.createElement('a');
        a.className = "buttonSelector"
        a.onclick = function () { db.call('patient/index') }
        a.appendChild(document.createTextNode("database"))
        document.getElementById("demoSelector").firstChild.appendChild(a);

        a = document.createElement('a');
        a.className = "buttonSelector"
        a.onclick = function () { db.save_analysis() }
        a.appendChild(document.createTextNode("save analysis (database)"))
        document.getElementById("demoSelector").firstChild.appendChild(a);
    }
    
    if (config.debug_mode) {
        $("#debug_menu").css("display", "");
    }
}


/*tools
 * 
 * */
var myConsole = new Com("flash_container", "log_container")


/* Model
 *
 * */
var m = new Model();


/* views
 * 
 * */
var graph = new Graph("visu2",m);
var list = new List("list",m);
var sp = new ScatterPlot("visu",m, graph, stats);
var segment = new Segment("bot-container",m, CGI_ADDRESS);
var builder = new Builder(m);


/* Stat object
 *
 */
var stats = new Stats(sp);

/* Add view in the model -> Alignment button
 */
m.addSegment(segment);

/* Connections
 *
 * */
var db = new Database("plop!", DB_ADDRESS);

/*Statements and functions which allows to active the ALT key, and the movement of the SVG frame*/
document.onkeydown = keydown;
document.onkeyup = keyup;

function keydown(evt) {
    if (evt.altKey && sp.reinit) {
        sp.active_move = true;
    }
}

function keyup(evt) {
    sp.active_move = false;
}

initTag();//TODO a enlever
