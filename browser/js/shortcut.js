/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Antonin Carette <antonin.carette@etudiant.univ-lille1.fr>
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
 * provide a bunch of shortkey to manipulate views/model
 * @class Shortcut
 * @constructor
 * */
function Shortcut (model) {
    this.m = model
    View.call(this, model)
    this.init()
    this.on = true
    this.inProgress = 0
}

var NB_CLONES_CHANGE = 10;

Shortcut.prototype = {
    
    /**
     * compute system list and add event listener to document
     * */
    init : function () {
        var self = this
        
        this.system_shortcuts = {}
        for (var system in germline_data.systems){

            if (germline_data.systems[system].shortcut != undefined){ // at init/load, some data are not present
                var keycode = germline_data.systems[system].shortcut.toUpperCase().charCodeAt(0)

                if (typeof this.system_shortcuts[keycode] == "undefined")
                    this.system_shortcuts[keycode] = []

                this.system_shortcuts[keycode].push(system)
            } else {
                console.default.log("Shortcuts; system undefined: " + system)
            }
        }
        
        document.onkeydown = function (e) { self.checkKey(e); }
        document.onkeyup = function (e) { self.m.sp.active_move = false; }
        document.onmousedown = function (e) { self.checkMouse(e); }
    },

    updateInProgress: function() {
        if (this.inProgress>0) return true
        return false
    },

    checkMouse : function (e) {
        var self = this

        this.inProgress++
        setTimeout(function(){
            self.inProgress--
        }, 500)
    },
    
    /**
     * called each time a key is pressed <br>
     * triggers the related function
     * @param {event} e - onkeydown event
     * */
    checkKey : function (e) {
        var self = this

        this.inProgress++
        setTimeout(function(){
            self.inProgress--
        }, 500)

        if (!this.on)
            return ;

        e = e || window.event;

        if (document.activeElement.id !== "")
            return ;
                    
        var key = e.keyCode;
        if (key===0) key = e.which

        console.log("Event:" + e + " keyCode:" + key + " key:" + e.key)

        // Preset shortcuts
        if (! e.ctrlKey && ! e.metaKey &&
             (((key >= 96) && (key <= 105)) || ((key >= 48) && (key <= 57))) ) { // Numeric keypad, 0-9
            var shift = 95;
            if (key<58) shift = 47
            if (e.shiftKey) shift -= 10

            var targetIndex = key - shift
            console.log("setPreset: " + targetIndex)
            try {
                this.m.sp.setPreset(targetIndex)
            }
            catch (err) { } // There can be an error if the preset does not exist

            return
        }

        // System/locus shortcuts
        if (! e.ctrlKey && ! e.metaKey &&
            typeof this.system_shortcuts[key] != "undefined") {

            var germlines = this.system_shortcuts[key].filter(function(g) {return self.m.system_available.indexOf(g) != -1})
            if (germlines.length === 0)
                return

            console.log("Germlines with key " + key + ": " + germlines)

            // Find current germline
            var current = -1 ;
            for (var i = 0; i < germlines.length; i++)
            {
                if (germlines[i] == this.m.germlineV.system)
                    current = i
            }

            // Cycle to next germline
            next_germline = germlines[(current+1) % germlines.length]
            this.m.changeGermline(next_germline, e.shiftKey)

            return
        }

        // Other shortcuts

        // e.which is deprecated, see #2448
        switch(key) {

        case 37 :   // Left arrow
            e.preventDefault()
            if (e.shiftKey || e.metakey)
                m.displayTop(this.m.top - NB_CLONES_CHANGE)
            else
                m.previousTime();
            break;
            
        case 39 :   // Right arrow
            e.preventDefault()
            if (e.shiftKey || e.metakey)
                m.displayTop(m.top + NB_CLONES_CHANGE)
            else
                m.nextTime();
            break;

        case 83 :   // Ctrl+s
            e.preventDefault()
            if (e.ctrlKey || e.metakey) db.save_analysis()
            break;

        case 65 :   // Ctrl+a
            e.preventDefault()
            if (e.ctrlKey || e.metakey){
                var d_m = $("#debug_menu")
                if (d_m.css("display") == "none"){
                    devel_mode = true;
                    $("#debug_menu").css("display", "");
                    $(".devel-mode").show();
                    $(".beta-mode").show();
                }else{
                    devel_mode = false;
                    $("#debug_menu").css("display", "none");
                    $(".devel-mode").hide();
                    $(".beta-mode").hide();
                }
            }
            break;

        case 80 :   //shift+p : open patient
            e.preventDefault()
            if(e.shiftKey || e.metakey) db.reload()
            break;

        case 76 :   // Ctrl+l
            e.preventDefault()
            if (console.toggleLog) console.toggleLog();
            break;

        default:
        }

        switch(e.key) {

            // Cluster clones
        case '+':   // cluster clones
            e.preventDefault()
            m.merge()
            break;
        case 'Backspace': // Revert to previous clusters (and thus undo cluster)
            e.preventDefault()
            m.restoreClusters()
            break;

            // Filter/zoom
        case 'z':
        case 'Z':
            e.preventDefault()
            if (m.getSelected().length === 0) {
                // z, no clone selected: reset filters
                m.removeFilter("Clone", "focus", undefined)
                m.removeFilter("Clone", "hide", undefined)
                m.update()
            } else {
                if (!e.shiftKey)
                    // z, some clone selected: focus (zoom) on these clones
                    m.addFilter("Clone", "focus", self.m.getSelected())
                else
                    // shift+z, some clone selected: hide these clones
                    m.addFilter("Clone", "hide", self.m.getSelected())
            }
            break;
            
            // Scatterplot
        case '#':   // switch grid/bar mode
            e.preventDefault()
            m.sp.switchMode()
            break;
        }
    }
}
Shortcut.prototype = $.extend(Object.create(View.prototype), Shortcut.prototype)
