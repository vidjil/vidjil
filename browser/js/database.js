DB_ADDRESS = ""

function Database(id, model) {
    var self = this;
    
    if (typeof config != 'undefined' && config.use_database != undefined && config.use_database) {

        if (config.db_address) { DB_ADDRESS = config.db_address}
        if (config.db_address == "default") DB_ADDRESS = "https://"+window.location.hostname+"/vidjil/"
        var fileref=document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", DB_ADDRESS + "static/js/checkSSL.js")
        document.getElementsByTagName("head")[0].appendChild(fileref)
        
        this.db_address = DB_ADDRESS;
        this.id = id;
        this.upload = {};
        this.url = []
        this.m = model
        this.uploader = new Uploader()
        this.build()
        
        window.onbeforeunload = function(e){
            if ( self.uploader.is_uploading() ){
                e = e || event;
                if(e.preventDefault){e.preventDefault();}
                e.returnValue = false;
                return 'some uploads are incomplete';
            }
            if ( self.m.analysisHasChanged ){
                e = e || event;
                if(e.preventDefault){e.preventDefault();}
                e.returnValue = false;
                return 'Some changes have not been saved';
            }
        }
    }
}


function return_URL_CGI() {
    if (typeof config != "undefined") return config.cgi_address;
    else return "No_CGI_found";
}

