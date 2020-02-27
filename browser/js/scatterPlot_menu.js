/*
 * This file is part of Vidjil <http://www.vidjil.org>,
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


/**
 * ScatterPlot_Menu
 * */

function ScatterPlot_menu(default_preset) {

    // Plot Presets
    this.preset = {
        "V/J (genes)" :             { "x" : "V/5' gene",                "y": "J/3' gene", mode:"grid"},
        "V/J (alleles)" :           { "x" : "V/5 allele",               "y": "J/3 allele"},
        "V/N length" :              { "x" : "V/5' gene",                "y": "N length"},
        "read length / locus" :     { "x" : "clone average read length","y": "locus"},
      //"V/abundance" :             { "x" : "V/5' gene", "y": "size"},
        "read length distribution" :{ "x" : "clone average read length"},
        "V distribution" :          { "x" : "V/5' gene"},
        "N length distribution" :   { "x" : "N length"},
        "CDR3 length distribution" :{ "x" : "CDR3 length (nt)"},
        "J distribution" :          { "x" : "J/3' gene"},
        "compare two samples" :     { "x" : "size",                     "y": "size (other sample)"},
      //"plot by similarity" :      { "x" : "tsneX",                    "y": "tsneY"},
      //"plot by similarity and by locus" :             { "x" : "tsneX_system", "y": "tsneY_system"},
        "clone average read length / GC content " :     { "x":"clone average read length",    "y" : "GC content"},
        "clone consensus coverage / GC content " :      { "x": "clone consensus length",      "y" : "GC content"},
        "number of samples sharing each clone" :        { "x": "number of samples",           "y" : "locus"},
      //"interpolated length between BIOMED2 primers (inclusive)" : { "x": "primers", "y" : "size"},
        "number of deletions for the segment V/5 in 3" :{ "x": "V/5' deletions in 3'"},
        "number of deletions for the segment J/3 in 5" :{ "x": "J/3' deletions in 5'"},
    };

    this.default_preset = (typeof default_preset == "undefined") ? 1 : default_preset 

}

ScatterPlot_menu.prototype = {

    /**
     * build scatterplot menu <br>
     * preset/axisX/axisY selector<br>
     * scatterplot/bargraph selector<br>
     * */
    initMenu: function() {
        var self = this;
        
        var divParent = document.getElementById(this.id)
        var anchor = document.createElement('div');
        anchor.className = "sp_menu_anchor";
        var menu = document.createElement('div');
        menu.className = "sp_menu";
        var content = document.createElement('div');
        content.className = "sp_menu_content";
        
        var div_x = document.createElement('div');
        div_x.className = "axis_select axis_select_x";

        var div_y = document.createElement('div');
        div_y.className = "axis_select axis_select_y";
        
        var div_preset = document.createElement('div');
        div_preset.className = "axis_select axis_select_preset";

        this.select_x = document.createElement('select');
        //Initialisation du menu déroulant
        this.select_x.setAttribute('name', 'select_x[]');
        this.select_x.onchange = function() {
            self.changeXaxis();
            self.cancelPreset();
        }

        this.select_y = document.createElement('select');
        this.select_y.setAttribute('name', 'select_y[]');
        this.select_y.onchange = function() {
            self.changeYaxis();
            self.cancelPreset();
        }
        
        //Ajout de chaque méthode de répartition dans les menus pour l'axe des X/Y
        var element;
        for (var key in this.available_axis) {
            var axisP = Axis.prototype.getAxisProperties(this.available_axis[key])
            if (typeof axisP.hide == "undefined" || !axisP.hide){
                element = document.createElement("option");
                element.setAttribute('value', axisP.name);
                var text = document.createTextNode( axisP.name);
                element.appendChild(text);

                var element2 = element.cloneNode(true);

                this.select_x.appendChild(element);
                this.select_y.appendChild(element2);
            }
        }

        this.select_preset = document.createElement('select');
        this.select_preset.className = "axis_select_preset_select";
        //Initialisation du menu déroulant
        this.select_preset.setAttribute('name', 'select_preset[]');
        this.select_preset.onchange = function() {
            self.updatePreset();
        }
        
        element = document.createElement("option");
        element.setAttribute('value', "custom");
        element.appendChild(document.createTextNode("–"));
        this.select_preset.appendChild(element);

        var p = 0
        for (var i in this.preset) {
            element = document.createElement("option");
            element.setAttribute('value', i);
            element.appendChild(document.createTextNode('[' + (p < 10 ? p : '⇧' + (p-10)) + '] ' + i));
            this.select_preset.appendChild(element);
	    p += 1;
        }
        
        div_x.appendChild(document.createTextNode("x "));
        div_x.appendChild(this.select_x);
        div_y.appendChild(document.createTextNode("y "));
        div_y.appendChild(this.select_y);
        div_preset.appendChild(document.createTextNode("preset "));
        div_preset.appendChild(this.select_preset);
        
        var span_icon_bar = document.createElement('div');
        span_icon_bar.className = "sp_menu_icon";
        span_icon_bar.id = this.id+"_bar";
        jQuery.get("images/bar.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_bar).empty().append(svg);
            }, 'xml');
        span_icon_bar.onclick = function(){
                self.updateMode("bar");
            };
        
        span_icon_plot = document.createElement('div');
        span_icon_plot.className = "sp_menu_icon";
        span_icon_plot.id = this.id+"_plot";
        jQuery.get("images/plot.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_plot).empty().append(svg);
            }, 'xml');
        span_icon_plot.onclick = function(){
                self.updateMode("grid");
            };
        
        var div_mode = document.createElement('div');
        div_mode.className = "sp_menu_mode";
        div_mode.appendChild(span_icon_bar);
        div_mode.appendChild(span_icon_plot);
        
        //Added all childs
        content.appendChild(div_preset);
        content.appendChild(div_mode);
        content.appendChild(div_x);
        content.appendChild(div_y);
        menu.appendChild(document.createTextNode("plot"));
        menu.appendChild(content)
        anchor.appendChild(menu);
        divParent.insertBefore(anchor, divParent.firstChild);
        
        if (this.mode=="bar") $("#"+this.id+"_bar").addClass("sp_selected_mode")
        if (this.mode=="grid") $("#"+this.id+"_plot").addClass("sp_selected_mode")

        this.setPreset(this.default_preset)
    },

    /**
     * check and put the correct currently axis for axisX/Y menu <br>
     * */
    updateMenu: function() {
        var select_x = 0
        var select_y = 0
        var i=0
        
        for (var key in this.available_axis) {
            var axisName = this.available_axis[key]
            if (axisName == this.splitX) select_x = i
            if (axisName == this.splitY) select_y = i
            i++
        }
        this.select_x.selectedIndex = select_x
        this.select_y.selectedIndex = select_y

        $(".sp_menu_icon").removeClass("sp_selected_mode");
        $("#"+this.id+"_"+this.mode).addClass("sp_selected_mode");

        return this;
    },

    /**
     * retrieve and apply selected preset in the preset menu selector
     * */
    changePreset: function(){
        var elem = this.select_preset;
        this.changeSplitMethod(this.preset[elem.value].x, this.preset[elem.value].y);
        this.smartUpdate();
    },

    updatePreset: function(){
        this.changePreset();
        this.smartUpdate();
    },

    setPreset: function(preset){
        this.select_preset.selectedIndex = preset
        this.changePreset()
    },

    /**
     * deactivate preset selection
     */
    cancelPreset: function() {
        this.select_preset.selectedIndex = 0
    },
}