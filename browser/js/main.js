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
    var vmi = new VMI();
    vmi.setupDrawer();
    var panel_instructions = {'mid-container': [{"left-container": ["info-row", "list-row", "data-row"]}, "visu-container", "bot-container"]};
    vmi.setupPanels(panel_instructions);

    vmi.addView("info", "info-row", "");
    vmi.addView("list", "list-row", "");
    vmi.addView("data", "data-row", "");
    vmi.addView("visu", "visu-container", "");
    vmi.addView("visu2", "visu-container", "");
    vmi.setOverlays(["info-row", "list-row", "data-row", "visu-container", "bot-container"]);

    /* Views
     * Each view is rendered inside a <div> html element (whose id is given as the first paramter),
     * and kept sync with the model given as the other parameter (here 'm').
     * All the views are optional, and several views of the same type can be added.
     */

    var graph = new Graph("visu2", m, db);               // Time graph
    var list_clones = new List("list", "data", m, db);   // List of clones
    var sp = new ScatterPlot("visu", m, db);             // Scatterplot (both grid and bar plot view)
    var sp2;
    var segment = new Segment("bot-container", m, db);   // Segmenter


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

    var menu_container = document.getElementById('vmiSelector');
    var menu = vmi.setMenuOptions(new VidjilMenuDecorator());
    menu_container.appendChild(menu);
} catch(err) {
    this.db.log_error(err)
}

if (typeof config !== 'undefined' && typeof config.alert !== 'undefined') {
    $("#top-container").addClass("alert")
    $("#alert").append(config.alert)
    $("#alert").click(function () { console.log({'type': 'popup', 'default': config.alert}) })
}

console.log("=== main.js finished ===");

var timeout;
$(document).ajaxStart(function () {
    //show ajax indicator
    timeout = setTimeout(function(){
        db.ajax_indicator_start()
    }, 600);
}).ajaxStop(function () {
    //hide ajax indicator
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
