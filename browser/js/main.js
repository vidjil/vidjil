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

try {
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

    var url = new Url(m);

    //TODO
    initMenu();

    new VidjilAutoComplete(db.db_address + 'tag/auto_complete');

    var my_tips = new TipsOfTheDay(tips, new TipDecorator(), config.available_tips);
    my_tips.set_container(document.getElementById('tip-container'))
    my_tips.display()
} catch(err) {
    this.db.log_error(err)
}

if (typeof config.alert !== 'undefined') {
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
	db.loadNotifications();
   	setTimeout(worker, NOTIFICATION_PERIOD);
})();
