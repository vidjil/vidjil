function Database(id, db_address) {
    this.db_address = db_address;
    this.id = id;
    this.upload = {};
    
    this.url = []
}

Database.prototype = {

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
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }
        
        var url = self.db_address + page + arg
        
        this.callUrl(url)
    },
    
    callUrl : function (url){
        var self=this;
        
        $.ajax({
            type: "POST",
            crossDomain: true,
            context: self,         //we can't do closure with ajax event handler so we use context to keepref
            url: url,
            contentType: 'text/plain',
            timeout: 1000,
            xhrFields: {withCredentials: true},
            success: function (result) {
                self.display_result(result, url)
            }, 
            error: function (request, status, error) {
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                }
            }
            
        });
    },
    
    display_result: function (result, url) {
        //rétablissement de l'adresse pour les futures requetes
        result = result.replace("DB_ADDRESS/", this.db_address);
        result = result.replace("action=\"#\"", "action=\""+url+"\"");
        
        //hack redirection
        try {
            var res = jQuery.parseJSON(result);
            
            if (res.redirect) this.call(res.redirect, res.args)
               
            if (res.message) myConsole.flash("database : " + res.message , 1)
            
            return res
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
        }
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
                timeout: 1000,
                crossDomain: true,
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                xhrFields: {withCredentials: true},
                success: function (result) {
                    self.display_result(result, $(this).attr('action'))
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        popupMsg("timeout");
                    } else {
                        popupMsg(request.responseText);
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
                timeout: 1000,
                crossDomain: true,
                context: self,   
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                xhrFields: {withCredentials: true},
                success: function (result) {
                    self.display_result(result, $(this).attr('action'))
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        popupMsg("timeout");
                    } else {
                        self.call("patient/index")
                    }
                }
            });
        
        }

        
        //submit formulaire avec fichier
        if ( document.getElementById('upload_form') ){
            
            var data = $('#upload_form').serialize()

            $('#upload_form').ajaxForm({
                type     : "POST",
                cache: false,
                crossDomain: true,
                xhrFields: {withCredentials: true},
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                success  : function(result) {
                    var js = self.display_result(result)
                    var id = js.file_id
                    var fileSelect = document.getElementById('upload_file');
                    var files = fileSelect.files;
                    var data = new FormData();
                    
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        data.append('file', file, file.name);
                    }
                    data.append('id', id);
                    
                    self.upload_file(id, data)
                },
                error: function (request, status, error) {
                    if(status==="timeout") {
                        popupMsg("timeout");
                    } else {
                        popupMsg(request + " " + status + " " + error);
                    } 
                }
            });
            
        }  
        
    },
    
    upload_file: function (id, data){
        var self = this;
        
        var url = self.db_address + "file/upload"
        //url = url.replace("https://", "http://");
        $.ajax({
            type: "POST",
            cache: false,
            crossDomain: true,
            url: url,
            processData: false,
            contentType: false,
            data: data,
            xhrFields: {withCredentials: false},
            beforeSend: function(){
                self.upload[id] = 0
            },
            success: function (result) {
                self.upload[id] = 1
                self.upload_display()
                self.display_result(result, url)
            },
            error: function (request, status, error) {
                delete self.upload[id]; 
                self.upload_display();
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                }
            }
        });
        
        return data
    },
    
    /*reload the current db page*/
    reload: function(){
        url = this.url[this.url.length-1]
        this.callUrl(url)
        this.url.pop()
    },
    
    back: function(){
        if (this.url.length > 1){
            this.url.pop()
            url = this.url[this.url.length-1]
            this.callUrl(url)
        }
        this.url.pop()
    },
    
    
    /* appel une fonction du serveur
     * idem que call() mais la réponse n'est pas une page html a afficher
     * mais simplement une confirmation que la requete a été entendu
     */
    request: function (controller_name, args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        //envoye de la requete ajax
        $.ajax({
            type: "POST",
            timeout: 2000,
            crossDomain: true,
            url: self.db_address + controller_name + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                popupMsg(result);
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    self.call("patient/index")
                }
            }
        });
    },

    /*récupére et initialise le browser avec un fichier .data
     * args => format json ( parametre attendu  > patient_id, config_id)
     */
    load_data: function (args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        $.ajax({
            type: "POST",
            timeout: 15000,
            crossDomain: true,
            url: self.db_address + "default/get_data" + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                json = jQuery.parseJSON(result)
                m.reset();
                m.parseJsonData(json, 100)
                m.loadGermline();
                m.initClones()
                self.load_analysis(args)
                self.last_file = args
                m.db_key = args
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                }
            }
        });
    },
    
    load_analysis: function (args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        $.ajax({
            type: "POST",
            timeout: 15000,
            crossDomain: true,
            url: self.db_address + "default/get_analysis" + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                m.parseJsonAnalysis(result)
                m.initClones()
            },
            error: function (request, status, error) {
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                }
            }
        });
    },
    
    save_analysis: function () {
        var self = this;
        
        if (self.last_file == m.db_key){
            var arg = "?";
            for (var key in self.last_file) {
                arg += "" + key + "=" + self.last_file[key] + "&";
            }
            
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
                url: self.db_address + "default/save_analysis" + arg,
                data     : fd,
                processData: false,
                contentType: false,
                xhrFields: {withCredentials: true},
                success: function (result) {
                    try {
                        var res = jQuery.parseJSON(result);
                        if (res.message) myConsole.flash("database : " + res.message , 1)
                    }
                    catch(err){}
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        myConsole.flash("server : save analysis error : timeout", 2);
                    } else {
                        myConsole.flash("server : save analysis error : "+request.responseText, 2);
                    }
                }
            });
        }else{
            myConsole.flash("server : save analysis error : this file is nor from the database")
        }
    },
    
    //affiche la fenetre de dialogue avec le serveur et affiche ses réponses
    display: function (msg) {
        document.getElementById("db_div")
            .style.display = "block";
        document.getElementById("db_msg")
            .innerHTML = msg;
            
        this.upload_display();
    },
    
    /* update upload status  */
    upload_display: function(){
        for (var key in this.upload){
            if (this.upload[key]==1){
                delete this.upload[key]; 
                this.reload()
            }else{
                $("#sequence_file_"+key).html("<div class='loading_seq'></div>")
            }
        }
    },

    //efface et ferme la fenetre de dialogue avec le serveur
    close: function () {
        document.getElementById("db_div")
            .style.display = "none";
        document.getElementById("db_msg")
            .innerHTML = "";
    },
    
    fixed_header: function () {
        var header = $("#table > thead").clone();
        var fixedHeader = $("#db_fixed_header").append(header);
        
        $("#db_table_container").bind("scroll", function() {
            var offset = $(this).scrollTop();

            fixedHeader.css("top", offset)

        });
    },
    
    user_rights: function (value, name, id) {
        
        var arg = {}
        arg.value = value
        arg.name = name
        arg.id = id
       
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
    }

}

/*crée une liste de suggestion dynamique autour d'un input text*/
function suggest_box(id, list) {
    
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
        if (count == 0){
            var suggestion = document.createElement("div")
            suggestion.appendChild(document.createTextNode("no suggestions ..."))
            suggest_list.appendChild(suggestion)
        }
    };
    
    //masque la liste
    input_box.onblur = function(){
        setTimeout(function(){suggest_list.style.display = "none"}, 200)
    };
}
