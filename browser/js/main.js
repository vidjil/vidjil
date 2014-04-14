var DB_ADDRESS = "http://134.206.11.64:8000/Vidjil/";
var CGI_ADDRESS = "http://127.0.1.1/cgi-bin/";

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



/*load user config if exist
 * 
 * */
if (typeof config != 'undefined') {
    if (config.cgi_address){
        if (config.cgi_address) CGI_ADDRESS = config.cgi_address
        if (config.db_address) DB_ADDRESS = config.db_address
    }

    if (config.use_database){
        $('#database_menu').css("display", "")
    }

    if (config.demo_file && config.demo_file.length != 0){
        
        //detect if files are available
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: config.demo_file[0],
            success: function (result) {
                $('#demo_file_menu').css("display", "")
                var demo_file = document.getElementById("demoSelector")

                for (var i = 0; i < config.demo_file.length; i++) {
                    (function (i) {

                        var path = config.demo_file[i].split("/") 
                        var a = document.createElement('a');
                        a.className = "buttonSelector"
                        a.onclick = function () {
                            m.loadDataUrl(config.demo_file[i])
                        }
                        
                        a.appendChild(document.createTextNode(path[path.length-1]))

                        demo_file.appendChild(a);
                    })(i)
                }
            },
            error: function() {
                console.log("demo file list not available")
            }
        });

    }
}

initTag();//TODO a enlever

