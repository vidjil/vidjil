/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics
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


/* Views
 * Each view is rendered inside a <div> html element (whose id is given as the first paramter),
 * and kept sync with the model given as the other parameter (here 'm').
 * All the views are optional, and several views of the same type can be added.
 */

var graph = new Graph("visu2", m);               // Time graph
var list_clones = new List("list", "data", m);   // List of clones
var sp = new ScatterPlot("visu", m);             // Scatterplot (both grid and bar plot view)
var segment = new Segment("bot-container", m);   // Segmenter


/* [WIP] Builder
 * The builder completes some informations in the menu and provide some tools
 * TODO replace with a menu and info view
 */
var builder = new Builder(m);


/* [outdated] PDF
 * This is an outdated module, replaced by report. It will be removed in a future release
 */
var pdf = new PDF(m, "visu2_svg")


/* [WIP] report module (optional)
 * This module provides html report functions for a given model
 * [WARNING] Views access are currently hard-coded, this will be soon corrected.
 */
var report = new Report(m)


/* Database (optional)
 * This links the model to a patient database (possibly the one defined in config.js)
 */
var db = new Database(m);


/* [WIP] Shortcut (optional)
 * This provides keyboard shortcuts to interact with the browser.
 */
var shortcut = new Shortcut()


//TODO 
initMenu();