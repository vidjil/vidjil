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
     * Reset and rebuild html elements needed
     * */
    reset: function () {
        this.init()
    },
    
    /** 
     * build html elements for clone and data list <br>
     * need to be done after each .vidjil file change
     * */
    init: function () {
        try {
            if (this.m.samples == undefined) { return }
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
        var target = document.getElementById(this.id)
        target.innerHTML = ""
        var warn_info_sample = this.m.getWarningsClonotypeInfo(this.m.t)
        var warn_info_all    = this.m.getWarningsClonotypeInfo(undefined)

        var warnings_class = Object.keys(warnings_data)
        for (var i = 0; i < warnings_class.length; i++) {
            
            const warning_section = warnings_data[warnings_class[i]]
            if (sum( Object.keys(warning_section).map( key => { return warning_section[key].visibility}))){ 
                var section = this.build_warnings_section(warnings_class[i], warning_section, warn_info_all, warn_info_sample)
                target.appendChild(section)
            }
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
        var self = this;
        var div  = document.createElement("div");
        div.id   = warn_class
        div.classList = "menu_box"
        var span_expend = document.createElement("span")
        span_expend.id  = `warn_section_expend_${warn_class}`
        span_expend.innerHTML += `<i id="warn_section_expend_icon_${warn_class}" class='icon-plus' title='Expend to show all warning of this type - "${warn_class}"'></i>`
        span_expend.onclick = () => { self.expendWarningSection(warn_class, show=true) }
        var text = document.createTextNode(warn_class)
        div.appendChild(text)
        div.appendChild(span_expend)
        
        Object.keys(warning_section).forEach( (subwarn_code) =>{
            var subwarn = warning_section[subwarn_code]
            if (subwarn.visibility){
                div.appendChild( this.build_warning_entrie(subwarn_code, subwarn, warn_info_all, warn_info_sample))
            }
           
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
        var sub = document.createElement("div");
        sub.id  = `subwarn_${subwarn_code}`
        sub.style = "margin:3px; display:flew;"
        sub.classList = " warnings_line"
        // create line

        var subwarn_level = this.m.getWarningLevelFromCode(subwarn_code)

        var icon_class; var span_warn
        if (subwarn_level == 0) {icon_class = "icon-info"; span_warn=""}
        else if (subwarn_level == 1) {icon_class = "icon-warning-1"; span_warn="warn"}
        else if (subwarn_level == 2) {icon_class = "icon-warning-1"; span_warn="alert"}

        var spans = document.createElement("span")
        spans.classList.add("list")
        spans.style = "display: block ruby; cursor: default"

        // Table with clone/reads number
        var span_intermediate = document.createElement("span")
        span_intermediate.style = "min-width: 25px; display: block;"

        var span_warn_show_sample    = document.createElement("span")
        span_warn_show_sample.id     = `warn_span_${subwarn_code}_sample`
        span_warn_show_sample.classList  = `warning_span`
        var span_warn_show_all_sample    = document.createElement("span")
        span_warn_show_all_sample.id     = `warn_span_${subwarn_code}_all_samples`
        span_warn_show_all_sample.classList  = `warning_span`

        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
            span_warn_show_sample.innerHTML += `${warn_info_sample[subwarn_code].clones.length} (${warn_info_sample[subwarn_code].reads})`
            span_warn_show_sample.title  = `${warn_info_sample[subwarn_code].clones.length} clonotypes in ${warn_info_sample[subwarn_code].reads} reads with warning ${subwarn_code} in the sample ${this.m.getStrTime(this.m.t)}`
        } else {
            span_warn_show_sample.innerHTML += `0 (0)`
            span_warn_show_sample.title  = `0 clonotype in 0 reads with warning ${subwarn_code} in the sample ${this.m.getStrTime(this.m.t)}`
        }

        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
            span_warn_show_all_sample.innerHTML += `${warn_info_all[subwarn_code].clones.length} (${warn_info_all[subwarn_code].reads})`
            span_warn_show_all_sample.title  = `${warn_info_all[subwarn_code].clones.length} clonotypes in ${warn_info_all[subwarn_code].reads} reads with warning ${subwarn_code} in all samples`
        } else {
            span_warn_show_all_sample.innerHTML += `0 (0)`
            span_warn_show_all_sample.title  = `0 clonotype in 0 reads with warning ${subwarn_code} in all samples`
        }
        spans.appendChild(span_warn_show_sample)
        spans.appendChild(span_intermediate)
        spans.appendChild(span_warn_show_all_sample)
        
        // Action for selection
        var span_select_warn_sample = document.createElement("span")
        span_select_warn_sample.id  = `warn_span_${subwarn_code}_selection_current`
        span_select_warn_sample.innerHTML += `<i class='icon-search-1' title='Select clonotypes with warning ${subwarn_code} (${subwarn.title}) in current sample.'></i>`
        span_warn_show_sample.onclick = ()=> { self.m.selectCloneByWarningCode(subwarn_code, true) }
        var span_select_warn_all = document.createElement("span")
        span_select_warn_all.id  = `warn_span_${subwarn_code}_selection_all_samples`
        span_select_warn_all.innerHTML += `<i class='icon-search-1' title='Select clonotypes with warning ${subwarn_code} (${subwarn.title}) in all samples.'></i>`
        span_warn_show_all_sample.onclick    = ()=> { self.m.selectCloneByWarningCode(subwarn_code, false) }
        span_warn_show_sample.appendChild(span_select_warn_sample)
        span_warn_show_all_sample.appendChild(span_select_warn_all)


        var span_warn_switch  = document.createElement("span")
        span_warn_switch.style = "cursor: pointer"
        span_warn_switch.onclick = ()=> { self.m.toogleWarningFilter(subwarn_code) }

        var span_warn_checkbox = document.createElement("input")

        span_warn_checkbox.type = "checkbox"
        span_warn_checkbox.id   = `warn_filter_${subwarn_code}`
        span_warn_checkbox.style   = "margin-left:20px;"
        span_warn_checkbox.checked = !this.m.getWarningFilterStatusFromCode(subwarn_code)

        var span_icon       = document.createElement("span")
        span_icon.id        = `warn_span_${subwarn_code}` 
        // Will be filled by update function
        
        // var span_warn_decrease = document.createElement("span")
        // span_warn_decrease.id  = `warn_span_${subwarn_code}_minus`
        // span_warn_decrease.style = "devel-mode"
        // span_warn_decrease.innerHTML += "<i class='icon-minus' title='Increase level of this warning'></i>"
        // var span_warn_increase  = document.createElement("span")
        // span_warn_increase.id   = `warn_span_${subwarn_code}_plus`
        // span_warn_increase.style  ="devel-mode"
        // span_warn_increase.innerHTML += "<i class='icon-plus' title='Decrease level of this warning'></i>"
        // span_warn_decrease.onclick = ()=> { self.m.changeWarningLevel(subwarn_code, "decrease") } 
        // span_warn_increase.onclick = ()=> { self.m.changeWarningLevel(subwarn_code, "increase") }

        span_warn_switch.appendChild(span_warn_checkbox)
        span_warn_switch.appendChild(span_icon)

        // spans.appendChild(span_warn_decrease)
        // spans.appendChild(span_warn_increase)
        
        var div_text = document.createElement("div")
        div_text.style = "margin-left:8px;"

        var text   = document.createTextNode(subwarn_code+" - "+subwarn.title)
        div_text.appendChild(text)
        span_warn_switch.appendChild(div_text)
        spans.appendChild(span_warn_switch)
        sub.appendChild(spans)

        if (Object.keys(warn_info_sample).indexOf(subwarn_code) != -1){
        } else {
            sub.classList.add("warnings_section_unpresent")
            sub.style.display = "none"
        }
        return sub
    },
    
    getListCode: function(warns){
        var codes = []
        warns.forEach( w => {
            if (w.code != undefined && codes.indexOf(w.code)){
                codes.push(w.code)
            }
        })
        return codes
    },


    expendWarningSection: function(warn_section, show){
        var current_warnings = Object.keys(this.m.getWarningsClonotypeInfo())

        var warns = Object.keys(warnings_data[warn_section])
        for (var i = warns.length - 1; i >= 0; i--) {
            var subwarn_code = warns[i]
            var warn = warnings_data[warn_section][subwarn_code]
            if (!warn.visibility) { continue } // Bypass not implemented warn
            var div  = document.getElementById(`subwarn_${subwarn_code}`)
            if (show == true){
                div.style.display = ""
            } else {
                console.default.log( `Hide - ${subwarn_code}` )
                if (current_warnings.indexOf(subwarn_code) != -1){
                    div.style.display = ""
                } else {
                    div.style.display = "none"
                }
            }
        }
        var self = this;
        var span_expend  = document.getElementById(`warn_section_expend_${warn_section}`)
        var icon_expend  = document.getElementById(`warn_section_expend_icon_${warn_section}`)
        if (show == true){
            icon_expend.classList = 'icon-minus'
            icon_expend.title     = `Hide unpresent warnings of this type - "${warn_section}"`
            span_expend.onclick = () => { self.expendWarningSection(warn_section, show=false) }
        } else {
            icon_expend.classList = 'icon-plus'
            icon_expend.title     = `Expend to show all warning of this type - "${warn_section}"`
            span_expend.onclick = () => { self.expendWarningSection(warn_section, show=true) }
        }
    },
    /**
     * update all content for list and data list
     * */
    update: function () {
        m.clones.forEach( c =>{
            var info_list   = document.getElementById(`clone_infoBox_${c.index}`)
            var info_align  = document.getElementById(`aligner_info_${c.index}`)
            var dom_content = c.getWarningsDom()
            if (info_list != null) {
                info_list.classList = dom_content.className
                info_list.firstChild.classList = dom_content.icon
                info_list.firstChild.title = dom_content.title
            }
            if (info_align != null) {
                info_align.classList = dom_content.className
                info_align.firstChild.classList = dom_content.icon
                info_align.firstChild.title = dom_content.title
            }
        })

        Object.keys(warnings_data).forEach( (category) => {
            Object.keys(warnings_data[category]).forEach( (warn_code) => {
                var current = this.m.getWarningLevelFromCode(warn_code)
                var warn_icon = current > 0 ? 'icon-warning-1' : 'icon-info'
                var warn_text = warnText[current]
                var span = document.getElementById(`warn_span_${warn_code}`)
                if (span != null) {
                    span.innerHTML = ""
                    span.classList = warn_text
                    span.style     = "min-width:24px; display: inline-block;"
                    if (warn_text != ""){
                        span.appendChild(icon(warn_icon))
                        span.firstChild.classList = warn_icon
                        // span.title = `Level of warning ${warn_code}: ${warn_text != "" ? warn_text : "info"}`
                    }
                }

                var checkbox = document.getElementById(`warn_filter_${warn_code}`)
                if (checkbox != null){ checkbox.checked = !this.m.getWarningFilterStatusFromCode(warn_code) }
            })
        })
    },



    updateElem: function (list) {
        var self = this;

    },
    
    updateIsPending: function(){
        return false
    }



} //fin prototype
Warnings.prototype = $.extend(Object.create(View.prototype), Warnings.prototype);
