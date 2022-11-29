/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by VidjilNet consortium and Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Florian Thonier <florian@vidjil.org>
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
 * Warnings list view - build a list of warnings/data and keep them up to date with the model
 * @param {string} id_warnings - dom id of the html who will contain the warnings list
 * @param {Model} model 
 * @class Warnings
 * @constructor 
 * @augments View
 * @this View
 * */
function Warnings(id_warnings, model, database) {
    var self=this;
    
    View.call(this, model);
    this.db = database;
    this.id = id_warnings;

    this.build();
}

Warnings.prototype = {
    
    /**
     * Build html elements needed (except clone and data list)<br>
     * need to be done only once
     * */
    build: function () {
        this.init()
    },
    
    /** 
     * build html elements for clone and data list <br>
     * need to be done after each .vidjil file change
     * */
    init: function () {
        try {
            this.build_warnings()
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /*
     * Take all entries of warnings and build warnings menu content
     */
    build_warnings: function(){
        var self = this;
        var target = document.getElementById("warnings_list")
        target.innerHTML = ""
        var warn_info_sample = this.m.getWarningsClonotypeInfo(this.m.t)
        var warn_info_all    = this.m.getWarningsClonotypeInfo(undefined)

        var warnings_class = Object.keys(warnings_data)
        for (var i = 0; i < warnings_class.length; i++) {
            
            var warning_section = warnings_data[warnings_class[i]]
            var section = this.build_warnings_section(warnings_class[i], warning_section, warn_info_all, warn_info_sample)
            target.appendChild(section)
        }

        var reset = document.createElement("div")
        var text = document.createTextNode("Reset warnings level")
        reset.onclick = () => {self.m.resetWarnings()}
        reset.appendChild(text)
        target.appendChild(reset)
        // TOdo, control if all warning is in a specific section
    },

    /*
     * Build a section for a specific warning type. 
     * Only warnings present will be automaticly showed. 
     * Other will be accessible after a click on expend button
     * warn_class       = name of the warning section to build
     * warning_section  = content of all warning of this type
     * current_warnings = Warnings present in this sample
     */
    build_warnings_section: function(warn_class, warning_section, warn_info_all, warn_info_sample){
        var div = document.createElement("div");
        console.default.log( `warning_section == ${warn_class}`)
        div.id   = warn_class
        div.classList = "menu_box"
        var span_expend = document.createElement("span")
        span_expend.id  = `warn_section_expend_${warn_class}`
        span_expend.innerHTML += `<i id="warn_section_expend_icon_${warn_class}" class='icon-plus' title='Expend to show all warning of this type - "${warn_class}"'></i>`
        span_expend.onclick = () => { self.m.expendWarningSection(warn_class, show=true) }
        var text = document.createTextNode(warn_class)
        div.appendChild(text)
        div.appendChild(span_expend)
        
        Object.keys(warning_section).forEach( (subwarn_code) =>{
            var subwarn = warning_section[subwarn_code]
            div.appendChild( this.build_warning_entrie(subwarn_code, subwarn, warn_info_all, warn_info_sample))
           
        })
        return div
        // target.appendChild(div)
    },

    /*
     * Build a warning panel with current level, increase/decrease button and name of it
     * subwarn_code     Specific code of the warning
     * subwarn          content of the warning
     * current_warnings Warnings present in this sample
     */
    build_warning_entrie: function(subwarn_code, subwarn, warn_info_all, warn_info_sample){
        var self = this
        if (subwarn_code == "W53"){console.default.log( subwarn_code )}
        var sub = document.createElement("div");
        sub.id  = `subwarn_${subwarn_code}`
        sub.style = "margin:3px; display:flew;"
        sub.classList = "buttonSelector warnings_line"
        // console.default.log( subwarn )
        // create line

        var subwarn_level = localStorage.getItem(`warn_${subwarn_code}`) ? Number(localStorage.getItem(`warn_${subwarn_code}`)) : subwarn.level

        var icon_class; var span_warn
        if (subwarn_level == 0) {icon_class = "icon-info"; span_warn=""}
        else if (subwarn_level == 1) {icon_class = "icon-warning-1"; span_warn="warn"}
        else if (subwarn_level == 2) {icon_class = "icon-warning-1"; span_warn="alert"}

        var spans = document.createElement("span")
        spans.classList.add("list")

        // Table with clone/reads number
        var span_warn_show_sample    = document.createElement("span")
        span_warn_show_sample.id     = `warn_span_${subwarn_code}_sample`
        span_warn_show_sample.style  = "border: solid; border-width:2px; border-right:0.5px; min-width:100px; display: inline-block; text-align: right"
        var span_warn_show_all_sample    = document.createElement("span")
        span_warn_show_all_sample.id     = `warn_span_${subwarn_code}_all_samples`
        span_warn_show_all_sample.style  = "border: solid; border-width:2px; border-left:0.5px; min-width:100px; display: inline-block; text-align: right"
        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
            span_warn_show_sample.innerHTML += `${warn_info_sample[subwarn_code].clones.length} (${warn_info_sample[subwarn_code].reads})`
        } else {
            span_warn_show_sample.innerHTML += `0 (0)`
        }

        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
            span_warn_show_all_sample.innerHTML += `${warn_info_all[subwarn_code].clones.length} (${warn_info_all[subwarn_code].reads})`
        } else {
            span_warn_show_all_sample.innerHTML += `0 (0)`
        }
        spans.appendChild(span_warn_show_sample)
        spans.appendChild(span_warn_show_all_sample)
        
        // Action for selection
        var span_select_warn_sample = document.createElement("span")
        span_select_warn_sample.id  = `warn_span_${subwarn_code}_selection_current`
        span_select_warn_sample.innerHTML += `<i class='icon-search-1' title='Select clonotypes with warning ${subwarn_code} (${subwarn.title}) in current sample.'></i>`
        span_select_warn_sample.onclick = ()=> { self.m.selectCloneByWarningLevel(subwarn_code, true) }
        var span_select_warn_all = document.createElement("span")
        span_select_warn_all.id  = `warn_span_${subwarn_code}_selection_all_samples`
        span_select_warn_all.innerHTML += `<i class='icon-search-1' title='Select clonotypes with warning ${subwarn_code} (${subwarn.title}) in all samples.'></i>`
        span_select_warn_all.onclick    = ()=> { self.m.selectCloneByWarningLevel(subwarn_code, false) }
        span_warn_show_sample.appendChild(span_select_warn_sample)
        span_warn_show_all_sample.appendChild(span_select_warn_all)


        var span_bump_minus = document.createElement("span")
        span_bump_minus.id  = `warn_span_${subwarn_code}_minus`
        span_bump_minus.innerHTML += "<i class='icon-minus' title='Increase level of this warning'></i>"
        var span_icon       = document.createElement("span")
        span_icon.classList = span_warn
        span_icon.id        = `warn_span_${subwarn_code}`
        span_icon.innerHTML += `<i class="${icon_class}" title='Current level' id=warn_icon_${subwarn_code}></i>`
        
        var span_bump_plus  = document.createElement("span")
        span_bump_plus.id   = `warn_span_${subwarn_code}_plus`
        span_bump_plus.innerHTML += "<i class='icon-plus' title='Decrease level of this warning'></i>"

        span_bump_minus.onclick = ()=> { self.m.changeWarningLevel(subwarn_code, subwarn_level, "bump-") } 
        span_bump_plus.onclick  = ()=> { self.m.changeWarningLevel(subwarn_code, subwarn_level, "bump+") }

        spans.appendChild(span_bump_minus)
        spans.appendChild(span_icon)
        spans.appendChild(span_bump_plus)
        sub.appendChild(spans)
        
        var div_text = document.createElement("div")
        div_text.style = "margin-left:8px;"

        var text   = document.createTextNode(subwarn_code+" - "+subwarn.title)
        div_text.appendChild(text)
        sub.appendChild(div_text)

        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
        } else {
            sub.classList.add("warnings_section_unpresent")
            sub.style.display = "none"
        }
        return sub
    },
    
    /**
     * update all content for list and data list
     * */
    update: function () {

        this.updateElem(list);
        this.updateElemStyle(list)
        this.build_warnings()
    },



    updateElem: function (list) {
        var self = this;

    },
    
    updateIsPending: function(){
        return false
    }



} //fin prototype
Warnings.prototype = $.extend(Object.create(View.prototype), Warnings.prototype);
