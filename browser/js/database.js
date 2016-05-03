DB_ADDRESS = ""
DB_TIMEOUT_CALL = 10000               // Regular call
DB_TIMEOUT_GET_DATA = 15000           // Get patient/sample .data
DB_TIMEOUT_GET_CUSTOM_DATA = 1200000  // Launch custum fused sample .data
NOTIFICATION_PERIOD = 30000			  // Time interval to check for notifications periodically


/**
 * 
 * @class Database
 * @constructor 
 * @param {Model} model
 * @param {string} address
 * */
function Database(model, address) {
    var self = this;
    
    //check if a default address is available in config.js
    if (typeof config != 'undefined' && config.use_database != undefined && config.use_database) {
        if (config.db_address) { DB_ADDRESS = config.db_address}
        
        //if adress is set to default => use the same location as the browser
        if (config.db_address == "default") DB_ADDRESS = "https://"+window.location.hostname+"/vidjil/"
    }
    
    //use address given in parameter
    if (typeof address != "undefined"){ DB_ADDRESS = address }
    
    
    if (DB_ADDRESS != ""){
        var fileref=document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", DB_ADDRESS + "static/js/checkSSL.js")
        document.getElementsByTagName("head")[0].appendChild(fileref)
        
        this.db_address = DB_ADDRESS;
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
    
    /**
     * build the window used to display server database page 
     * */
    build: function () {
        var self = this;
        
        this.div = document.createElement("div")
        this.div.className = "db_div";
        
        var close_popup = document.createElement("span")
        close_popup.onclick = function(){
            self.close();
        }
        close_popup.className = "closeButton"
        close_popup.appendChild(icon('icon-cancel', ''));
        this.msg = document.createElement("div")
        this.msg.className = "db_msg";
        
        this.div.appendChild(close_popup)
        this.div.appendChild(this.msg)
        
        document.body.appendChild(this.div);
    },
    
    /**
     * check ssl certificate validity  
     * */
    check_cert: function () {
        if (typeof sslCertTrusted == 'undefined' || !sslCertTrusted){
            var msg = " Welcome to Vidjil! </br>"
                    + "Your browser currently does not recognize our SSL certificate. </br>"
                    + "To use the sample database, you need to accept this certificate and/or tag this website as a trusted one. </br>"
                    + "<a href='"+DB_ADDRESS+"'>Follow this link<a/>"
            console.log({"type": "popup", "msg": msg})
        }
    },

    get_contamination : function() {
        var self=this;
        
        self.callProcess('default/run_contamination', 
                        {"sequence_file_id":self.m.samples.sequence_file_id,
                         "config_id":self.m.samples.config_id,
                         "results_file_id":self.m.samples.results_file_id,
                     }, function(a){
                         self.m.contamination=jQuery.parseJSON(a);
                         report.reportcontamination()
                     })
    },
    
     /**
      * request a side process to the server
      * check if the process is done at regular interval and trigger callback
      * */
     callProcess : function (page, args, callback){
         var self=this;
         
         var arg = "";
         if (typeof args != "undefined" && Object.keys(args).length) 
             var arg = this.argsToStr(args)
         
         var url = self.db_address + page + "?" + arg
         if (page.substr(0,4).toLowerCase() == "http") {
             url = page + arg
         }
         
         $.ajax({
             type: "POST",
             crossDomain: true,
             context: self,
             url: url,
             contentType: 'text/plain',
             timeout: DB_TIMEOUT_CALL,
             xhrFields: {withCredentials: true},
             success: function (result) {
                 result = jQuery.parseJSON(result)
                 setTimeout(function(){ self.waitProcess(result.processId, 5000, callback)}, 5000);
             }, 
             error: function (request, status, error) {
                 if (status === "timeout") {
                     console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                 } else {
                     self.check_cert()
                 }
                 self.warn("callProcess: " + status + " - " + url.replace(self.db_address, '') + "?" + this.argsToStr(args))
             }
         });
     },
     
     /**
     * check if a server process is done(recursive)
     * */
     waitProcess: function (processId, interval, callback){
         console.log("... " +processId)
         var self=this;
         var url = self.db_address + "default/checkProcess?processId="+processId;
         
         $.ajax({
             type: "POST",
             crossDomain: true,
             context: self,
             url: url,
             contentType: 'text/plain',
             timeout: DB_TIMEOUT_CALL,
             xhrFields: {withCredentials: true},
             success: function (result) {
                 result = jQuery.parseJSON(result)
                 if (result.status == "COMPLETED"){
                     callback(result.data);
                 }else if(result.status == "FAILED"){
                     console.log({"type": "flash", "msg": "process failed", "priority": 1});
                 }else{
                     setTimeout(function(){ self.waitProcess(processId, interval, callback); }, interval); 
                 }
                 
             }, 
             error: function (request, status, error) {
                 if (status === "timeout") {
                     console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                 } else {
                     self.check_cert()
                 }
                 self.warn("waitProcess: " + status )
             }
         });
     },

    /** 
     * call a server page
     * @param {string} page - name of the server page to call
     * @param {object} args - parameters ({ "name_arg1" : "arg1", ... })
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
    
    /** 
     * display a given url inside the window
     * @param {string} url - name of the server page to call
     * @param {object} args - parameters ({ "name_arg1" : "arg1", ... })
     * */
    callUrl : function (url, args){
        var self=this;
        
        $.ajax({
            type: "POST",
            crossDomain: true,
            context: self,         //we can't do closure with ajax event handler so we use context to keepref
            url: url,
            contentType: 'text/plain',
            timeout: DB_TIMEOUT_CALL,
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

		self.warn("callUrl: " + status + " - " + url.replace(self.db_address, '') + "?" + this.argsToStr(args))
            }
            
        });
    },
    
    
    pre_process_onChange : function () {
        var field = document.getElementById("pre_process");
        var value = field.value;
        for (var i=0; i<field.options.length; i++){
            var option = field.options[i];
            if (value == option.value){
                if (option.getAttribute("data-file") == "1"){
                    document.getElementById("file2_field").style.display = 'none';
                    document.getElementById("upload_file2").value=""
                }else{
                    document.getElementById("file2_field").style.display = '';
                }
            }
        }        
    },
    
    /**
     * callback function for callURL() <br>
     * parse the result and depending on the case display the result as an html page or a flash message or ...
     * @param {string} result - can be html or json string
     * @param {string} url - the url who has returned this result
     * @param {object} args - parameters used with the url
     * */
    display_result: function (result, url, args) {
        //rétablissement de l'adresse pour les futures requetes
        result = result.replace("DB_ADDRESS/", this.db_address);
        result = result.replace("action=\"#\"", "action=\""+url+"\"");
        
        try {
            var res = jQuery.parseJSON(result);
        }
        catch(err)//it's not a json so we just display the result as an html page
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
            
            // New page displayed, attempt to display header and login notifications
            this.loadNotifications();

            $("#menu-container").addClass('disabledClass');

            return 0 ;
        }
        
        //the json result contain a hack redirection
        if (res.redirect){
            if (res.redirect == "back"){
                this.back()
            } else if (res.redirect == "reload"){
                this.reload()
            } else {
                this.call(res.redirect, res.args)
            }
        }
        
        //the json result look like a .vidjil file so we load it
        if (res.reads){
            m.parseJsonData(result, 100)
            m.initClones()
            m.loadGermline();
            this.load_analysis(args)
            this.last_file = args
            this.close()
            m.db_key = args
            return;
        }
        
        //the json result look like a .analysis file so we load it
        if (typeof res.clones != "undefined" && typeof res.reads == "undefined" ){
            m.parseJsonAnalysis(result)
            m.initClones()
        }

        //the json result contain a flash message
        if (res.message) {
	    priority = res.success == 'false' ? 2 : 1
	    priority = typeof res.priority == 'undefined' ? priority : res.priority
	    console.log({"type": "flash",
                         "msg": "database : " + res.message,
                         "priority": priority}) // res.success can be 'undefined'
	}
        return res

        
        if (this.url.length == 1) $("#db_back").addClass("inactive");
    },
    
    /** 
     * link html forms to their coresponding ajax handler 
     * */
    init_ajaxform: function () {
        var self = this
        
        //submit formulaire sans fichier
        if ( document.getElementById('data_form') ){
            //$('#data_form').on('submit',self.data_form ); //doesn't work :/
            
            $('#data_form').ajaxForm({
                type: "POST",
                cache: false,
                timeout: DB_TIMEOUT_CALL,
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
                timeout: DB_TIMEOUT_CALL,
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
                        var next = "default/home"
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
            
            db.pre_process_onChange()
            
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
                            if( document.getElementById("upload_file").files.length != 0 ){
                            var fileSelect = document.getElementById('upload_file');
                            var files = fileSelect.files;
                            var data = new FormData();
                            
                            for (var i = 0; i < files.length; i++) {
                                var file = files[i];
                                data.append('file', file, file.name);
                            }
                            data.append('id', id);
                            data.append('file_number', 1)
                            data.append('pre_process', document.getElementById('pre_process').value)
                            var filename = $('#filename').val()
                            self.uploader.add(id, data, filename, 1)
                        }
                        
                        if( document.getElementById("upload_file2").files.length != 0 ){
                            var fileSelect = document.getElementById('upload_file2');
                            var files = fileSelect.files;
                            var data2 = new FormData();
                            
                            for (var i = 0; i < files.length; i++) {
                                var file = files[i];
                                data2.append('file', file, file.name);
                            }
                            data2.append('id', id);
                            data2.append('file_number', 2)
                            data2.append('pre_process', document.getElementById('pre_process').value)
                            self.uploader.add(id+"_2", data2, filename, 2)
                        }
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
    
    /**
     * reload the current db page
     * */
    reload: function(){
        if (this.url.length==0){
            this.call('default/home')
        }else{
            url = this.url[this.url.length-1]
            this.callUrl(url)
        }
    },
    
    /**
     * return to the previous loaded page
     * */
    back: function(){
        if (this.url.length > 1){
            this.url.pop()
            url = this.url[this.url.length-1]
            this.callUrl(url)
            this.url.pop()
        }
    },
    
    
    /**
     * appel une fonction du serveur
     * idem que call() mais la réponse n'est pas une page html a afficher
     * mais simplement une confirmation que la requete a été entendu
     */
    request: function (controller_name, args, quiet) {
        var self = this;

	var url = controller_name + "?" + this.argsToStr(args);

        //envoye de la requete ajax
        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_CALL,
            crossDomain: true,
            url: self.db_address + url,
            xhrFields: {withCredentials: true},
            success: function (result) {
                if (typeof quiet == 'undefined')
                console.log({"type": "flash", "msg": result , "priority": 1});
            },
            error: function (request, status, error) {
                if (typeof quiet == 'undefined')
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
                } else {
                    self.call("default/home")
                }

                if (typeof quiet == 'undefined') {
		    // This triggers another request() call, but this time with quiet=true
		    self.warn("request: " + status + " - " + url)
		}
            }
        });
    },

    /*récupére et initialise le browser avec un fichier .data
     * args => format json ( parametre attendu  > patient_id, config_id)
     * filename => patient name used in the patient menu for the previous visited patients
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
        if (typeof args.sample_set_id != "undefined")
            var new_location = url+"?sample_set_id="+args.sample_set_id+"&config="+args.config
        if (typeof args.patient != "undefined")
            var new_location = url+"?patient="+args.patient+"&config="+args.config
        window.history.pushState('plop', 'plop', new_location);
        
        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_GET_DATA,
            crossDomain: true,
            url: self.db_address + "default/get_data" + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, "", args);
                console.log('=== load_data: success ===');
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "msg" : " - unable to access patient data" , "priority": 2});
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
        
        this.m.wait("Comparing samples...")
        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_GET_CUSTOM_DATA,
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
                    console.log({"type": "flash", "default" : "database_timeout", "msg": " - unable to access patient data" , "priority": 2});
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
                console.log('=== load_analysis: success ===');
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    console.log({"type": "flash", "default" : "database_timeout", "msg": " - unable to access patient data" , "priority": 2});
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
            fd.append("info", self.m.info);
            fd.append("samples_info", self.m.samples.info);
            fd.append("samples_id", self.m.samples.ids);
            
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

    // periodically query the server for notifications
    // And loads them into elements with id 'header_messages' and 'login_messages'
	// TODO : Tidy up
    loadNotifications: function() {
    	var self = this;
		if (DB_ADDRESS != "") {
			$.ajax({
		        type: "GET",
		        crossDomain: true,
		        url: DB_ADDRESS + 'notification/get_active_notifications',
                        xhrFields: {withCredentials: true},
		        timeout: DB_TIMEOUT_CALL,
		        success: function (result) {
		        	var messages;
		        	try {
		        		messages = JSON.parse(result);
		        		var header_messages = [];
		        		var login_messages = [];
		        		for (var i = 0; i < messages.length; ++i) {
		        			if (messages[i]['notification']['message_type'] == 'header') {
		        				header_messages.push(messages[i]);
		        			} else if (messages[i]['notification']['message_type'] == 'login') {
		        				login_messages.push(messages[i]);
		        			}
		        		}
		        		
		        		//TODO see if we can remove this hard coupling to classes
		        		var hm = $('#header_messages');
			        	self.integrateMessages(hm, header_messages);

			        	var lm = $('#login_messages');
			        	self.integrateMessages(lm, login_messages);
			        
		        	} catch (err) {
		        		console.log("ERROR: " + err);
		        	}
		            
		        }, 
		        error: function (request, status, error) {
		            if (status === "timeout") {
		                console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
		            } else {
		                console.log("unable to get notifications");
		                console.log(DB_ADDRESS + url + ": " + error);
		            }
		        }
		    });
		} else {
			console.log("Database has not been initialised");
		}
	},

	// takes a jQuery elem
	integrateMessages: function(elem, messages, classNames) {
		var message, preformat;
		// empty container because prototype is destined to be called periodically
		elem.empty();

		//set default classes if they are undefined
		classNames = classNames === undefined ? {'urgent': 'urgent_message', 'info': 'info_message'} : classNames;

		if (messages.length > 0) {
			for (var i=0; i < messages.length; ++i) {

                                display_title = ""
                                if (messages[i]['notification']['message_type'] == 'login')
                                {
                                    display_title += messages[i]['notification']['creation_datetime'].split(' ')[0] + ' : '
                                }
                                display_title += messages[i]['notification']['title']

				message = document.createElement('div');
				message.className = classNames[messages[i]['notification']['priority']] + " notification";
				$(message).attr('onclick', "db.call('notification/index', {'id': '" + messages[i]['notification']['id'] + "'})");

				$(message).append(
					// message is sanitized by the server so we unescape the string to include links and formatting
					document.createTextNode(unescape(display_title))
				);
				elem.append(message);
			}
			elem.fadeIn();
    	} else {
    		// No messages to display so hide message container
    		elem.fadeOut();
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
        $('#menu-container').removeClass('disabledClass');
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
    
    
    updateList: function(that) {
        var lastValue = that.lastValue,
            value = that.value,
            array = [],
            pos = value.indexOf('|'),
            start = that.selectionStart,
            end = that.selectionEnd,
            options;

        if (that.options) {
            options = that.options;
        } else {
            options = Object.keys(that.list.options).map(function (option) {
                return that.list.options[option].value;
            });
            that.options = options;
        }

        if (lastValue !== value && value.length>1) {
            that.list.innerHTML = options.filter(function (a) {
                return ~a.toLowerCase().indexOf(value.toLowerCase());
            }).slice(0,10).map(function (a) {
                return '<option value="' + value + '|' + a + '">' + a + '</option>';
            }).join();
            this.updateInput(that);
            that.lastValue = value;
        }
    },

    updateInput: function(that) {
        var value = that.value,
            pos = value.indexOf('|'),
            start = that.selectionStart,
            end = that.selectionEnd;

        if (~pos) {
            value = value.slice(pos + 1);
        }
        that.value = value;
        if (that.lastValue !== value){
            that.options.indexOf(value)!= -1 ? that.style.color = "green" : that.style.color = "red";
        }
        that.setSelectionRange(start, end);
    },
    
    build_suggest_box: function() {
        var self = this
        
        if (document.getElementById("patient_list")){
            
            document.getElementById('patient_list').addEventListener('keyup', function (e) {
                self.updateList(this);
            });
            document.getElementById('patient_list').addEventListener('input', function (e) {
                self.updateInput(this);
            });
            document.getElementById('run_list').addEventListener('keyup', function (e) {
                self.updateList(this);
            });
            document.getElementById('run_list').addEventListener('input', function (e) {
                self.updateInput(this);
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
    },

    // Log functions, to server
    // 'quiet' is set to true to avoid infinite loops with timeouts
    log : function (lvl, msg) { this.request('default/logger', {'lvl': lvl, 'msg': msg}, true) },
    debug:    function(msg) { this.log(10, msg) },
    info:     function(msg) { this.log(20, msg) },
    warn:     function(msg) { this.log(30, msg) },
    error:    function(msg) { this.log(40, msg) },
    critical: function(msg) { this.log(50, msg) }
    
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
    add : function (id, data, filename, file_number) {
        var div_parent = $("#upload_summary_selector").children()[0]
        var div = $('<div/>').appendTo(div_parent);
        
        this.queue[id] = {
            "id" : id, 
            "data" : data, 
            "filename" : filename, 
            "file_number" :file_number,
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
                db.info("upload completed - " + self.queue[id].filename)
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
                        db.warning("upload may have failed - " + self.queue[id].filename)
                        self.queue[id].status = "upload_error"
                        console.log({"type": "flash", "msg": "upload " + self.queue[id].filename + " : " + status , "priority": 2});
                    }
                }
                self.display();
            }
        });
    },
    
    cancel: function (id) {
        db.warning("upload canceled - " + this.queue[id].filename)
        console.log({"type": "flash", "msg": "upload canceled : " + this.queue[id].filename, "priority": 1});
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
            $("#upload_summary_label").html("<span class='loading_seq'>uploading</span>")
        }else{
            $("#upload_summary_label").html("<span class='loading_status'>uploads</span>")
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
                html += "<span class='loading_seq'> processing file </span>"
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

