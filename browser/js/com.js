/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2024 by VidjilNet consortium and Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Com object - replacement for the default javascript console <br>
 * provide flash and popup message through the log function <br>
 * optional, vidjil browser can work whithout it but all log will be displayed only in the console
 * @class Com
 * @constructor 
 * @param {object} default_console)
 * */
function Com(default_console) {
    var self = this;
    this.default = default_console;
    
    for (var key in default_console){
        if (typeof this.default[key] == 'function') {
            //if (key!='log') this[key] = wrapper(key)
            if (key!='log') 
                this[key] = default_console[key].bind(window.console);
            else
                this.basicLog = default_console[key].bind(window.console);
        }else{
            this[key] = this.default[key];
        }
    }
    
    this.data_id = "modal data-container"; //TODO
    

    this.DEBUG = 0
    this.INFO = 1
    this.WARN = 2
    this.ERROR = 3
    
    this.min_priority = this.INFO // minimum required to display message
    this.min_priority_console = this.DEBUG
    this.build()
    
    BUTTON_CLOSE_POPUP = "</br></br> <div class='center' > <button onclick='console.closePopupMsg()'>ok</button></div> ";

    this.msg = {
        "align_error": "Error &ndash; connection to align server ("+return_URL_CGI()+") failed" +
            BUTTON_CLOSE_POPUP,

        "file_error": "Error &ndash; incorrect .vidjil file" + "</br> Please check you use a .vidjil file generated by a compatible program." +
            BUTTON_CLOSE_POPUP,
        "file_error_analysis": "Error &ndash; incorrect .analysis file" + "</br> Please check you use a .analysis file generated by a compatible program." +
            BUTTON_CLOSE_POPUP,

        "parse_error": "Error &ndash; error in parsing the .vidjil file" +
            "</br> The .vidjil file seems broken, please check it or " +
            "<a href='mailto:support@vidjil.org?Subject=%5Bvidjil%5D%20Parse%20error&Body=%0AHi%2C%0A%0AThe%20attached%20.vidjil%20file%20does%20not%20load%20into%20the%20browser%2C%20could%20you%20check%20it%20%3F%0A%0A'>send us</a> the file" +
            BUTTON_CLOSE_POPUP,

        "parse_analysis_error": "Error &ndash; error in parsing the .analysis file" +
            "</br> The .analysis file seems broken, please check it or " +
            "<a href='mailto:support@vidjil.org?Subject=%5Bvidjil%5D%20Parse%20error&Body=%0AHi%2C%0A%0AThe%20attached%20.analysis%20file%20does%20not%20load%20into%20the%20browser%2C%20could%20you%20check%20it%20%3F%0A%0A'>send us</a> the file" +
            BUTTON_CLOSE_POPUP,

        "json_not_found":"Error &ndash; editDistanceFile.json not found" +
            "</br> Please to check the specified repository in the c++ program, or to run Vidjil program with the specified datas." +
            BUTTON_CLOSE_POPUP,

        "version_error": "Error &ndash; .vidjil file too old (version " + VIDJIL_JSON_VERSION + " required)" +
            "</br> This .vidjil file was generated by a too old program. " +
            "</br> Please regenerate a newer .vidjil file. " +
            BUTTON_CLOSE_POPUP,

        "welcome": " <h2>Vidjil <span class='logo'>" + ((typeof config !== 'undefined' && (config.healthcare || false)) ? "(health)" : "(beta)") + "</span></h2>" +
            "(c) 2011-2024, The Vidjil Team: " +
            "Aurélien Béliard, Marc Duez, Mathieu Giraud, Ryan Herbert, Mikaël Salson, Tatiana Rocher and Florian Thonier" +
            " &ndash; <a href='http://www.vidjil.org'>http://www.vidjil.org/</a>" +
            (typeof git_sha1 !== "undefined" ? " &ndash; " + git_sha1 : "") +
            "<br/><br/>Vidjil is developed by the <a href='http://cristal.univ-lille.fr/bonsai'>Bonsai bioinformatics lab</a> at CRIStAL (UMR 9189 CNRS, Univ. Lille) and the <a href='http://www.vidjil.net'>VidjilNet consortium</a> (Inria). " +
            "We are grateful to the <a href='http://biologiepathologie.chru-lille.fr/organisation-fbp/91210.html'>department of Hematology</a> of CHRU Lille, the <a href='http://www.ircl.org/plate-forme-genomique.html'>Functional and Structural Genomic Platform</a> (U. Lille, IFR-114, IRCL) and the <a href='http://www.euroclonality.org/'>EuroClonality-NGS</a> working group, as well to all members of the <a href='http://www.vidjil.net'>VidjilNet consortium</a>." +
            "<br/><br/>" + (typeof config !== 'undefined' ? (config.hosting || "") : "") +
            "<br/><br/>Vidjil is free software, and you are welcome to redistribute it under <a href='http://git.vidjil.org/blob/master/doc/LICENSE'>certain conditions</a>. " +
            "Please cite <a href='http://dx.doi.org/10.1371/journal.pone.0166126'>(Duez et al., 2016)</a> if you use the Vidjil web application." +
            BUTTON_CLOSE_POPUP,

        "browser_error": "The web browser you are using has not been tested with Vidjil." +
            "</br>Note in particular that Vidjil is <b>not compatible</b> with Internet Explorer 9.0 or below." +
            "</br>For a better experience, we recommend to install one of those browsers : " +
            "</br> <a href='http://www.mozilla.org/'> Firefox </a> " +
            "</br> <a href='www.google.com/chrome/'> Chrome </a> " +
            "</br> <a href='http://www.chromium.org/getting-involved/download-chromium'> Chromium </a> " +
            "</br></br> <div class='center' > <button onclick='popupMsg(msg.welcome)'>I want to try anyway</button></div> ",
	    
        "database_timeout": "Cannot connect server, please retry later ",
    
        "save_analysis": "You made some changes in the analysis of the previous patient" +
            "</br>that were not saved (patients → save analysis)." +
            "</br>These changes will now be lost, do you want to proceed anyway? ",

        "Rescue server": "You are connected here to the <b>rescue server</b>. We apologize for this inconvenience." +
            "</br>Depending on your account, you may access to your previous analyses, upload data and/or run news analyses." +
            "</br>Please note that all what you are doing there (uploading/analyzing) <b>will not be saved</b> in the main database." +
            "</br>Do not hesitate to contact us if you have any question.",
    }
    
    
}

