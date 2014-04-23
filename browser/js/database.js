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
        event.stopPropagation();
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
        console.log(this)       //context work !!! YEEAAHHHHHHHHHHHH
        
        //rétablissement de l'adresse pour les futures requetes
        result = result.replace("DB_ADDRESS/", this.db_address);
        result = result.replace("action=\"#\"", "action=\""+this.last_url+"\"");
        
        //hack redirection
        try {
            var res = jQuery.parseJSON(result);
            this.call(res.redirect)
        }
        catch(err)
        {
            //affichage résultat
            this.display(result);
            
            //bind javascript
            this.init_ajaxform()
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
                    var res = jQuery.parseJSON(result);
                    if (res.success == "true") {
                        self.call("patient/index")
                    } else {
                        popupMsg(res.error);
                    }
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
                xhrFields: { withCredentials: true},
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
                    var res = jQuery.parseJSON( result );
                    if (res.success=="true"){
                        
                    }else{
                        popupMsg(res.error);
                    }
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
    
    /* ajax event pour formulaire sans fichier 
     * */
    data_form: function (e) {
        var self = this

        e.preventDefault();
        e.stopPropagation();
        
        $.ajax({
            type: "POST",
            cache: false,
            timeout: 1000,
            crossDomain: true,
            url      : $(this).attr('action'),
            data     : $(this).serialize(),
            xhrFields: {withCredentials: true},
            success: function (result) {
                var res = jQuery.parseJSON(result);
                if (res.success == "true") {
                    //db.call("patient_list")
                } else {
                    popupMsg(res.error);
                }
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

    /* ajax event pour formulaire avec fichier 
     * */
    upload_form: function (e) {
        var self = this
        var upload_n = this.upload
        console.log(this)
        e.stopPropagation();
        e.preventDefault();
        
        $.ajax({
            type     : "POST",
            cache: false,
            crossDomain: true,
            url      : $(this).attr('action'),
            data     : $(this).serialize(),
            xhrFields: {withCredentials: true},
            beforeSend: db.beforeSend(),
            //mise a jour progressive du % d'upload
            uploadProgress: function(event, position, total, percentComplete) {
                var percentVal = percentComplete + '%';
                $('#upload_percent_'+upload_n).html(percentVal);
            },
            success  : function(result) {
                var res = jQuery.parseJSON( result );
                if (res.success=="true"){
                
                }else{
                    popupMsg(res.error);
                }
            },
            error: function (request, status, error) {
                if(status==="timeout") {
                    popupMsg("timeout");
                } else {
                    popupMsg(request.responseText);
                } 
            }
        });
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
            url: self.db_adress + controller_name + arg,
            success: function (result) {
                popupMsg(result);
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

    /*récupére et initialise le browser avec un fichier .data
     * args => format json ( parametre attendu  > patient_id, config_id)
     */
    load: function (args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        $.ajax({
            type: "POST",
            timeout: 5000,
            crossDomain: true,
            url: self.db_address + "default/result" + arg,
            xhrFields: {withCredentials: true},
            success: function (result) {
                json = jQuery.parseJSON(result)
                m.reset();
                m.parseJsonData(json, 50)
                    .loadGermline();
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
    }
    
    

}