Database.prototype = {
    
    build: function () {
        var self = this;
        
        this.div = document.createElement("div")
        this.div.className = "db_div";
        
        var close_popup = document.createElement("span")
        close_popup.onclick = function(){
            self.close();
        }
        close_popup.className = "closeButton";
        close_popup.appendChild(document.createTextNode("X"));
        this.msg = document.createElement("div")
        this.msg.className = "db_msg";
        
        this.div.appendChild(close_popup)
        this.div.appendChild(this.msg)
        
        document.body.appendChild(this.div);
    },
    
    /*appel une page générée a partir des données du serveur
     *page : nom de la page coté serveur
     *args : parametres format json ( { "name_arg1" : "arg1", ... } )
     * */
    call: function (page, args) {
        

        try {
            var event = window.event || arguments.callee.caller.arguments[0] 
            event.stopPropagation();
        }
        catch(err)
        {}
        
        var self = this;
        var arg = "";
        if (typeof args != "undefined" && Object.keys(args).length) 
            var arg = this.argsToStr(args)
        
        var url = self.db_address + page + "?" + arg
        if (page.substr(0,4).toLowerCase() == "http") {
            url = page + arg
        }
        
        this.callUrl(url, args)
    },
    
    callUrl : function (url, args){
        var self=this;
        
        $.ajax({
            type: "POST",
            crossDomain: true,
            context: self,         //we can't do closure with ajax event handler so we use context to keepref
            url: url,
            contentType: 'text/plain',
            timeout: 5000,
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, url, args)
            }, 
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                } else {
                    self.check_cert()
                }
            }
            
        });
    },
    
    check_cert: function () {
        if (typeof sslCertTrusted == 'undefined' || !sslCertTrusted){
            var msg = " Welcome to Vidjil! </br>"
                    + "Your browser currently does not recognize our SSL certificate. </br>"
                    + "To use the sample database, you need to accept this certificate and/or tag this website as a trusted one. </br>"
                    + "<a href='"+DB_ADDRESS+"'>Follow this link<a/>"
            console.log({"type": "popup", "msg": msg})
        }
    },
    
    display_result: function (result, url, args) {
        //rétablissement de l'adresse pour les futures requetes
        result = result.replace("DB_ADDRESS/", this.db_address);
        result = result.replace("action=\"#\"", "action=\""+url+"\"");
        
        try {
            var res = jQuery.parseJSON(result);
        }
        catch(err)
        {
            //affichage résultat
            this.display(result)
            this.url.push(url)
            
            //bind javascript
            this.init_ajaxform()
            
            //
            this.build_suggest_box()
            
            //
            this.fixed_header()
            
            return 0 ;
        }
        
        //hack redirection
        if (res.redirect){
            if (res.redirect == "back"){
                this.back()
            } else if (res.redirect == "reload"){
                this.reload()
            } else {
                this.call(res.redirect, res.args)
            }
        }
        
        //data file
        if (res.reads){
            m.parseJsonData(result, 100)
            m.loadGermline();
            m.initClones()
            this.load_analysis(args)
            this.last_file = args
            this.close()
            m.db_key = args
            return;
        }
        
        //analysis file
        if (typeof res.clones != "undefined" && typeof res.reads == "undefined" ){
            m.parseJsonAnalysis(result)
            m.initClones()
        }
        
        //TODO server need to return message priority too ( 0=console, 1=ok, 2=error)
        if (res.message) console.log({"type": "flash", "msg": "database : " + res.message , "priority": 1})
        
        return res

        if (this.url.length == 1) $("#db_back").addClass("inactive");
    },
    
    /* associe a un <form> un handler custom
     * /!\ les <form> ne sont pas présent au chargement de l'interface, ils apparaissent aprés des call ajax
     * */
    init_ajaxform: function () {
        var self = this
        
        //submit formulaire sans fichier
        if ( document.getElementById('data_form') ){
            //$('#data_form').on('submit',self.data_form ); //doesn't work :/
            
            $('#data_form').ajaxForm({
                type: "POST",
                cache: false,
                timeout: 5000,
                crossDomain: true,
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                xhrFields: {withCredentials: true},
                success: function (result) {
                    self.display_result(result, $(this).attr('action'))
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                    } else {
                        console.log({"type": "popup", "msg": request.responseText})
                    }
                }
            });
        }
        
        //login_form
        if ( document.getElementById('login_form') ){
            //$('#login_form').on('submit',self.login_form );
            
            $('#login_form').ajaxForm({
                type: "POST",
                cache: false,
                timeout: 5000,
                crossDomain: true,
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                xhrFields: {withCredentials: true},
                success: function (result) {
                    self.display_result(result, $(this).attr('action'))
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                    } else {
                        var nexts = $('#login_form').attr('action').split("&")
                        var next = "patient/index"
                        if ($('#login_form').attr('action').indexOf('register') != -1)
                            next = "user/info"
                        var args = {}
                        for (var i=0; i<nexts.length; i++){
                            var index = nexts[i].indexOf("_next")
                            if (index != -1){
                                next = nexts[i].substr(index)
                                next = next.replace("_next=", "")
                                next = decodeURIComponent(next)
                                if (next.split("?").length == 2){
                                    var tmp = next.split("?")[1].split("&") 
                                    for (var k in tmp){
                                        var tmp2 = tmp[k].split("=")
                                        args[tmp2[0]] = tmp2[1]
                                    }
                                }
                                next = next.split("?")[0]
                            }
                        }
                        console.log(args)
                        self.call(next, args)
                    }
                }
            });
        
        }

        
        //submit formulaire avec fichier
        if ( document.getElementById('upload_form') ){
            
            $('#upload_file').change(function (){
                var filename = $("#upload_file").val();
                var lastIndex = filename.lastIndexOf("\\");
                if (lastIndex >= 0) {
                    filename = filename.substring(lastIndex + 1);
                }
                $('#filename').val(filename);
            })
            
            $('#upload_form').ajaxForm({
                type     : "POST",
                cache: false,
                crossDomain: true,
                xhrFields: {withCredentials: true},
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                success  : function(result) {
                    var js = self.display_result(result)
                    if (typeof js.file_id != 'undefined'){
                        $(this).attr("action", "0")
                        var id = js.file_id
                        var fileSelect = document.getElementById('upload_file');
                        var files = fileSelect.files;
                        var data = new FormData();
                        
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            data.append('file', file, file.name);
                        }
                        data.append('id', id);
                        var filename = $('#filename').val()
                        self.uploader.add(id, data, filename)
                    }
                },
                error: function (request, status, error) {
                    if(status==="timeout") {
                        console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                    } else {
                        console.log({"type": "popup", "msg": request + " " + status + " " + error});
                    } 
                }
            });
            
        }  
        
    },
    
    /*reload the current db page*/
    reload: function(){
        if (this.url.length==0){
            this.call('patient/index')
        }else{
            url = this.url[this.url.length-1]
            this.callUrl(url)
        }
    },
    
    back: function(){
        if (this.url.length > 1){
            this.url.pop()
            url = this.url[this.url.length-1]
            this.callUrl(url)
            this.url.pop()
        }
    },
    
    
    /* appel une fonction du serveur
     * idem que call() mais la réponse n'est pas une page html a afficher
     * mais simplement une confirmation que la requete a été entendu
     */
    request: function (controller_name, args) {
        var self = this;

        //envoye de la requete ajax
        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: self.db_address + controller_name + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                console.log({"type": "flash", "msg": result , "priority": 1});
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                } else {
                    self.call("patient/index")
                }
            }
        });
    },

    /*récupére et initialise le browser avec un fichier .data
     * args => format json ( parametre attendu  > patient_id, config_id)
     */
    load_data: function (args, filename) {
        var self = this;
        
        var list = document.getElementById("last_loaded_file")
        var children = list.children
        
        var flag = false
        for (var i=0; i<children.length; i++){
            if (children[i].innerHTML == filename) flag = true 
        }
        
        if ( !flag){
            var a = document.createElement('a');
                    a.className="buttonSelector"
                    a.appendChild(document.createTextNode(filename));
                    a.onclick = function () {
                        self.load_data(args, filename)
                    }
                    list.appendChild(a);
        }
        
        if (m.analysisHasChanged){
            m.analysisHasChanged = false;
            console.log({"type": "popup",
                        "default" : "save_analysis",
                        "msg": "<div class=\'center\'> <button onclick=\'db.load_data("+JSON.stringify(args)+",\""+filename+"\")\'>Continue</button> "
                        +" <button onclick='console.closePopupMsg()'>Cancel</button> </div>",
                        "priority": 2});
            return
        }
        
        var url = document.documentURI.split('?')[0]
        var new_location = url+"?patient="+args.patient+"&config="+args.config
        window.history.pushState('plop', 'plop', new_location);
        
        $.ajax({
            type: "POST",
            timeout: 15000,
            crossDomain: true,
            url: self.db_address + "default/get_data" + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, "", args);
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "msg" : " - unable to access patient data" , "priority": 1});
                } else {
                    console.log({"type": "popup", "msg": request.responseText});
                }
            }
        });
    },
    
    //check every input field in the page with the given input_name
    //return the list of values selected 
    getListInput : function (input_name) {
        var list=[]
        $("input[name='"+input_name+"']").each(
            function () {
                if (this.checked) list.push(this.value)
            } 
        )
        return list
    },
    
    load_custom_data: function(args) {
        var self=this;
        if (m.analysisHasChanged){
            m.analysisHasChanged = false;
            console.log({"type": "popup", 
                        "default" : "save_analysis", 
                        "msg": "<div class=\'center\'> <button onclick=\'db.load_data("+JSON.stringify(args)+",\""+filename+"\")\'>Continue</button> "
                        +" <button onclick='console.closePopupMsg()'>Cancel</button> </div>"});
            return
        }
        
        if (typeof args == 'undefined'){
            args={}
            args["custom"] = this.getListInput("custom_result[]")
        }
        
        console.log("db : custom data "+list)
        
        var url = document.documentURI.split('?')[0]
        var arg = "?" + this.argsToStr(args)
        var new_location = url+arg
        window.history.pushState('plop', 'plop', new_location);
        
        this.m.wait("please wait : this operation can take a few minutes")
        $.ajax({
            type: "POST",
            timeout: 1200000,
            crossDomain: true,
            url: self.db_address + "default/get_custom_data" + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.m.resume()
                self.display_result(result, "", args);
            },
            error: function (request, status, error) {
                self.m.resume()
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "msg": " - unable to access patient data" , "priority": 1});
                } else {
                    console.log({"type": "popup", "msg": request.responseText});
                }
            }
        });
    },
    
    
    load_analysis: function (args) {
        var self = this;

        $.ajax({
            type: "POST",
            timeout: 15000,
            crossDomain: true,
            url: self.db_address + "default/get_analysis" + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result)
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "msg": " - unable to access patient data" , "priority": 1});
                } else {
                    console.log({"type": "popup", "msg": request.responseText});
                }
            }
        });
    },
    
    save_analysis: function () {
        var self = this;
        
        if (self.last_file == m.db_key){
            
            var analysis = m.strAnalysis()
            var blob = new Blob([analysis], {
                type: 'json'
            });
            var fd = new FormData();
            fd.append("fileToUpload", blob);
            
            $.ajax({
                type: "POST",
                timeout: 15000,
                crossDomain: true,
                url: self.db_address + "default/save_analysis" + "?" + this.argsToStr(self.last_file),
                data     : fd,
                processData: false,
                contentType: false,
                xhrFields: {withCredentials: true},
                success: function (result) {
                    try {
                        var res = jQuery.parseJSON(result);
                        if (res.message) console.log({"type": "flash", "msg": "database : " + res.message  , "priority": 1});
                        self.m.analysisHasChanged = false
                    }
                    catch(err){}
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        console.log({"type": "flash", "default" : "database_timeout", "msg": " - unable to save analysis" , "priority": 2});
                    } else {
                        console.log({"type": "flash", "msg": "server : save analysis error : "+request.responseText , "priority": 2});
                    }
                }
            });
        }else{
            console.log({"type": "flash", "msg": "server : save analysis error : this file is nor from the database" , "priority": 2});
        }
    },
    
    //affiche la fenetre de dialogue avec le serveur et affiche ses réponses
    display: function (msg) {
        this.div.style.display = "block";
        this.msg.innerHTML = msg;
            
        this.uploader.display()
    },

    //efface et ferme la fenetre de dialogue avec le serveur
    close: function () {
        this.div.style.display = "none";
        this.msg.innerHTML = "";
    },
    
    fixed_header: function () {
        var header = $("#table > thead").clone();
        var fixedHeader = $("#db_fixed_header").append(header);
        
        $("#db_table_container").bind("scroll", function() {
            var offset = $(this).scrollTop();

            fixedHeader.css("top", offset)

        });
    },
    
    user_rights: function (value, name, right, id) {
        
        var arg = {}
        arg.value = value       //true > add right  || false > remove right
        arg.name = name         //on what the right apply (patient / file / config)
        arg.right = right       //kind of write (create / delete / run)
        arg.id = id             //user id 
       
        this.call('user/rights', arg)
    },
    
    build_suggest_box: function() {
        var self = this
        
        if (document.getElementById("pcr")){
            var url = self.db_address+"file/pcr_list"
            $.ajax({
                type: "POST",
                crossDomain: true,
                url: url,
                success: function (result) {
                    var res = jQuery.parseJSON(result);
                    suggest_box("pcr", res.pcr)
                }
            });
        }
        
        if (document.getElementById("sequencer")){
            var url = self.db_address+"file/sequencer_list"
            $.ajax({
                type: "POST",
                crossDomain: true,
                url: url,
                success: function (result) {
                    var res = jQuery.parseJSON(result);
                    suggest_box("sequencer", res.sequencer)
                }
            });
        }
        
        if (document.getElementById("producer")){
            var url = self.db_address+"file/producer_list"
            $.ajax({
                type: "POST",
                crossDomain: true,
                url: url,
                success: function (result) {
                    var res = jQuery.parseJSON(result);
                    suggest_box("producer", res.producer)
                }
            });
        }
    },
    
    argsToStr : function (args) {
        var str = ""
        
        for (var key in args) {
            if (args[key] instanceof Array){
                for (var i=0; i<args[key].length; i++){
                    str += key + "=" + args[key][i] + "&";
                }
            }else{
                str += "" + key + "=" + args[key] + "&";
            }
        }
        
        return str
    },
    
    strToArgs : function (str) {
        args = {}
        var tmp = str.split('&')
        
        for (var i=0; i<tmp.length; i++){
            if (tmp[i].length > 0){
                var tmp2 = tmp[i].split('=')
                
                if (tmp2[0] in args){
                    if (args[tmp2[0]] instanceof Array){
                        args[tmp2[0]].push(tmp2[1])
                    }else{
                        args[tmp2[0]]=[args[tmp2[0]],tmp2[1]]
                    }
                }else{
                    args[tmp2[0]]=tmp2[1]
                }
            }
        }
        
        return args
    }
    
}

