function Database(id, db_adress) {
    this.db_adress = db_adress;
    this.id = id;
    this.upload = 0;
}

Database.prototype = {

    //appel une page générée a partir des données du serveur
    //page : nom de la page coté serveur
    //args : parametres format json ( { "name_arg1" : "arg1", ... } )
    call: function (page, args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        //envoye de la requete ajax
        $.ajax({
            type: "GET",
            timeout: 1000,
            crossDomain: true,
            url: self.db_adress + page + arg,
            contentType: 'text/plain',
            xhrFields: { withCredentials: false },
            success: function (result) {

                var self2 = self;
                //rétablissement de l'adresse pour les futures requetes
                result = result.replace("DB_ADRESS/", self.db_adress);
                //affichage résultat
                self.display(result);

                //bind javascript
                //le nouveau contenu apporté par l'ajax n'était pas présent durant l'initialisation du javascript
                //les appels javascript qu'il contient ne sont donc pas linké
                //on déclare donc les fonctions neccessaire apres l'affichage

                //submit formulaire sans fichier
                if ( document.getElementById('data_form') ){
                    $('#data_form')
                        .on('submit', function (e) {
                            e.preventDefault();
                            $.ajax({
                                type: "POST",
                                cache: false,
                                timeout: 1000,
                                crossDomain: true,
                                url: $(this)
                                    .attr('action'),
                                data: $(this)
                                    .serialize(),
                                success: function (result) {
                                    var res = jQuery.parseJSON(result);
                                    if (res.success == "true") {
                                        self2.call("patient_list")
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
                        });
                }

                var upload_n = self.upload;
                //submit formulaire avec fichier
                if ( document.getElementById('upload_form') ){
                    $('#upload_form')
                        .ajaxForm({
                            type: "POST",
                            cache: false,
                            crossDomain: true,
                            url: $(this)
                                .attr('action'),
                            data: $(this)
                                .serialize(),
                            beforeSend: function () {
                                //crée un div qui contiendra la progression de l'upload du fichier 
                                self2.upload++;
                                var div = document.createElement('div');

                                var spanName = document.createElement('span');
                                spanName.innerHTML = $("#upload_file")
                                    .val()
                                    .split('/')
                                    .pop()
                                    .split('\\')
                                    .pop();

                                var spanPercent = document.createElement('span');
                                spanPercent.id = "upload_percent_" + upload_n;
                                spanPercent.innerHTML = '0%';

                                div.appendChild(spanName);
                                div.appendChild(spanPercent);

                                var div_parent = document.getElementById("upload_list");
                                div_parent.appendChild(div);

                                self2.call("patient_list")

                            },
                            //mise a jour progressive du % d'upload
                            uploadProgress: function (event, position, total, percentComplete) {
                                var percentVal = percentComplete + '%';
                                $('#upload_percent_' + upload_n)
                                    .html(percentVal);
                            },
                            success: function (result) {
                                var res = jQuery.parseJSON(result);
                                if (res.success == "true") {

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




    //appel une fonction du serveur
    //idem que call() mais la réponse n'est pas une page html a afficher
    //mais simplement une confirmation que la requete a été entendu
    request: function (controller_name, args) {

        var self = this;
        var arg = "?";
        for (var key in args) {
            arg += "" + key + "=" + args[key] + "&";
        }

        //envoye de la requete ajax
        $.ajax({
            type: "POST",
            timeout: 1000,
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
            url: self.db_adress + "result" + arg,
            success: function (result) {
                json = jQuery.parseJSON(result)
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
