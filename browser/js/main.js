 /* This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
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


NOTIFICATION_PERIOD = 300000			  // Time interval to check for notifications periodically (ms)
AJAX_TIMEOUT_START = 200                  // Delay before cursor wait
AJAX_TIMEOUT_LONG  = 600                  // Delay before spinner at the top-right
AJAX_TIMEOUT_MSG1  = 10000                 // Delay before first message
AJAX_TIMEOUT_MSG2  = 30000                // Delay before second message
var timeout;
var ajaxOn = 0;
var devel_mode = false;

/* Console (optional)
 * Setting here a console replaces the default javascript console with a custom one.
 * This displays important error/log message in popup or flash messages instead of the default javascript terminal.
 * This should be called first in order to retrieve also messages from the initialization of the different modules.
 * */
console = new Com(console)


/* Model
 * The model is the main object of the Vidjil browser.
 * It loads and saves .vidjil json data (either directly from data, or from a local file, or from some url).
 * It provides function to access and edit information on the clones.
 * It keeps all the views in sync.
 */
var m = new Model();
setCrossDomainModel(m);

/* Database (optional)
 * This links the model to a patient database (possibly the one defined in config.js)
 */
var db = new Database(m);
var notification = new Notification(m)

try {

    /* use template to create DOM elements from string */
    var template = document.createElement('template');
    template.innerHTML = ["<div class=\"visu2_menu_anchor devel-mode\">",
        "<div class=\"visu2_menu\">",
        "<div class=\"visu2_menu_content\">",
        "<label for=\"visu2_mode_sp\" onclick=\"switch_visu2('scatterplot')\">",
        "scatterplot",
        "<input id=\"visu2_mode_sp\" name=\"visu2_mode\" type=\"radio\"/>",
        "</label>",
        "<label for=\"visu2_mode_gr\" onclick=\"switch_visu2('graph')\">",
        "graph",
        "<input id=\"visu2_mode_gr\" name=\"visu2_mode\" type=\"radio\" checked/>",
        "</label>",
        "</div>",
        "mode",
        "</div>",
        "</div>",
        "</div>"].join('');

    var separator = template.content.firstChild;

    document.getElementById("visu-container").appendChild(separator);

    var vidjil_vmi = new VidjilVMI();
    vidjil_vmi.setup();

    /* Views
     * Each view is rendered inside a <div> html element (whose id is given as the first paramter),
     * and kept sync with the model given as the other parameter (here 'm').
     * All the views are optional, and several views of the same type can be added.
     */

    var graph = new Graph("visu2", m, db);               // Time graph
    var list_clones = new List("list", "data", m, db);   // List of clones
    var sp = new ScatterPlot("visu", m, db);             // Scatterplot (both grid and bar plot view)
    var sp2;
    var segment = new Aligner("segmenter", m, db);   // Segmenter


    /* Similarity
     * retrieve and compute everything related to the similarity matrix
     */
    var sim = new Similarity(m);

    /* [WIP] report module (optional)
     * This module provides html report functions for a given model
     * [WARNING] Views access are currently hard-coded, this will be soon corrected.
     */
    var report = new Report(m)


    /* [WIP] Builder
     * The builder completes some informations in the menu and provide some tools
     * TODO replace with a menu and info view
     */
    var builder = new Builder(m, db);
    var info = new Info("info", m, builder);


    /* [WIP] Shortcut (optional)
     * This provides keyboard shortcuts to interact with the browser.
     */
    var shortcut = new Shortcut(m)

    var myUrl = new Url(m);
    m.url_manager = myUrl;

    //TODO
    initMenu();

    new VidjilAutoComplete(db);

    var available_tips;
    if (typeof config !== 'undefined')
        available_tips = config.available_tips;
    var my_tips = new TipsOfTheDay(tips, new TipDecorator(), available_tips);
    my_tips.set_container(document.getElementById('tip-container'))
    my_tips.display()
} catch(err) {
    this.db.log_error(err)
}

if (typeof config !== 'undefined' && typeof config.alert !== 'undefined') {
    var alert_title, alert_msg;

    if (typeof config.alert == 'string'){
        alert_title = config.alert;
        alert_msg = undefined;
    }else{
        alert_title = config.alert.title;
        alert_msg = config.alert.msg;
    }

    $("#top-container").addClass("alert");
    $("#alert").append(alert_title);

    if (alert_msg){
        console.log({'type': 'flash', priority:3, 'msg': alert_msg})
        $("#alert").click(function () { console.log({'type': 'flash', priority:2, 'msg': alert_msg}) })
    }
}

if (config.healthcare || false)
{
    document.getElementById("logospan").innerHTML = "(health)";
}

console.log("=== main.js finished ===");



$(document).ajaxStart(function () {

    // 0. Start AJAX sequence
    var ajaxId = 1 + Math.floor(Math.random() * 1000);
    ajaxOn = ajaxId

    timeout = setTimeout(function(){
        if (ajaxOn == ajaxId){
            // 1. Show cursor
            db.ajax_indicator_start()
            setTimeout(function(){
              if (ajaxOn == ajaxId){
                  // 2. Show spinner
                  db.ajax_indicator_long()

                  setTimeout(function(){
                      if (ajaxOn == ajaxId) {
                          // 3. Display message
                          db.ajax_indicator_msg("waiting for server reply")

                          setTimeout(function(){
                              if (ajaxOn == ajaxId) {
                                  // 4. Display another message
                                  db.ajax_indicator_msg("still waiting...")
                              }
                            }, AJAX_TIMEOUT_MSG2);
                      }
                    }, AJAX_TIMEOUT_MSG1);
                }
                }, AJAX_TIMEOUT_LONG);
            }
        }, AJAX_TIMEOUT_START);

})


$(document).ajaxStop(function () {
    //hide ajax indicator
    ajaxOn = 0;
    db.ajax_indicator_stop();
    clearTimeout(timeout);
});

db.ajax_indicator_stop();

// Load regularly notifications
(function worker(){
       adress = config.db_address + 'notification/get_active_notifications'
	db.loadNotifications(adress);
   	setTimeout(worker, NOTIFICATION_PERIOD);
})();

// This function was taken from https://gist.github.com/Rad1calDreamer/46407ccdef492511e80e
$.fn.serializeObject = function(){

    var self = this,
        json = {},
        push_counters = {},
        patterns = {
            "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_]+)\])*$/,
            "key":      /[a-zA-Z0-9_]+|(?=\[\])/g,
            "push":     /^$/,
            "fixed":    /^\d+$/,
            "named":    /^[a-zA-Z0-9_]+$/
        };


    this.build = function(base, key, value){
        base[key] = value;
        return base;
    };

    this.push_counter = function(key){
        if(push_counters[key] === undefined){
            push_counters[key] = 0;
        }
        return push_counters[key]++;
    };

    $.each($(this).serializeArray(), function(){

        // skip invalid keys
        if(!patterns.validate.test(this.name)){
            return;
        }

        var k,
            keys = this.name.match(patterns.key),
            merge = this.value,
            reverse_key = this.name;

        while((k = keys.pop()) !== undefined){

            // adjust reverse_key
            reverse_key = reverse_key.replace(new RegExp("\\[" + k + "\\]$"), '');

            // push
            if(k.match(patterns.push)){
                merge = self.build([], self.push_counter(reverse_key), merge);
            }

            // fixed
            else if(k.match(patterns.fixed)){
                merge = self.build([], k, merge);
            }

            // named
            else if(k.match(patterns.named)){
                merge = self.build({}, k, merge);
            }
        }

        json = $.extend(true, json, merge);
    });

    return json;
};
