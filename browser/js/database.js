DB_ADDRESS = ""
DB_TIMEOUT_CALL = 60000               // Regular call
DB_TIMEOUT_GET_DATA = DB_TIMEOUT_CALL           // Get patient/sample .data
DB_TIMEOUT_GET_CUSTOM_DATA = 1200000  // Launch custum fused sample .data

var SEQ_LENGTH_CLONEDB = 40; // Length of the sequence retrieved for CloneDB

/**
 * 
 * @class Database
 * @constructor 
 * @param {Model} model
 * @param {string} address
 * */
function Database(model, address) {
    var self = this;
    this.uploader = new Uploader()
    
    //check if a default address is available in config.js
    if (typeof config !== 'undefined' && config.use_database !== undefined && config.use_database) {
        if (config.db_address) { DB_ADDRESS = config.db_address}
        
        //if adress is set to default => use the same location as the browser
        if (config.db_address == "default") DB_ADDRESS = "https://"+window.location.hostname+"/vidjil/"
    }
    
    //use address given in parameter
    if (typeof address != "undefined"){ DB_ADDRESS = address }
    
    
    if (DB_ADDRESS !== ""){
        // var fileref=document.createElement('script')
        // fileref.setAttribute("type","text/javascript")
        // fileref.setAttribute("src", DB_ADDRESS + "static/js/checkSSL.js")
        // document.getElementsByTagName("head")[0].appendChild(fileref)
        
        this.db_address = DB_ADDRESS;
        this.upload = {};
        this.url = []
        this.m = model
        this.build()
        this.m.db = this
        
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

        this.connected = undefined;
        
        document.body.appendChild(this.div);
    },

    /**
     * @return - true iff the last connection was successful
     *         - false if not
     *         - undefined if no connection was attempted yet
     */
    is_connected: function() {
        return this.connected;
    },
    
    /**
     * check ssl certificate validity  
     * */
    check_cert: function () {
        if (typeof sslCertTrusted == 'undefined' || !sslCertTrusted){
            var msg = " Welcome to Vidjil! </br>" +
                "Your browser currently does not recognize our SSL certificate. </br>" +
                "To use the sample database, you need to accept this certificate and/or tag this website as a trusted one. </br>" +
                "<a href='"+DB_ADDRESS+"'>Follow this link<a/>"
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

    get_read: function(window, clone_id, sequence_file_id) {
	var self = this;
        var log = "Reads will be exported in a few minutes. You will be able to download them when they are ready. You can continue using the application.";
        console.log({"type": "flash", "msg" : log, "priority": 2});
	self.callProcess('default/run_request',
			 {'sequence_file_id': sequence_file_id,
			  'sample_set_id': self.m.sample_set_id,
			  'config_id': self.m.db_key.config,
			  'grep_reads': window},
			 function(a) {
				// Link to result file and launch download
                             var file_name = "reads__"+clone_id+"__file_id_"+"_"+sequence_file_id+".fa"
                             var path_data = DB_ADDRESS+"/default/download/"+a.data_file+"?filename="+file_name
                             var anchor = document.createElement('a');
                             anchor.setAttribute("download", file_name);
                             anchor.setAttribute("href",     path_data);
                             anchor.style = 'display: none';
                             self.ajax_indicator_stop()
                             document.body.appendChild(anchor);
                             anchor.click();
                             document.body.removeChild(anchor);
			 });
    },

    
     /**
      * request a side process to the server
      * check if the process is done at regular interval and trigger callback
      * */
     callProcess : function (page, args, callback){
         var self=this;
         this.temporarilyDisableClickedLink();

         var arg = "";
         if (typeof args != "undefined" && Object.keys(args).length) 
             arg = this.argsToStr(args)
         
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
                 self.connected = true;
             }, 
             error: function (request, status, error) {
                self.error_log(request, status, error, name="callProcess", url=url, msg=undefined, args=args, type="flash") 
             }
         });
     },
     
     /**
     * check if a server process is done(recursive)
     * */
     waitProcess: function (processId, interval, callback){
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
                 self.connected = true;
                 console.log(result);
                 result = jQuery.parseJSON(result)
                 if (result.status == "COMPLETED"){
                     callback(result.data);
                 }else if(result.status == "FAILED"){
                     console.log({"type": "flash", "msg": "process failed:" + ((typeof result.message !== 'undefined') ? result.message: ''), "priority": 1});
                 }else{
                     setTimeout(function(){ self.waitProcess(processId, interval, callback); }, interval); 
                 }
                 
             }, 
             error: function (request, status, error) {
                self.error_log(request, status, error, name="waitProcess", url=this.url, msg=undefined, args=undefined, type="flash")
             }
         });
     },

    /** 
     * call a server page
     * @param {string} page - name of the server page to call
     * @param {object} args - parameters ({ "name_arg1" : "arg1", ... })
     * */
    call: function (page, args) {
        var self = this;
        this.temporarilyDisableClickedLink()
        
        var url = self.db_address + page
        if (page.substr(0,4).toLowerCase() == "http") {
            url = page
        }
        var arg = "";
        if (typeof args != "undefined" && Object.keys(args).length) {
            arg = this.argsToStr(args)
            url += "?" + arg;
        }

        //hack to process both web2py and py4web redirected url
        url = url.replace("vidjil/vidjil", "vidjil")
        url = url.replace("vidjil//vidjil", "vidjil")
        
        this.callUrl(url, args)
    },
    
    /** 
     * display a given url inside the window
     * @param {string} url - name of the server page to call
     * @param {object} args - parameters ({ "name_arg1" : "arg1", ... })
     * */
    callUrl : function (url, args){
        var self=this;

        this.m.loading_is_pending = true
        this.m.updateIcon()

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
                self.connected = true;
                self.m.loading_is_pending = false
                self.m.updateIcon()
            }, 
            error: function (request, status, error) {
                self.error_log(request, status, error, name="callUrl", url=url, msg=undefined, args=args, type="flash")
                this.m.loading_is_pending = false
                this.m.updateIcon()
            }
            
        });
    },

    /**
     * error_log; Function launched when a request failed. 
     * Search reason of fail (timeout, unavailable db server, internal server error)
     * Log reason on error, called url and args, open a flash/popup (optional)
     * request, status, error: values given by ajax in case of fail
     * name: name of the function/component calling request
     * msg: optional; a message to log instead of default url/args values
     * url: url called; cleaned of db adress
     * args: args added to called url
     * type: type of log printed (flash; popup or undefined)
     */
    error_log: function(request, status, error, name, url, msg=undefined, args=undefined, type="flash", quiet=true){
        if (status === "timeout") {
            console.log({"type": "flash", "default" : "database_timeout", "priority": 2});
        } else {
            // this.check_cert()
            console.default.log(request.statusText)
        }

        if (quiet == undefined){
            this.warn(name +": " + status + " - " + url.replace(this.db_address, '') + "?" + args != undefined ? this.argsToStr(args) : "")
        }

        if (type != undefined){
            url = url.replace(this.db_address, '') + "?" + this.argsToStr(args)
            text = msg !== undefined ? msg : `An error occured (${request.statusText}; code ${request.status})` //<br/>URL called: ${url}` // limit url to admin ?
            console.log({"type": type, "msg": text, "priority": 2});
        }
    },

    callUrlJson : function(url, args) {
        var self=this;

        $.ajax({
            type: "POST",
            crossDomain: true,
            url: url,
            data: {'data': JSON.stringify(args)},
            timeout: DB_TIMEOUT_CALL,
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, url, args)
                self.connected = true;
            },
            error: function (request, status, error) {
                self.error_log(request, status, error, name="callUrlJson", url, msg=undefined, args, type=undefined)
            }

        });

    },

    callLinkable: function (linkable) {
        var href = linkable.attr('href');
        var type = linkable.data('linkable-type');
        var param = linkable.data('linkable-target-param');
        var name = linkable.data('linkable-name');
        var sample_type = linkable.data('sample-type');
        var args = {};
        args[type] = name;
        args[param] = name;
        args.type = sample_type;
        this.call(href, args);
    },


    /**
     * Send the given clones to CloneDB
     * @param {int list} clones - list of clones (if undefined, call on all clones)
     * */
    callCloneDB: function(clones, callback) {

        if (typeof clones === 'undefined')
        {
            clones = Array.apply(null, Array(this.m.clones.length)).map(function (_, i) {return i;});
        }

        console.log("Send to cloneDB: " + clones)
        var windows = [];
        var self = this;
        var kept_clones = [];
        for (var i = 0; i < clones.length; i++) {
            var clone = this.m.clones[clones[i]];
            if (clone.hasSeg('5', '3')) {
                var middle_pos = Math.round((clone.seg['5'].stop + clone.seg['3'].start)/2);
                windows.push(clone.sequence.substr(middle_pos - Math.round(SEQ_LENGTH_CLONEDB/2), SEQ_LENGTH_CLONEDB));
                kept_clones.push(clones[i]);
            }
        }

        $.ajax({
            type: "POST",
            url: self.db_address+"clonedb",
            data: "sequences="+windows.join()+"&sample_set_id="+self.m.sample_set_id,
            xhrFields: {withCredentials: true},
            success: function (result) {
		try {
		    res = jQuery.parseJSON(result);
		    result = res;
		} catch (err) {}

        self.connected = true;
        if (typeof result.error == 'string' ) {
            console.log({
                "type": "flash",
                "msg": "CloneDB: " +result.error,
                "priority": 2
            });
            self.connected = false;
        } else if (typeof result.success !== 'undefined' && result.success == 'false') {
            console.log({
                "type": "flash",
                "msg": "CloneDB: " +result.message,
                "priority": 2
            });
            self.connected = false;
		} else { 
	            for (var i = 0; i < kept_clones.length; i++) {
			self.m.clones[kept_clones[i]].seg.clonedb = processCloneDBContents(result[i], self.m);
	            }
                    m.update()
		}
                if (callback) callback();
            },
            error: function() {
                self.connected = false;
                console.log({
                    "type": "flash",
                    "msg": "Error while requesting CloneDB",
                    "priority": 2
                });
                if (callback) callback();
            }
        });
    },

    upload_file_onChange : function (target_id, value) {
        var target = document.getElementById(target_id);
        var lastIndex = value.lastIndexOf('\\');
        if (lastIndex > 0) {
            value = value.substring(lastIndex + 1);
        }
        target.value = value;
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
        result = result.replace(/DB_ADDRESS\//g, this.db_address);
        result = result.replace("action=\"#\"", "action=\""+url+"\"");

        var res;
        try {
            res = jQuery.parseJSON(result);
        }
        catch (err)//it's not a json so we just display the result as an html page
        {
            //affichage résultat
            this.display(result)
            this.url.push(url)
            
            //bind javascript
            this.init_ajaxform()
            
            //
            this.fixed_header()

            // New page displayed, attempt to display header and login notifications
            let address=DB_ADDRESS + 'notification/get_active_notifications'
            this.loadNotifications(address);

            $("#menu-container").addClass('disabledClass');

            // Hax !
            $('.jstree').trigger('load');

            var list_select = ["choose_user", "select_user"]
            for (var i = list_select.length - 1; i >= 0; i--) {
                $('#'+list_select[i]).select2();
            }
            this.executeAfterAjaxScript()

            return 0 ;
        }

        //the json result contain a flash message
        if (res.message) {
            priority = res.success == 'false' ? 2 : 1
            priority = typeof res.priority == 'undefined' ? priority : res.priority
            console.log({"type": "flash",
                             "msg": "database : " + res.message,
                             "priority": priority})
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
            return res;
        }
        
        //the json result look like a .vidjil file so we load it
        if (res.reads){
            this.m.parseJsonData(result, 100)
            this.m.file_source = "database";
            this.m.loadGermline()
                .initClones();
            this.load_analysis(args);
            this.last_file = args
            this.close()
            this.m.db_key = args
            if (typeof report != "undefined") 
                report.reset()
            return;
        }
        
        //the json result look like a .analysis file so we load it
        if (typeof res.clones != "undefined" && typeof res.reads == "undefined" ){
            this.m.parseJsonAnalysis(result)
        }

        return res
    },
    
    /** 
     * link html forms to their corresponding ajax handler 
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
                    self.connected = true;
                },
                error: function (request, status, error) {
                    self.error_log(request, status, error, name="init_ajaxform (data_form)", url=$(this).attr('action'), msg=undefined, args=undefined, type="popup")
                }
            });
        }

        if ( document.getElementById('object_form') ) {

            $('#object_form').on('submit', function(e) {
                e.preventDefault();
                $.ajax({
                    type: "POST",
                    cache: false,
                    timeout: DB_TIMEOUT_CALL,
                    crossDomain: true,
                    url      : $('#object_form').attr('action'),
                    data     : {'data': JSON.stringify($('#object_form').serializeObject())},
                    xhrFields: {withCredentials: true},
                    success: function (result) {
                        self.display_result(result, $(this).attr('action'))
                        self.connected = true;
                    },
                    error: function (request, status, error) {
                        self.error_log(request, status, error, name="init_ajaxform (object_form)", url=$('#object_form').attr('action'), msg=undefined, args=undefined, type="popup")
                    }
                });
                return false;
            });
        }
        
        //login_form
        if ( document.getElementById('login_form') ){
            //$('#login_form').on('submit',self.login_form );
            var action = $('#login_form').attr('action');
            var nexts = action.split("&")
            var next = "default/home"
            if (action.indexOf('register') != -1)
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
            
            $('#login_form').ajaxForm({
                type: "POST",
                cache: false,
                timeout: DB_TIMEOUT_CALL,
                crossDomain: true,
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                xhrFields: {withCredentials: true},
                success: function (result) {
                    self.call(next, args)
                },
                error: function (request, status, error) {
                    self.error_log(request, status, error, name="init_ajaxform (login_form)", url=$(this).attr('action'), msg=undefined, args=undefined, type=undefined)
                    if (status != "timeout") {
                        self.call(next, args)
                    }
                }
            });
        
        }

        
        //submit formulaire avec fichier
        if ( document.getElementById('upload_sample_form') ){
            $('#upload_sample_form').on('submit', function(e) {
                e.preventDefault();

                self.update_upload_fields();
                if (!self.check_upload_fields()) return;
            
                $("#submit_samples_btn").addClass("disabledClass");
                setTimeout(function(){$("#submit_samples_btn").removeClass("disabledClass")}, 3000)

                //clear empty values before submiting data
                var upload_sample_form = $('#upload_sample_form').serializeObject()
                if ("file" in upload_sample_form)
                    upload_sample_form.file = upload_sample_form.file.filter(function(el) {
                        return typeof el != "object" || Array.isArray(el) || Object.keys(el).length > 0;
                    });
                var data = JSON.stringify(upload_sample_form)

                $.ajax({
                    type     : "POST",
                    cache: false,
                    crossDomain: true,
                    xhrFields: {withCredentials: true},
                    url      : $(this).attr('action'),
                    data     : {'data': data},
                    success  : function(result) {
                        var js = self.display_result(result)
                        var id, fileSelect, files, file, filename;
                        if (typeof js.file_ids !== 'undefined'){
                            for (var k = 0; k < js.file_ids.length; k++) {
                                id = js.file_ids[k];
                                fileSelect = document.getElementById('file_upload_1_' + k);
                                if( fileSelect.files.length !== 0 ){
                                    files = fileSelect.files;
                                    var data = new FormData();

                                    for (var i = 0; i < files.length; i++) {
                                        file = files[i];
                                        data.append('file', file, file.name);
                                    }
                                    data.append('id', id);
                                    data.append('file_number', 1)
                                    data.append('pre_process', document.getElementById('pre_process').value)
                                    filename = document.getElementById('file_filename_' + k).value;
                                    self.uploader.add(id, data, filename, 1)
                                }

                                fileSelect = document.getElementById('file_upload_2_' + k);
                                if( fileSelect.files.length !== 0 ){
                                    files = fileSelect.files;
                                    var data2 = new FormData();

                                    for (var j = 0; j < files.length; j++) {
                                        file = files[j];
                                        data2.append('file', file, file.name);
                                    }
                                    data2.append('id', id);
                                    data2.append('file_number', 2)
                                    data2.append('pre_process', document.getElementById('pre_process').value)
                                    self.uploader.add(id+"_2", data2, filename, 2)
                                }
                            }
                        }
                    },
                    error: function (request, status, error) {
                        self.error_log(request, status, error, name="init_ajaxform (upload_sample_form)", url=$(this).attr('action'), msg=undefined, args=undefined, type="popup")
                    }
                });
                return false;
            });
        
        }
    },

    set_jstree: function(elem) {
        elem.jstree({
            "plugins" : ["sort", "search"],
            'core' : {
                'multiple': false,
                'data' : {
                    'url' : function(node){
                        var address = DB_ADDRESS + '/file/filesystem'
                        return node.id === '#' ? address
                                               : address + '?node=' + node.id
                    },
                    'dataType' : 'json',
                },
            }
        });
        // Action for selection of a node
        elem.on('select_node.jstree', function(event, data){
            if( data.node.icon != "jstree-file"){
                // folder seletcion; disable submit button
                document.getElementById("jstree_button").classList.add( "disabledClass" )
                return
            }
            document.getElementById("jstree_button").classList.remove( "disabledClass" )
            $('#file_filename').val(data.selected);
            var split_file = data.selected.toString().split('/');
            var file = split_file[split_file.length - 1];
            $('#file_indicator').text(file);
        });
        // Search action
        $("#jstree_search_form").submit(function(e) {
          e.preventDefault();
          elem.jstree(true).search($("#jstree_search_input").val());
        });
    },

    display_jstree: function(file_index, upload_index) {
        $("#jstree_button").data("file_index", file_index);
        $("#jstree_button").data("upload_index", upload_index);
        $("#jstree_container").show();
        $('#file_indicator_' + file_index + "_" + upload_index).text("");
        $('#file_filename_' + upload_index).val("");
    },

    close_jstree: function() {
        $("#jstree_container").hide();
    },

    select_jstree: function(file_index, upload_index)  {
        $('#file_indicator_' + file_index + "_" + upload_index).text($('#file_indicator').text());
        $('#file_indicator_' + file_index + "_" + upload_index).prop('title', $('#file_filename').prop("value"));
        $('#file_filename_' + file_index + "_" + upload_index).val($('#file_filename').val());
        $("#jstree_container").hide();
    },

    check_upload_fields: function(){
        file1 = $("[id^=file_filename_]");
        file2 = $("[id^=file_filename2_]");

        if ( $("#submitForm_isEditing").prop("checked")){
            if (this.pprocess_required_file >1)
                if ((file1[0].value == "" && file2[0].value != "") ||
                    (file1[0].value != "" && file2[0].value == "")){
                    console.log({"type": "flash",
                        "msg" : "missing file: both file fields must be filled if you wish to update current uploaded file.", 
                        "priority": 2});  
                    return false;
                }

        }else{
            var flag = true;
            for (var i=0; i<file1.length; i++)
                if (file1[i].value == "" ) flag = false;
            
            if (this.pprocess_required_file >1)
                for (var j=0; j<file2.length; j++)
                    if (file2[j].value == "" ) flag = false;

            if (!flag) {
                console.log({"type": "flash",
                "msg" : "missing file: please ensure all file fields are filled before submitting.", 
                "priority": 2});  
                return false
            } 
        }

        return true;
    },

    update_upload_fields: function() {     
        //retrieve current radio buttons value
        var radios = document.getElementsByName("source");
        for (var i=0; i<radios.length; i++) 
            if (radios[i].checked)
                this.upload_source = radios[i].value;

        var option = $("#pre_process").find(":selected");
        this.pprocess_required_file = parseInt(option.attr('required_files'))
        
        // retrieve upload fields
        var upload_fields = $('.upload_field');
        var jstree_fields = $('.jstree_field');

        // reset field, display/enable all upload field
        jstree_fields.closest("div").show();
        jstree_fields.prop("disabled", false);
        upload_fields.closest("div").show();
        upload_fields.prop("disabled", false);

        // hide/disabe unnecessary field for selected upload source
        if (this.upload_source == "nfs"){
            upload_fields.closest("div").hide();            
            upload_fields.prop("disabled", true);
        }
        if (this.upload_source == "computer"){
            jstree_fields.closest("div").hide();            
            jstree_fields.prop("disabled", true);
        }

        // hide/disable unnecessary field for selected pre-process
        if (this.pprocess_required_file == 1){
            upload_fields.filter('.file_2').closest("div").hide();            
            upload_fields.filter('.file_2').prop("disabled", true);
            jstree_fields.closest("div").filter('.file_2').hide();            
            jstree_fields.filter('.file_2').prop("disabled", true);
        }
        
        this.update_hidden_fields();
        this.update_jstree();
    },

    update_hidden_fields:function(){
        //reset default filename
        var forms = $('.form_line')
        for (var i=0; i<forms.length; i++){
            var filename="";
            var filename2="";
            
                if (this.upload_source == "computer"){
                    filename = $(forms[i]).find(".upload_field.file_1")[0].value;
                    var lastIndex = filename.lastIndexOf('\\');
                    if (lastIndex > 0) filename = filename.substring(lastIndex + 1);

                    filename2 = $(forms[i]).find(".upload_field.file_2")[0].value;
                    var lastIndex2 = filename2.lastIndexOf('\\');
                    if (lastIndex2 > 0) filename2 = filename2.substring(lastIndex2 + 1);
                }   
    
                if (this.upload_source == "nfs"){
                    filename = $(forms[i]).find("[id^=file_indicator_1]").prop('title');
                    filename2 = $(forms[i]).find("[id^=file_indicator_2]").prop('title');
                }
            

            $(forms[i]).find("[id^=file_filename_]")[0].value = filename;
            $(forms[i]).find("[id^=file_filename2_]")[0].value = filename2;
        }
        
    },

    update_jstree: function(){
        var tree = $('.jstree_field');
        var enable = this.upload_source == "nfs";
        tree.prop('hidden', !enable);
    },

    
    /**
     * reload the current db page
     * */
    reload: function(){
        if (this.url.length===0){
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
                if (quiet == undefined) {
                    // This triggers another request() call, but this time with quiet=true
                    self.error_log(request, status, error, name="request", url, msg=undefined, args, type="popup", quiet=quiet)
                }
            }
        });
    },

    logout: function() {
        document.getElementById('login-container').innerHTML = "";
        var dbc = document.getElementById('db_content');
        if (dbc) {
            document.getElementById('db_auth').innerHTML = "";
            dbc.innerHTML = "";
        }
        db.call('auth/logout');
    },

    extract_login_info: function() {
        var login_info = document.getElementById('db_auth_name');
        if(login_info != null) {
            var container = document.getElementById('login-container');
            container.innerHTML = login_info.innerHTML;
            var logout = document.createElement('a');
            logout.classList.add('button');
            logout.text = '(logout)';
            logout.onclick = function() {db.logout()};
            container.appendChild(logout);
        }
    },

    executeAfterAjaxScript: function() {
        eval($(".afterAjaxScript").html());
    },

    clear_login_info: function() {
        document.getElementById('login-container').innerHTML = '';
    },

    /*récupére et initialise le browser avec un fichier .data
     * args => format json ( parametre attendu  > patient_id, config_id)
     * filename => patient name used in the patient menu for the previous visited patients
     */
    load_data: function (args, filename) {
        var self = this;
        
        var list = document.getElementById("last_loaded_file")
        if (list == null) return;
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
        
        if (this.m.analysisHasChanged){
            this.m.analysisHasChanged = false;
            console.log({"type": "popup",
                        "default" : "save_analysis",
                        "msg": "<div class=\'center\'> <button onclick=\'db.load_data("+JSON.stringify(args)+",\""+filename+"\")\'>Continue</button> " +
                        "<button onclick='console.closePopupMsg()'>Cancel</button> </div>",
                        "priority": 2});
            return
        }
        
        var id_vars = ["sample_set_id", "patient_id", "run_id", "custom"];
        for (var j = 0; j < id_vars.length; j++) {
            this.m[id_vars[j]] = args[id_vars[j]];
        }
        if(typeof args.config !== "undefined") {
            this.m.config = args.config;
        }
        
        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_GET_DATA,
            crossDomain: true,
            url: self.db_address + "default/get_data" + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, "", args);
                console.log('=== load_data: success ===');
                self.info("[load_data ok] [ua] " + window.navigator.userAgent)
                self.connected = true;
                // self.callCloneDB()
            },
            error: function (request, status, error) {
                self.error_log(request, status, error, name="load_data", url=$(this).attr('url'), msg=undefined, args=undefined, type="popup")
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
        if (this.m.analysisHasChanged){
            this.m.analysisHasChanged = false;
            console.log({"type": "popup", 
                        "default" : "save_analysis", 
                        "msg": "<div class=\'center\'> <button onclick=\'db.load_data("+JSON.stringify(args)+",\""+filename+"\")\'>Continue</button> " +
                        " <button onclick='console.closePopupMsg()'>Cancel</button> </div>"});
            return
        }
        
        if (typeof args == 'undefined') args={};
        if (typeof args.custom == 'undefined') args.custom = this.getListInput("custom_result[]");
        
        console.log("db : custom data "+list)
        

        var id_vars = ["sample_set_id", "patient_id", "run_id", "config", "custom"];
        for (var j = 0; j < id_vars.length; j++) {
            this.m[id_vars[j]] = args[id_vars[j]];
        }

        var arg = this.argsToStr(args)
        this.m.custom = arg;
        
        this.m.wait("Comparing samples...")
        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_GET_CUSTOM_DATA,
            crossDomain: true,
            url: self.db_address + "default/get_custom_data?" + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.m.resume()
                self.m.url_manager.clean();
                self.display_result(result, "", args);
                self.connected = true;
            },
            error: function (request, status, error) {
                // var url=
                self.error_log(request, status, error, name="load_custom_data", url=$(this).attr('url'), msg=undefined, args=undefined, type="popup")
                self.m.resume()
            }
        });
    },
    
    
    load_analysis: function (args) {
        var self = this;

        $.ajax({
            type: "POST",
            timeout: DB_TIMEOUT_GET_DATA,
            crossDomain: true,
            url: self.db_address + "default/get_analysis" + "?" + this.argsToStr(args),
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result)
                console.log('=== load_analysis: success ===');
            },
            error: function (request, status, error) {
                self.error_log(request, status, error, name="load_analysis", url=$(this).attr('url'), msg=undefined, args=undefined, type="popup")
            }
        });
    },
    
    save_analysis: function () {
        var self = this;

        if (typeof this.m.custom != 'undefined' &&
            getComputedStyle(document.querySelector('.devel-mode')).display != "block"){
            console.log({ msg: "'save' has been disabled for custom file. <br/> Use the complete related sample set (patient/run) if you wish to keep your modification.", type: "flash", priority: 2 });
            return
        }
        
        if (self.last_file == self.m.db_key){
            
            var analysis = self.m.strAnalysis()
            var blob = new Blob([analysis], {
                type: 'json'
            });
            var fd = new FormData();
            fd.append("fileToUpload", blob);
            fd.append("info", self.m.info);

            if (self.m.sample != undefined && self.m.samples.info != undefined && self.m.samples.id != undefined){
                fd.append("samples_info", self.m.samples.info);
                fd.append("samples_id", self.m.samples.id);
            }
            
            $.ajax({
                type: "POST",
                timeout: DB_TIMEOUT_GET_DATA,
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
                        msg = "database_timeout - unable to save analysis"
                    } else {
                        msg = "server error<br/>" +request.responseText
                    }
                    self.error_log(request, status, error, name="Save analysis", this.url, msg=msg, args=self.last_file, type="popup")
                }
            });
        }else{
            console.log({"type": "flash", "msg": "server : save analysis error : this file is nor from the database" , "priority": 2});
        }
    },

    // periodically query the server for notifications
    // And loads them into elements with id 'header_messages' and 'login_messages'
    // TODO : Tidy up
    loadNotifications: function(adress) {
    	var self = this;
		if (adress !== "") {
			$.ajax({
		        type: "GET",
		        crossDomain: true,
		        url: adress,
                        xhrFields: {withCredentials: true},
		        timeout: DB_TIMEOUT_CALL,
		        success: function (result) {
		        	m.notification.parse_notification(result)
		            
		        }, 
		        error: function (request, status, error) {
                           self.error_log(request, status, error, name="loadNotifications", url=undefined, msg="unable to get notifications", args=undefined, type=undefined)
		        }
		    });
		} else {
			console.log("Database has not been initialised");
		}
	},

    //affiche la fenetre de dialogue avec le serveur et affiche ses réponses
    display: function (msg) {
        this.div.style.display = "block";
        this.msg.innerHTML = msg;
        
        this.extract_login_info();
        this.uploader.display()
    },

    //efface et ferme la fenetre de dialogue avec le serveur
    close: function () {
        this.div.style.display = "none";
        this.msg.removeAllChildren();
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
    
    group_rights: function (value, name, right, id) {
        
        var arg = {}
        arg.value = value       //true > add right  || false > remove right
        arg.name = name         //on what the right apply (patient / file / config)
        arg.right = right       //kind of write (create / delete / run)
        arg.id = id             //user id 
       
        this.call('group/rights', arg)
    },
    
    argsToStr : function (args) {
        var str = ""
        
        for (var key in args) {
            if (args[key] instanceof Array){
                for (var i=0; i<args[key].length; i++){
                    str += key + "=" + encodeURIComponent(args[key][i]) + "&";
                }
            }else{
                str += "" + key + "=" + encodeURIComponent(args[key]) + "&";
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

    /**
     * Start ajax sequence. Only the cursor changes.
     */
    ajax_indicator_start: function() {
        if (!(this.uploader.is_uploading())) {
            $('#live-ajax-icon').empty();
            $('#live-ajax-msg').empty();
            $('body').css('cursor', 'wait');
        }
    },

    /**
     * Show a spinner
     */
    ajax_indicator_long: function() {
        if (!(this.uploader.is_uploading())) {
            var live_icon = document.getElementById("live-ajax-icon")
            $('<img/>', {src: 'images/ajax-loader.gif'}).appendTo(live_icon)
        }
    },

    /**
     * Display a message to the user to tell him to wait a little more
     * @param  {String} message the message to said to wait to the user; optionnal
     */
    ajax_indicator_msg: function(message) {
        if (!(this.uploader.is_uploading())) {
            if (message == undefined) { message = "waiting for server reply"}
            var div_msg  = document.getElementById("live-ajax-msg")
            div_msg.innerHTML = message
        }
    },

    /**
     * End ajax sequence
     */

    ajax_indicator_stop: function() {
        $('#live-ajax-icon').empty();
        $('#live-ajax-msg').empty();
        $('body').css('cursor', 'default');
    },

    temporarilyDisableClickedLink: function() {
        var self = this;
        try {
            var event = window.event;
            if (typeof(event) === 'undefined') {
                var caller = arguments.callee.caller;
                while (caller != null && (caller.arguments.length == 0 ||
                                          ! (caller.arguments[0] instanceof Event)))
                    caller = caller.caller;
                if (caller == null)
                    return;
                event = caller.arguments[0];
            }
            event.stopPropagation();
            var target = $(event.target)
            if (target.hasClass("disabledClass")){
                return;
            } else {
                target.addClass("disabledClass")
                self.ajax_indicator_start();
                setTimeout(function(){target.removeClass("disabledClass")}, 3000)
            }
        }
        catch(err)
	{}
    },
    
    validate_fileform: function (form) { 
        var pp_option = form.pre_process.getElementsByTagName("option");
        var pp = form.pre_process.value
        
        var required_files = 1;
        for (var i=0; i<pp_option.length; i++){
            if (pp == pp_option[i].value){
                required_files = pp_option[i].getAttribute("required_files");
            }
        }

        var upload1 = document.getElementById("upload_file").value;
        var upload2 = document.getElementById("upload_file2").value;
        if (required_files == 2 &&  (upload1 === "" || upload2 === "")){
            console.log({"type": "flash", "msg" : "2 files are required for the selected pre-process", "priority": 2});
            return false
        }
        
        return true;
    },

    updateStatsButton: function() {
        var sample_set_ids = [];
        $('[name^="sample_set_ids"]:checked').each(function() {
            sample_set_ids.push("sample_set_ids=" + $(this).val());
        });
        var config_id = $('#choose_config').find(':selected').val();
        var addr = DB_ADDRESS + '/sample_set/result_files?config_id=' + config_id + '&' + sample_set_ids.join('&');
        $('#stats_button').attr('href', addr);
    },

    updateStatsSelection: function(cb) {
        var $cb=$(cb);
        $('[name^=\"sample_set_ids\"]').prop('checked', $cb.is(':checked'));
        this.updateStatsButton();
    },

    callGroupStats: function() {
        var group_ids = [];
        $('[name^="group_ids"]:checked').each(function() {
            group_ids.push($(this).val());
        });
        this.callUrlJson(DB_ADDRESS + 'my_account/index', {'group_ids': group_ids});
    },

    callJobStats: function() {
        var group_ids = [];
        $('[name^="group_ids"]:checked').each(function() {
            group_ids.push($(this).val());
        });
        this.callUrlJson(DB_ADDRESS + 'my_account/jobs', {'group_ids': group_ids});
    },

    stopGroupPropagate: function(e) {
        if(!e) {
            e = window.event
        }
        e.stopPropagation();
    },

    // Log functions, to server
    // 'quiet' is set to true to avoid infinite loops with timeouts
    log : function (lvl, msg) {
        console.default.log(msg);
        this.request('default/logger', {'lvl': lvl, 'msg': encodeURIComponent(msg)}, true)
    },
    debug:    function(msg) { this.log(10, msg) },
    info:     function(msg) { this.log(20, msg) },
    warn:     function(msg) { this.log(30, msg) },
    error:    function(msg) { this.log(40, msg) },
    critical: function(msg) { this.log(50, msg) },

    // Log catched error to server
    log_error: function(err) { this.error(err.name + ': ' + err.description + ' ' + err.stack) }
    
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
            crossDomain: true,
            context: self,      
            url: url,
            processData: false,
            contentType: false,
            data: self.queue[id].data,
            xhrFields: {withCredentials: true},
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
                        db.warn("upload may have failed - " + self.queue[id].filename)
                        self.queue[id].status = "upload_error"
                        console.log({"type": "flash", "msg": "upload " + self.queue[id].filename + " : " + status , "priority": 2});
                    }
                }
                self.display();
            }
        });
    },
    
    cancel: function (id) {
        db.warn("upload canceled - " + this.queue[id].filename)
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

