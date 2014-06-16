var DB_ADDRESS = "http://134.206.11.64:8000/Vidjil/";
var CGI_ADDRESS = "http://127.0.1.1/cgi-bin/";

/*load user config if exist
 * 
 * */
if (typeof config != 'undefined') {
    if (config.cgi_address){
        if (config.cgi_address) CGI_ADDRESS = config.cgi_address
        if (config.db_address) DB_ADDRESS = config.db_address
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
                console.log("demo file list not available")
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