function Uploader() {
    var self = this
    this.queue = {}
    this.max_upload = 2 //max simultaneous upload allowed
    
    setInterval(function(){
        if (self.is_uploading){
            self.update_percent()
        }
    },200)

}

Uploader.prototype = {
    
    //add an upload to the queue
    add : function (id, data, filename) {
        var div_parent = $("#upload_summary_selector").children()[0]
        var div = $('<div/>').appendTo(div_parent);
        
        this.queue[id] = {
            "id" : id, 
            "data" : data, 
            "filename" : filename, 
            "status" : "queued",
            "percent" : 0,
            "div" : div
        } 
        this.display_summary()
        this.next()
    },
    
    //find the next file to upload in the queue and check if we can start it
    next : function () {
        var upload_in_progress = 0
        var next_upload = -1
        
        for (var key in this.queue){
            if (this.queue[key].status == "queued" && next_upload == -1) next_upload = key
            if (this.queue[key].status == "upload") upload_in_progress++
        }
        
        if (upload_in_progress < this.max_upload && next_upload != -1) 
            this.upload_file(next_upload)
    },
    
    //
    upload_file : function (id) {
        var self = this;
        
        var url = db.db_address + "file/upload"
        //url = url.replace("https://", "http://");
        $.ajax({
            xhr: function(){
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function(evt){
                    if (evt.lengthComputable) {
                        var percentComplete = Math.floor((evt.loaded / evt.total)*100)
                        self.queue[id].percent = percentComplete
                        if (percentComplete == 100) {
                            self.queue[id].status = "server_check"
                            self.display()
                        }
                    }
                }, false);
                return xhr;
            },
            type: "POST",
            cache: false,
            crossDomain: true,
            url: url,
            processData: false,
            contentType: false,
            data: self.queue[id].data,
            xhrFields: {withCredentials: false},
            beforeSend: function(jqxhr){
                self.queue[id].status = "upload"
                self.queue[id].jqXHR = jqxhr
            },
            success: function (result) {
                self.queue[id].status = "completed"
                self.next()
                self.reload(id)
                db.display_result(result, url)
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                } else {
                    if (status !== "abort"){
                        self.queue[id].status = "upload_error"
                        console.log({"type": "flash", "msg": "upload " + self.queue[id].filename + " : " + status , "priority": 2});
                    }
                }
                self.display();
            }
        });
    },
    
    cancel: function (id) {
        console.log({"type": "flash", "msg": "cancel upload : " + this.queue[id].filename, "priority": 1});
        this.queue[id].jqXHR.abort()
        this.queue[id].status = "canceled"
        this.reload(id)
    },
    
    retry : function (id) {
        this.queue[id].status = "queued"
        this.next()
        this.reload(id)
    },
    
    //reload page if neccesary
    reload : function (id) {
        var status = this.queue[id].status
        if ( document.getElementById("sequence_file_"+id) ){
            db.reload()
        }
        this.display_summary()
    },
    
    update_percent : function () {
        for (var key in this.queue){
            if ( this.queue[key].status == "upload"){
                $(".loading_"+key).width(this.queue[key].percent+"%")
            }
        }
    },
    
    display : function () {
        if ($("#table_container")){
            
            for (var key in this.queue){
                var status = this.queue[key].status

                var html = this.statusHtml(key)
                
                if (status != "completed") $("#sequence_file_"+key).html(html)
            }
        }
        this.display_summary()
    },
    
    display_summary : function () {
        
        if (this.is_uploading()){
            $("#upload_summary").css("display","block")
            $("#upload_summary_label").html("<span class='loading_seq'>upload list</span>")
        }else{
            $("#upload_summary_label").html("<span class='loading_status'>upload list</span>")
        }
        
        for (var key in this.queue){
            var status = this.queue[key].status
            
            var html = "<span class='summary_filename'>" + this.queue[key].filename + "</span>"
                html += this.statusHtml(key)
            
            if (status == "completed") html += "<span class='loading_status'> completed </span>"
            this.queue[key].div.html(html)
        }
    },
    
    statusHtml : function (id) {
        var status = this.queue[id].status
        
        var html = ""
        
        switch(status) {
            case "queued":
                html += "<span class='loading_seq'>queued</span> "
                html += "<span class='button' onclick='db.uploader.cancel("+id+")'>cancel</span>"
                break;
            case "upload":
                html += "<span class='loading_gauge'><span class='loading_"+id+" loading_bar'></span></span> "
                html += "<span class='button' onclick='db.uploader.cancel("+id+")'>cancel</span>"
                break;
            case "server_check":
                html += "<span class='loading_seq'>server check</span>"
                break;
            case "canceled":
                html += "<span class='loading_status'> canceled by user </span>"
                html += "<span class='button' onclick='db.uploader.retry("+id+")'>try again</span>"
                break;
            case "upload_error":
                html += "<span class='loading_status'> upload failed </span>"
                html += "<span class='button' onclick='db.uploader.retry("+id+")'>try again</span>"
                break;
        }
        
        return html
    },
    
    is_uploading : function () {
        for (var key in this.queue){
            var status = this.queue[key].status 
            if (status == "upload" || status == "queued" || status == "server_check") return true
        }
        return false
    }
}