Com.prototype = {
    
    /**
     * Replacement function for console.log <br>
     * Parse log message and display it in a popup, flash or standard log 
     * @param {string|object} obj 
     * 
     * @example
     * console.log('hello')                                     //will display a standard log message with 'hello'
     * console.log({msg: 'hello', type: 'log'})                 //will display a log message with 'hello'
     * console.log({msg: 'hello', type: 'popup'})               //will display a popup message with 'hello'
     * console.log({default: 'browser_error', type: 'popup'})   //will display a flash message with the default 'browser_error' message
     * console.log({msg: 'bug!!', type: 'flash', priority: 3})  //will display a flash message with 'bug!!' (high priority => red message)
     * */
    log: function(obj){
        if (typeof obj !== 'object'){
            this.default.log(obj)
        }else{
            var text = ""
            if (typeof obj.default != "undefined") text += this.msg[obj.default]
            if (typeof obj.msg != "undefined") text += obj.msg
            switch (obj.type) {
                case "flash":
                    this.flash(text, obj.priority, obj.call, obj.timeout)
                    break;
                case "popup":
                    this.popupMsg(text)
                    break;
                case "log":
                    this.customLog(text, obj.priority)
                    break;
                case "big-popup":
                    this.dataBox(text)
                    break;
            }
        }
    },
    
    /**
     * build html elements for flash, log and popup message
     * */ 
    build: function(){
        var self = this;
        
        this.flash_container = document.createElement("div")
        this.flash_container.className = "flash_container";
        
        this.log_container = document.createElement("div")
        this.log_container.className = "log_container";

        this.popup_container = document.createElement("div")
        this.popup_container.className = "popup_container";
        
        var close_popup = document.createElement("span")
        close_popup.onclick = function(){
            self.closePopupMsg();
        }
        close_popup.className = "closeButton";
        close_popup.appendChild(icon('icon-cancel', ''));
        this.popup_msg = document.createElement("div")
        this.popup_msg.className = "popup_msg";
        
        this.popup_container.appendChild(close_popup)
        this.popup_container.appendChild(this.popup_msg)
        
        document.body.appendChild(this.flash_container);
        document.body.appendChild(this.log_container);
        document.body.appendChild(this.popup_container);
        
        //
        this.div_dataBox = document.createElement("div");
        this.div_dataBox.className = "modal data-container";
        
        var closedataBox = document.createElement("span");
        closedataBox.className = "closeButton" ;
        closedataBox.appendChild(icon('icon-cancel', ''));
        closedataBox.onclick = function() {self.closeDataBox()};
        this.div_dataBox.appendChild(closedataBox);
        
        var div_data = document.createElement("div");
        div_data.className = "data-msg";
        this.div_dataBox.appendChild(div_data);
        
        document.body.appendChild(this.div_dataBox);

        var inputChange = function(){
            var key = window.event.keyCode;

            // If the user has pressed enter
            if (key === 13) {
                console.confirm.continue[0].click()
                document.getElementsByTagName("body")[0].focus() // escape from this text input
                return false;
            } else if (key === 27) {
                console.confirm.cancel[0].click()
                document.getElementsByTagName("body")[0].focus() // escape from this text input
                return false;
            } else {
                return true;
            }
        }

        //
        this.confirm = {};

        this.confirm.box =  $('<div/>',     {   class: "popup_container",
                                                id: "popup_container_box"
                                            }).appendTo(document.body);

        this.confirm.content = $('<div/>',  {   class: "info-msg",
                                            }).appendTo(this.confirm.box);

        this.confirm.inputdiv = $('<div/>', {   class: "popup_input" 
                                            }).appendTo(this.confirm.box);
                                            
        this.confirm.input =   $('<input/>',{   id: 'console_text_input',
                                                type: 'text',
                                                maxlength: 25,
                                            })
                                            .keypress(inputChange)
                                            .appendTo(this.confirm.inputdiv);
                                            
        this.confirm.buttondiv = $('<div/>',{   class :"popup_button"
                                            }).appendTo(this.confirm.box);

        this.confirm.cancel = $('<button/>',{   class: 'container_button',
                                                text : 'cancel',
                                                id:    'confirm_btn_cancel'
                                            }).click(function() {self.closeConfirmBox()})
                                              .appendTo(this.confirm.buttondiv);

        this.confirm.continue = $('<button/>',{ class: 'container_button',
                                                text : 'continue',
                                                id:    'confirm_btn_continue'
                                            }).appendTo(this.confirm.buttondiv);
        
        /*
        $(".log_container").hover(function () {
            $(this).stop()
            .css('overflow-y', 'scroll')
            .css('overflow-x', '')
            .animate({
                width: '400',
                height: '75%',
                opacity: 0.85
            });
        }, function () {
            $(this).stop()
            .css('overflow-y', 'hidden')
            .css('overflow-x', 'hidden')
            .animate({
                width: 10,
                height: 10,
                opacity: 0.5
            });
        });
        */
    },

    
    /**
     * display a flash message if priority level is sufficient
     * and print message in log
     * @param {string} str - message to display
     * @param {integr} priority 
     * */
    flash: function (str, priority, call, timeout){
        priority = typeof priority !== 'undefined' ? priority : 0;
        timeout = timeout == undefined ? 8000: timeout

        if (priority >= this.min_priority){
            var div = jQuery('<div/>', {
                'html': str,
                'style': 'display : none',
                'class': 'flash_'+priority ,
                'click': function(){$(this).fadeOut(25, function() { $(this).remove();} );}
            }).appendTo(this.flash_container)
            .slideDown(200);

            if (call){
                var div2 = jQuery('<div/>').appendTo(div);

                jQuery('<div/>', {
                    'text': "see details",
                    'class': "button",
                    'click': function(){ db.call(call.path, call.args); }
                }).appendTo(div2);

                if (priority >= this.ERROR){
                    jQuery('<div/>', {
                        'text': "×",
                        'class': "button",
                        'click': function(){$(this).fadeOut(25, function() { $(this).remove();} );}
                    }).appendTo(div2);
                }
            }
            
            if (priority < this.ERROR){
                setTimeout(function(){
                    div.fadeOut('slow', function() { div.remove();});
                }, timeout);
            }
            
        }
        this.customLog(str, priority, call);
        this.log(str, priority);
    },
    
    /**
     * print message in log_container if priority level is sufficient
     * @param {string} str - message to print
     * @param {integr} priority 
     * */
    customLog: function(str, priority, call){
        priority = typeof priority !== 'undefined' ? priority : 0;
        var self = this;
        
        if (priority >= this.min_priority){
            
            var d = new Date();
            var strDate = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
            while (strDate.length < 8) strDate += " "
                
            var div = jQuery('<div/>', {
                'html': strDate+" | "+str,
                'class': 'log_'+priority
            }).appendTo(this.log_container)
            .slideDown(200, function(){
                self.log_container.scrollTop = self.log_container.scrollHeight;
            });

            if (call){
                var div2 = jQuery('<div/>').appendTo(div);

                jQuery('<div/>', {
                    'text': "see details",
                    'class': "button",
                    'click': function(){ db.call(call.path, call.args); }
                }).appendTo(div2);
            }
            
        }else{
	  if (priority >= this.min_priority_console)
            this.default.log(str)
        }
        
    },
    
    /**
     * open the log window 
     * */
    openLog: function () {
        $(this.log_container).fadeToggle(200);
    },
    
    /**
     * close the log window 
     * */
    closeLog: function () {
        $(this.log_container).fadeToggle(200);
    },

    /**
     * open/close the log window 
     * */
    toggleLog: function () {
        $(this.log_container).fadeToggle(200);
    },
    
    /**
     * display a popup message in a small window
     * @param {string} msg
     * */
    popupMsg: function (msg) {
        this.popup_container.style.display = "block";
        this.popup_container.lastElementChild
            .innerHTML = msg;
        $(this.popup_container).find('button').focus();
    },
    
    /**
     * display a popup message in a small window
     * @param {domElement} msg
     * */
    popupHTML: function (domElement) {
        this.popup_container.style.display = "block";
        this.popup_container.lastElementChild
            .removeAllChildren();
        this.popup_container.lastElementChild
            .appendChild(domElement);
        $(this.popup_container).find('button').focus();
    },

    /**
     * close popup window 
     * */
    closePopupMsg: function () {
        this.popup_container.style.display = "none";
        this.popup_container.lastElementChild
            .removeAllChildren();
    },

    /**
     * display a popup message in a big window
     * @param {string} msg
     * */
    dataBox: function(msg) {
        this.div_dataBox.style.display = "block";
        this.div_dataBox.lastElementChild.innerHTML = msg;
    },

    /**
     * close databox window 
     * */
    closeDataBox: function() {
        this.div_dataBox.style.display = "none";
        this.div_dataBox.lastElementChild.removeAllChildren();
    },

    /**
     * ask user to confirm action before executing fallback
     * if input is defined box will ask for a value to use in callback
     * @param close_by_callback; prevent to close confirmBox if a callback should close it himself (after textarea verification for example)
     */
    confirmBox: function (text, callback, input, close_by_callback=false){
        var self = this
        this.confirm.box.show();
        this.confirm.input.val("");
        this.confirm.inputdiv.hide();
        this.confirm.content.html(text);
        this.confirm.continue.unbind("click");
        if (!close_by_callback){
            this.confirm.continue.click(function(){self.closeConfirmBox()});
        }

        if (input != undefined){
            this.confirm.inputdiv.show();
            this.confirm.input.focus()
            if (typeof input == "string"){
                this.confirm.input.val(input);
            }
        }

        this.confirm.continue.click(callback);

    },

    closeConfirmBox: function() {
        this.confirm.box.hide();
        this.confirm.inputdiv.hide();
    }
    
}
