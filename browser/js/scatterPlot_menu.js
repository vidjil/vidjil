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
        "clone average read length / GC content" :     { "x":"clone average read length",    "y" : "GC content"},
        "clone consensus coverage / GC content" :      { "x": "clone consensus length",      "y" : "GC content"},
        "number of samples sharing each clone" :        { "x": "number of samples",           "y" : "locus"},
      //"interpolated length between BIOMED2 primers (inclusive)" : { "x": "primers", "y" : "size"},
        "number of deletions for the segment V/5 in 3" :{ "x": "V/5' deletions in 3'"},
        "number of deletions for the segment J/3 in 5" :{ "x": "J/3' deletions in 5'"},
        "Primers" :{ "x": "primers"},
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
        
        var template = document.getElementById("scatterplot-menu-content");
        var clone = template.content.firstElementChild.cloneNode(true);   
        
        this.menu = document.createElement('div');
        this.menu.className = "sp_menu";
        this.menu.id        = this.id+"_sp_menu";
        var img = document.createElement("i");
        img.className = "icon-cog";
        this.menu.appendChild(img);
        this.menu.appendChild(clone);

        var anchor = document.createElement('div');
        anchor.className = "sp_menu_anchor";
        anchor.appendChild(this.menu);

        var divParent = document.getElementById(this.id)
        divParent.insertBefore(anchor, divParent.firstChild);

        this.initButton();
        this.initSelect();
        this.initPreset();
        this.initSlider();
        this.updateMenu();
    },

    initButton: function() {
        var self = this;

        this.span_icon_bar =  $(this.menu).find(".sp_menu_icon_bar" )[0];
        this.span_icon_grid = $(this.menu).find(".sp_menu_icon_grid")[0];

        jQuery.get("images/plot.svg", function(data) {
            var svg = jQuery(data).find('svg');
            $(self.span_icon_grid).empty().append(svg);
        }, 'xml');
        this.span_icon_grid.onclick = function(){
            self.updateMode("grid");
        };

        this.span_icon_bar.id = this.id+"_bar";
        jQuery.get("images/bar.svg", function(data) {
            var svg = jQuery(data).find('svg');
            $(self.span_icon_bar).empty().append(svg);
        }, 'xml');
        this.span_icon_bar.onclick = function(){
            self.updateMode("bar");
        };

        if (this.mode=="bar")  $(this.span_icon_bar ).addClass("sp_selected_mode")
        if (this.mode=="grid") $(this.span_icon_grid).addClass("sp_selected_mode")
    },

    initSelect: function() {
        var self = this;

        this.select_x = $(this.menu).find("[name='select_x[]']")[0];
        this.select_y = $(this.menu).find("[name='select_y[]']")[0];

        var element;
        for (var key in this.available_axis) {
            var axisP = Axis.prototype.getAxisProperties(this.available_axis[key])
            if (typeof axisP.hide == "undefined" || !axisP.hide){

                element = document.createElement("option");
                element.setAttribute('value', axisP.name);
                element.appendChild(document.createTextNode( axisP.name));

                this.select_x.appendChild(element);
                this.select_y.appendChild(element.cloneNode(true));
            }
        }

        this.select_x.onchange = function() {
            self.changeXaxis();
            self.cancelPreset();
        }

        this.select_y.onchange = function() {
            self.changeYaxis();
            self.cancelPreset();
        }
    },

    initPreset: function(){
        var self=this;

        this.select_preset = $(this.menu).find("[name='select_preset[]']")[0];

        var p = 0
        for (var i in this.preset) {
            element = document.createElement("option");
            element.setAttribute('value', i);
            element.appendChild(document.createTextNode('[' + (p < 10 ? p : '⇧' + (p-10)) + '] ' + i));
            this.select_preset.appendChild(element);
	        p += 1;
        }

        this.select_preset.onchange = function() {
            self.updatePreset();
        }

        this.setPreset(this.default_preset)
    },

    initSlider: function(){
        var self = this;

        this.slider_x = $(this.menu).find(".slider_x")[0];

        $( this.slider_x ).slider({
            range: true,
            stop: function( event, ui ) {
                self.updateScaleX();
            }
        });

    },

    convertLogtoLoop:function(axis, log){
        var loop=1;
        var log2 = axis.loop_floor;
        while (log>log2*1.0001){
            log2=log2*10;
            loop++;
        } 
        return loop;
    },
    convertLoopToLog:function(axis, loop){
        var log = axis.loop_floor;
        for (var i=1; i<loop; i++)log=log*10;
        return log;
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
        $(this.menu).find(".sp_menu_icon_"+this.mode).addClass("sp_selected_mode");

        if (this.axisX.scale){
            var a = this.axisX

            if (typeof a.scale_custom_min == "undefined") a.scale_custom_min = a.scale.min;
            if (typeof a.scale_custom_max == "undefined") a.scale_custom_max = a.scale.max;

            $(this.slider_x).show();
            $(this.slider_x).slider( "option", "values", [ a.scale_custom_min, a.scale_custom_max ] )
                            .slider( "option", "min", a.scale.min)
                            .slider( "option", "max", a.scale.max)
                            //.slider( "option", "step", a.min_step );

            $(this.menu).find(".slider_x_min").html(a.scale.min);
            $(this.menu).find(".slider_x_value1").html(a.scale_custom_min);
            $(this.menu).find(".slider_x_value2").html(a.scale_custom_max);
            $(this.menu).find(".slider_x_max").html(a.scale.max);

        } else {
            $(this.slider_x).hide();
        }
        
        return this;
    },

    updateScaleX: function(){
        console.log("pouet updateScaleX")
        this.axisX.useCustomScale = true;
        this.axisX.scale_custom_min = $(this.slider_x).slider( "option", "values")[0];
        this.axisX.scale_custom_max = $(this.slider_x).slider( "option", "values")[1];
        this.smartUpdate();
    },

    resetCustomScale: function(){
        this.axisX.scale_custom_min = undefined;
        this.axisX.scale_custom_max = undefined;
        this.axisX.useCustomScale = undefined;
    },

    /**
     * retrieve and apply selected preset in the preset menu selector
     * */
    changePreset: function(){
        this.resetCustomScale();
        var elem = this.select_preset;
        this.changeSplitMethod(this.preset[elem.value].x, this.preset[elem.value].y);
        this.m.update();
        if (typeof db !== 'undefined')
        {
          db.debug('preset-' + (elem.selectedIndex - 1));
        }
    },

    /**
     * retrieve and apply selected splitMethod in the axisX menu selector
     * */
    changeXaxis: function() {
        this.resetCustomScale();
        var elem = this.select_x;
        this.changeSplitMethod(elem.value, this.splitY, this.mode);
        this.smartUpdate();
    },

    /**
     * retrieve and apply selected splitMethod in the axisY menu selector
     * */
    changeYaxis: function() {
        this.resetCustomScale();
        var elem = this.select_y;
        this.changeSplitMethod(this.splitX, elem.value, this.mode);
        this.smartUpdate();
    },

    updatePreset: function(){
        this.changePreset();
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