function Database(id, db_address) {
    this.db_address = db_address;
    this.id = id;
    this.upload = 0;
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
        
        this.last_url = self.db_address + page + arg
        
        //envoye de la requete ajax
        $.ajax({
            type: "POST",
            timeout: 1000,
            crossDomain: true,
            context: self,                          //we can't do closure with ajax event handler so we use context to keep ref
            url: self.db_address + page + arg,
            contentType: 'text/plain',
            xhrFields: {withCredentials: true},
            success: self.display_result,     
            error: function (request, status, error) {
                if (status === "timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                }
            }
            
        });
    },
    
    
    display_result: function (result) {
        //rétablissement de l'adresse pour les futures requetes
        result = result.replace("DB_ADDRESS/", this.db_address);
        result = result.replace("action=\"#\"", "action=\""+this.last_url+"\"");
        
        //hack redirection
        try {
            var res = jQuery.parseJSON(result);
            
            if (res.redirect) this.call(res.redirect, res.args)
                
            //TODO : implémenter un flash message
            if (res.message) console.log("database log : "+res.message)
            
        }
        catch(err)
        {
            //affichage résultat
            this.display(result)
            
            //bind javascript
            this.init_ajaxform()
            
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
                    self.display_result(result)
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
                success: self.display_result,
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
            //$('#upload_form').on('submit', self.upload_form ); // doesn't work :/
            
            var upload_n=this.upload
            //rename form
            $('#upload_form').ajaxForm({
                type     : "POST",
                cache: false,
                crossDomain: true,
                url      : $(this).attr('action'),
                data     : $(this).serialize(),
                beforeSubmit: function() {
                    self.call("patient/index") 
                    //crée un div qui contiendra la progression de l'upload du fichier 
                    self.upload++;
                    var div = document.createElement('div');
                    
                    var spanName=document.createElement('span');
                    spanName.innerHTML = $("#upload_file").val().split('/').pop().split('\\').pop();
                    
                    var spanPercent=document.createElement('span');
                    spanPercent.id = "upload_percent_"+upload_n; 
                    spanPercent.innerHTML = '0%';
                    
                    div.appendChild(spanName);
                    div.appendChild(spanPercent);
                    
                    var div_parent=document.getElementById("upload_list");
                    div_parent.appendChild(div);
                },    
                //mise a jour progressive du % d'upload
                uploadProgress: function(event, position, total, percentComplete) {
                    var percentVal = percentComplete + '%';
                    $('#upload_percent_'+upload_n).html(percentVal);
                },
                success  : function(result) {
                    self.display_result(result)
                },
                error: function (request, status, error) {
                    if(status==="timeout") {
                        popupMsg("timeout");
                    } else {
                        popupMsg(request.responseText);
                    } 
                }
            });
            
        }  
        
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
                    popupMsg("analysis saved")
                },
                error: function (request, status, error) {
                    if (status === "timeout") {
                        popupMsg("timeout");
                    } else {
                        popupMsg(request.responseText);
                    }
                }
            });
        }else{
            popupMsg("this file is nor from the database")
        }
    },
    
    //affiche la fenetre de dialogue avec le serveur et affiche ses réponses
    display: function (msg) {
        document.getElementById("db_div")
            .style.display = "block";
        document.getElementById("db_msg")
            .innerHTML = msg;
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
    }

}
