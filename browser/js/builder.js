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

function Builder(model, database) {
    if (typeof model != "undefined"){
        View.call(this, model);
    }

    if(typeof database != 'undefined') {
        this.db = database;
    }
    this.width_left_container = $("#left-container")
        .css("width")

    this.drag_separator = false
}

//TODO need a reset function

Builder.prototype = {

    init: function () {
        var self = this;
        try {
            if (document.getElementsByClassName("visu-separator").length == 1){
                d3.select(".visu-separator")
                    .on("mousedown", function () {
                        self.dragSeparator();
                    });
                d3.select("#visu-container")
                    .on("mouseup", function () {
                        self.dropSeparator()
                    })
                d3.select("#visu-container")
                    .on("mousemove", function () {
                        self.updateSeparator()
                    })
            }
            d3.select("#vertical-separator")
                .on("click", function () {
                    self.toggle_left_container()
                });
            d3.select("#vertical-separator-right")
                .on("click", function () {
                    self.toggle_right_container()
                });

            this.build_top_container()
            this.m.tags.update()

            if (this.m.samples.stock_order.length == 1)
                // One sample, two scatterplots
                setTimeout(function() {
                    switch_visu2('scatterplot');
                    document.getElementById("visu2_mode_sp").checked = true;
                })
            else
                // Several samples, one graph and one scatterplot
                setTimeout(function() {
                    switch_visu2('graph');
                })
        } catch (err) {
            sendErrorToDb(err, this.db);
        }
    },

    update: function () {
        try {
            this.build_top_container()
            this.m.tags.update()
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },
    
    updateElem: function () {},

    updateElemStyle: function () {},

    resize: function () {},

    dragSeparator: function () {
        this.drag_separator = true;
    },

    updateSeparator: function () {
        if (this.drag_separator) {
            var coordinates = [0, 0];
            coordinates = d3.mouse(d3.select("#visu-container")
                .node());

            var position = coordinates[1]
            var total_height = document.getElementById("visu-container")
                .offsetHeight;

            if (position < 2 || total_height - position < 2) this.dropSeparator()

            var height = position / total_height * 100
            if (height > 90) height = 100;
            if (height < 10) height = 0;
            this.resizeGraph(height)
        }
    },
    
    resizeGraph : function (graphSize) {
        graphSize = Math.round(graphSize)
        var graph = document.getElementById('visu2');
        graph.style.height = graphSize + "%"
        var sp = document.getElementById('visu');
        sp.style.height = (100-graphSize) + "%"
    },

    dropSeparator: function () {
        if (this.drag_separator) {
            this.drag_separator = false;

            var sel = window.getSelection();
            sel.removeAllRanges();
            //this.m.resize();
        }
    },
    
    build_settings: function () {
        var self = this;
        var normalize_list = document.getElementById("normalize_list");
        normalize_list.removeAllChildren();


        // NO NORM
        var input = document.createElement("input");
        var label = document.createElement("label")

        input.type = "radio";
        input.value= -1;
        input.name = "normalize_list";
        input.id = "reset_norm";
        label.for = "reset_norm"
     
       
        var div = document.createElement("div");
        div.appendChild(input);
        div.classList.add("buttonSelector")

        div.appendChild(document.createTextNode("none"))
        div.onclick = function () {
            this.firstChild.checked=true;
            self.m.set_normalization(self.m.NORM_FALSE)
            self.m.update();
        };
        // check this radio button if correspond to the current normalization
        if (this.m.normalization_mode == this.m.NORM_FALSE) { div.firstChild.checked=true; }
        normalize_list.appendChild(div);

        var input_elem, label_elem, form_div_elem;

        // NORM BY EXPECTED (setted clones)
        tmp_norm_list =[]
        if(m.normalization_list.length>=1){ 
            for (var norm in m.normalization_list) {
                var check=false
                for (var div_id in tmp_norm_list){
                    // console.log( normalize_list[div_id])
                    if (tmp_norm_list[div_id] == m.normalization_list[norm].id){
                        check=true
                    }
                }
                if (check==false) {
                var id=m.normalization_list[norm].id
                var expected_size = m.normalization_list[norm].expected_size   
                input_elem = document.createElement("input");
                label_elem = document.createElement("label")
                label_elem.setAttribute("for","reset_norm"+m.normalization_list[norm].id);
                input_elem.type = "radio";
                input_elem.name = "normalize_list";

                input_elem.id = "reset_norm"+m.normalization_list[norm].id;

                form_div_elem = document.createElement("div");
                form_div_elem.className="buttonSelector";

                form_div_elem.id = "normalizetest"+id
                form_div_elem.dataset.id =id
                form_div_elem.dataset.expected_size=expected_size

                text = m.formatSize(expected_size) + " for " + m.clone(m.normalization_list[norm].id).getShortName()
                form_div_elem.appendChild(input_elem);
                form_div_elem.appendChild(label_elem);

                form_div_elem.appendChild(document.createTextNode(text))

                form_div_elem.onclick = self.div_radio_normalize_expected
                // check this radio button if correspond to the current normalization
                if (this.m.normalization_mode == this.m.NORM_EXPECTED && this.m.normalization.id == id) { form_div_elem.firstChild.checked=true; }
            normalize_list.appendChild(form_div_elem);
            tmp_norm_list.push(m.normalization_list[norm].id)
            }
        }
        }

        // Should disable radio choice if data haven't external normalization
        if (this.m.have_external_normalization == true) {
            // NORM by External normalization
            input_elem = document.createElement("input");
            label_elem = document.createElement("label")
            label_elem.setAttribute("for","reset_norm_external");
            input_elem.type = "radio";
            input_elem.name = "normalize_list";
            input_elem.id   = "reset_norm_external";


            form_div_elem = document.createElement("div");
            form_div_elem.className = "buttonSelector";
            form_div_elem.id        = "normalize_external";

            form_div_elem.appendChild(input_elem);
            form_div_elem.appendChild(label_elem);
            text= "from input data"
            form_div_elem.appendChild(document.createTextNode(text))
            form_div_elem.onclick = function () {
                this.firstChild.checked=true;
                self.m.set_normalization(self.m.NORM_EXTERNAL)
                self.m.update();
            };

            // check this radio button if correspond to the current normalization
            if (this.m.normalization_mode == this.m.NORM_EXTERNAL) { form_div_elem.firstChild.checked=true; }
            normalize_list.appendChild(form_div_elem);
        }

    },

    div_radio_normalize_expected: function () {
        self.m.norm_input.value = ""
        self.m.set_normalization(self.m.NORM_EXPECTED);
        self.m.clone(this.dataset.id).expected= this.dataset.expected_size;
        self.m.compute_normalization(this.dataset.id, this.dataset.expected_size)

        this.firstChild.checked=true;
        self.m.update();
    },


    /* Fonction servant à "déverouiller" l'appel de la fonction compute_normalization(), ainsi qu'à apposer le 'check' au checkBox 'normalize'
     * */
    displayNormalizeButton: function() {
    var normalizeDiv = document.getElementById("normalizeDiv");
    normalizeDiv.style.display="";
	var normalizeCheckbox = document.getElementById("normalize");
	this.m.normalization_switch(true);
    normalizeCheckbox.disabled = false;
	normalizeCheckbox.checked = true;
    },

    buildSystemSelector: function (system){
        var self = this
        var radio=document.createElement("input");
            radio.type="radio";
            radio.name="germline";
            radio.value=system
            if (this.m.germlineV.system==system) radio.checked=true

        div = document.createElement('div');
        div.onclick = function(){
            self.m.changeGermline(system, false)
        }
        div.className="buttonSelector"
        div.appendChild(radio)
        div.appendChild(document.createTextNode(system))

        li = document.createElement('li');
        li.appendChild(div)
        // listGermline.appendChild(li);
    },

    toggle_container: function(container_id) {
        var $container = $("#"+container_id)
        var val = 'none';
        if ($container.css('display') === "none") {
            val = 'flex';
        }
        $container.css('display', val);
        return (val == 'flex') 
        //this.m.resize();
    },

    toggle_left_container: function () {
        var open = this.toggle_container('left-container');
        var icon = $('#vertical-separator').find('.vertical-separator-icon')

        if(open){
            icon.removeClass("icon-right-open")
            icon.addClass("icon-left-open")
        }else{
            icon.removeClass("icon-left-open")
            icon.addClass("icon-right-open")
        }
    },

    toggle_right_container: function() {
        return this.toggle_container('right-container');
    },

    build_top_container: function () {
        var self = this;
        var parent = document.getElementById("top_info");
        if (parent == null) return;
        parent.removeAllChildren();
        parent.appendChild(document.createTextNode(this.m.getPrintableAnalysisName()));

        var selector = document.createElement('div');
        selector.className = 'selector';
        selector.id = 'patientSelector';
        parent.appendChild(selector);
        var interm = document.createElement('div');
        selector.appendChild(interm);
        var menu_box = document.createElement('div');
        menu_box.className = "menu_box";
        interm.appendChild(menu_box);

        if (typeof this.m.sample_set_id != 'undefined') {
            var open_patient = document.createElement('a');
            open_patient.id = "patientSelector_open"
            open_patient.className = "buttonSelector";
            open_patient.appendChild(document.createTextNode("open"));
	    open_patient.onclick = function() {
            if (self.m.samples.config_id != undefined){
                db.call('sample_set/index', {'id' : self.m.sample_set_id, 'config_id':self.m.samples.config_id[self.m.t]});
            } else {
                db.call('sample_set/index', {'id' : self.m.sample_set_id});
            }
	    }
            menu_box.appendChild(open_patient);

            var save_analysis = document.createElement("a");
            save_analysis.className = "buttonSelector"
            if (typeof this.m.custom != 'undefined') save_analysis.className = "buttonSelector devel-mode"
            save_analysis.id = "patientSelector_save"
            save_analysis.appendChild(document.createTextNode("save"));
            save_analysis.onclick = function() {
                db.save_analysis();
            }
            menu_box.appendChild(save_analysis);
        }

        document.title = this.m.getPrintableAnalysisName()
    },

    // Build an html input tag
    setupInput: function(id, name, type, value) {
        var input = document.createElement("input");
        if(id !== "") input.id = id;
        if(name !== "") input.name = name;
        if(value !== "") input.value = value;
        input.type = type;
        return input;
    },

    // Build a clickable div element that triggers model update
    setupNormalizeDiv: function(elem, className) {
        var self = this;
        var div = document.createElement("div");
        var inputNode = this.setupInput("", "normalize_list", "radio", elem.id);
        if (this.m.normalization.id == elem.id) input.checked = true;
        var textNode = document.createTextNode(elem.name + " → " + elem.expected);

        div.onclick = function () {
            self.m.compute_data_normalization(this.firstChild.value);
            this.firstChild.checked = true;
            self.m.update();
        }

        div.className = className;
        div.appendChild(inputNode);
        div.appendChild(textNode);
        return div;
    },
}
Builder.prototype = $.extend(Object.create(View.prototype), Builder.prototype);
