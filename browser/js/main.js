var DB_ADDRESS = "http://134.206.11.64:8000/Vidjil/";
var CGI_ADDRESS = "http://127.0.1.1/cgi-bin/";


/*tools
 * 
 * */
var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")

/*load user config if exist
 * 
 * */
if (typeof config != 'undefined') {
    if (config.cgi_address){
        if (config.cgi_address) CGI_ADDRESS = config.cgi_address
        if (config.cgi_address == "default") CGI_ADDRESS = "http://"+window.location.hostname+"/cgi/"
    }
    if (config.use_database != undefined && config.use_database) {
        if (config.db_address) { DB_ADDRESS = config.db_address}
        if (config.db_address == "default") DB_ADDRESS = "https://"+window.location.hostname+"/vidjil/"
        var fileref=document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", DB_ADDRESS + "static/js/checkSSL.js")
        document.getElementsByTagName("head")[0].appendChild(fileref)
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
    
    if (typeof config.use_database != 'undefined' && config.use_database){
         $("#db_menu").css("display", "");
    }
}


/* Model
 */
var m = new Model();
/*appel a chaque changement de taille du navigateur*/
window.onresize = function () { m.resize(); };

/* views
 */
var graph = new Graph("visu2",m);
var list = new List("list", "data", m);
var sp = new ScatterPlot("visu", m);
var segment = new Segment("bot-container",m, CGI_ADDRESS);
var builder = new Builder(m);

/* report/export
 */

var pdf = new PDF(m, "visu2_svg")
var report = new Report()
/* database
 */
if (typeof config != 'undefined' && config.use_database){
    var db = new Database("plop!", DB_ADDRESS, m);
    var uploader = new Uploader()
}

/* Stat object
 */
var stats = new Stats(sp);
var shortcut = new Shortcut()


//onStart
if (typeof config != 'undefined' && location.search != ''){
    var tmp = location.search.substring(1).split('&')
    var patient = -1
    var config = -1
    var dataURL = ""
    var analysisURL = ""
    var custom_list = []
    for (var i=0; i<tmp.length; i++){
        var tmp2 = tmp[i].split('=')
        
        if (tmp2[0] == 'data') dataURL = tmp2[1]
        if (tmp2[0] == 'analysis') analysisURL = tmp2[1]
        if (tmp2[0] == 'patient') patient = tmp2[1]
        if (tmp2[0] == 'config') config = tmp2[1]
        if (tmp2[0] == 'custom') custom_list.push(tmp2[1])
    }
    
    
    if (dataURL != "") {
        if (analysisURL != ""){
            var callback = function() {m.loadAnalysisUrl(analysisURL)}
            m.loadDataUrl(dataURL, callback)
        }else{
            m.loadDataUrl(dataURL)
        }
    }
    
    if (patient != "-1" && config != "-1"){
        //wait 1sec to check ssl
        setTimeout(function () { db.load_data( {"patient" : patient , "config" : config } , "")  }, 1000);
    }
    
    if (custom_list.length>0){
        //wait 1sec to check ssl
        setTimeout(function () { db.load_custom_data( {"custom" : custom_list })  }, 1000);
    }
        
    
}else if (typeof config != 'undefined' && config.use_database){
    //wait 1sec to check ssl
    setTimeout(function () { db.call("patient/index.html")}, 1000);
}else{
    myConsole.popupMsg(myConsole.msg.welcome)
}

//onClose
window.onbeforeunload = function(e){
    if ( uploader.is_uploading() ){
        e = e || event;
        if(e.preventDefault){e.preventDefault();}
        e.returnValue = false;
        return 'some uploads are incomplete';
    }
    if ( m.analysisHasChanged ){
        e = e || event;
        if(e.preventDefault){e.preventDefault();}
        e.returnValue = false;
        return 'Some changes have not been saved';
    }
}



initTag();//TODO a enlever