/*crée une liste de suggestion dynamique autour d'un input text*/
function suggest_box(id, list) {

    list = list.sort()
    var input_box = document.getElementById(id)
    
    //positionnement d'une boite vide pour contenir les suggestions
    var suggest_box = document.createElement('div')
    suggest_box.className = "suggest_box"
    suggest_box.style.width = getComputedStyle(input_box,null).width
    
    var suggest_list = document.createElement('div')
    suggest_list.className = "suggest_list"
    suggest_box.appendChild(suggest_list)
    
    var suggest_arrow = document.createElement('div')
    suggest_arrow.className = "suggest_arrow"
    suggest_arrow.title = "show all suggestions"
    suggest_arrow.onclick = function(){
        suggest_list.style.display = "block"
        suggest_list.innerHTML=""
        input_box.focus()
        for (var i=0; i<list.length; i++){
            var suggestion = document.createElement("div")
            suggestion.className = "suggestion"
            suggestion.appendChild(document.createTextNode(list[i]))
            suggestion.onclick = function(){
                input_box.value = this.innerHTML
                setTimeout(function(){suggest_list.style.display = "none"}, 200)
            }
            suggest_list.appendChild(suggestion)
        }
    }
    suggest_box.appendChild(suggest_arrow)
    
    //ajout de la suggest_box apres l'input correspondant
    if (input_box.nextSibling) {
        input_box.parentNode.insertBefore(suggest_box, input_box.nextSibling);
    }else{
        input_box.parentNode.appendChild(suggest_box)
    }
    
    //réactualise la liste a chaque changement d'input
    input_box.onkeyup = function(){
        suggest_list.style.display = "block"
        suggest_list.innerHTML=""
        var value = this.value.toUpperCase();
        var count = 0
        for (var i=0; i<list.length; i++){
            if (list[i].toUpperCase().indexOf(value) != -1){
                var suggestion = document.createElement("div")
                suggestion.className = "suggestion"
                suggestion.appendChild(document.createTextNode(list[i]))
                suggestion.onclick = function(){
                    input_box.value = this.innerHTML
                    setTimeout(function(){suggest_list.style.display = "none"}, 200)
                }
                suggest_list.appendChild(suggestion)
                count++
            }
        }
    };
    
    //masque la liste
    input_box.onblur = function(){
        setTimeout(function(){suggest_list.style.display = "none"}, 200)
    };
}
