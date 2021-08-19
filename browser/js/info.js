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

function Info(id, model, builder) {
    View.call(this, model, id);
    this.builder = builder;
}

Info.prototype = {

    init : function () {
        var self = this
        try {
            var parent = document.getElementById(this.id);
            parent.removeAllChildren();

            var patient_info = typeof this.m.info != 'undefined' ? this.m.info : "";
            var div_patient_info = this.create_generic_info_container(
                    patient_info,
                    'patient_info',
                    'patient_info_text',
                    'information',
                    'info');
            parent.appendChild(div_patient_info);

            //global info
            /*var div_analysis_file = this.build_info_line("info_analysis_file", this.m.analysisFileName)
            parent.appendChild(div_analysis_file)*/

            //system
            if (this.m.system =="multi") {
                var div_multi_system = this.build_multi_system();
                parent.appendChild(div_multi_system);
            } else {
                var div_system = this.build_info_line("info_system", this.m.system);
                parent.appendChild(div_system);
            }

            //point info
            var sample_div = document.createElement("div");
            sample_div.className = "sample_details";

            var point_value = this.m.getStrTime(this.m.t, "name");
            point_value = point_value !== "" ? point_value : "-/-";
            var point_name_container = document.createElement("div");
            point_name_container.id  = "info_sample_name"
            point_name_container.className += "inline-block_90 centered ellipsis";
            point_name_container.title = point_value;
            point_name_container.appendChild(document.createTextNode(point_value));

            var infoTime_container = document.createElement("div");
            infoTime_container.className = "inline-block_10";
            var infoTime = self.createClickableElem('span',
                [icon('icon-info', 'sample information')],
                "",
                "button",
                function () {
                    console.log({"type": "big-popup", "msg": self.m.getPointHtmlInfo(self.m.t)});
                }
            );
            infoTime_container.appendChild(infoTime);
            var div_point = this.build_composite_info_line("info_point", [infoTime_container, point_name_container]);

            $(div_point).on("dblclick", function() {
                self.edit(this, "names");
            });

            sample_div.appendChild(div_point);

            var span_date = document.createElement("span");
            span_date.appendChild(document.createTextNode(this.m.getStrTime(this.m.t, "sampling_date")));
            var nav_container = document.createElement("div");
            nav_container.className += " centered inline-block_90";
            nav_container.appendChild(span_date);

            var play_stop_container_div = document.createElement("div");
            play_stop_container_div.className = "inline-block_10";
            sample_div.appendChild(play_stop_container_div);

            if (this.m.samples.order.length > 1) {
                var nextTime = self.createClickableElem('span',
                    [icon('icon-right-open-1', 'next sample')],
                    "",
                    "next_button button",
                    function () {
                        self.m.nextTime();
                    }
                );
                nav_container.appendChild(nextTime);

                if (self.m.isPlaying) {
                    var stop = self.createClickableElem('div',
                        [icon('icon-pause', 'pauses cycling')],
                        "",
                        "stop_button button",
                        function () {
                            self.m.stop();
                        }
                    );

                    play_stop_container_div.appendChild(stop);
                } else {
                    var play = self.createClickableElem('div',
                        [icon('icon-play', 'cycle through samples')],
                        "",
                        "play_button button",
                        function () {
                            self.m.play(self.m.t);
                        }
                    );
                    play_stop_container_div.appendChild(play);
                }

                var previousTime = self.createClickableElem('span',
                    [icon('icon-left-open-1', 'previous sample') ],
                    "",
                    "previous_button button",
                    function () {
                        self.m.previousTime();
                    }
                );
                nav_container.insertBefore(previousTime, nav_container.childNodes[0]);
            }

            var span = self.createClickableElem('span',
                [document.createTextNode("edit")],
                "",
                "button_right",
                function () {
                    self.edit(this, "timestamp");
                }
            );
            var div_date = this.build_composite_info_line("info_date", [play_stop_container_div, nav_container]);

            // div_date.appendChild(span)
            sample_div.appendChild(div_date);

            parent.appendChild(sample_div);

            var reads_div = document.createElement("div");
            reads_div.className = "reads_details";

            // Segmented reads
            var div_segmented = this.build_line_read_number("info_segmented", "analyzed reads", "analyzed", this.m.reads.segmented_all);
            div_segmented.title = "total: " + this.m.toStringThousands(this.m.reads.total[this.m.t]);
            reads_div.appendChild(div_segmented);


            // Segmented reads, on the selected system(s)
            if (this.m.system == "multi") {
                div_segmented = this.build_line_read_number("info_selected_locus", "selected locus", "on selected locus", this.m.reads.segmented);
                reads_div.appendChild(div_segmented);
            }

            parent.appendChild(reads_div);

            var clear_div = document.createElement("div");
            clear_div.className = "clear";
            parent.appendChild(clear_div);

            var div_color = this.build_info_color();
            parent.appendChild(div_color);

            var div_sequence_info = this.create_sample_info_container(
                    this.m.getInfoTime(this.m.t),
                    'sequence_info',
                    'info_text',
                    'sample information',
                    'info');
            parent.appendChild(div_sequence_info);

            this.builder.initTag();
            this.colorMethod = this.m.colorMethod
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    update: function () {
        try {
            this.init();
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    /*
     * */
    edit: function (elem, data) {
        var self = this;
        var id = "edit_value";
        var init_value = self.m.getStrTime(self.m.t, data);
        var save_callback = function() {
            var value = document.getElementById(id).value;
            self.m.samples[data][self.m.t] = value
            self.post_save(self);
        }

        this.build_input_edit(id, elem, init_value, save_callback);
    },

    //TODO rename
    build_edit: function (input, id, elem, callback) {
        var divParent = elem.parentNode;
        divParent.removeAllChildren();

        divParent.appendChild(input);
        divParent.onclick = "";

        $(input).on('save', callback);
        $(input).select();
    },

    build_input_edit: function(id, elem, value, callback) {
        var input = this.create_edit_input(id, value);
        this.build_edit(input, id, elem, callback);
    },

    create_edit_input: function (id, value) {
        var input = this.builder.setupInput(id, "", "text", value);
        this.setup_edit_input(input);
        input.style.width = "200px";
        input.style.border = "0px";
        input.style.margin = "0px";
        return input;
    },

    setup_edit_input: function (input) {
        input.onkeydown = function (e) {
            e = e || window.event;
            var key = e.keyCode;
            if (key === 0) key = e.which;
    //        if (key == 13) $(input).trigger("save");
            else if (key == 27) m.update();
        }
        $(input).focusout(function() {
            setTimeout(function() {
                $(input).trigger("save");
      //          m.update()
            }, 500);
        })
    },

    post_save: function(self) {
        self.builder.build_top_container();
        self.init();
        self.m.update();
        self.m.analysisHasChanged = true;
    },

    update_model_data: function(fieldName, value, field_parent) {
        if (typeof field_parent != 'undefined')
            this.m[field_parent][fieldName]= value;
        else
            this.m[fieldName] = value;
        this.post_save(this);
    },

    update_model_sample_data: function(fieldName, value, field_parent) {
        if (typeof field_parent != 'undefined')
            this.m[field_parent][fieldName][this.m.t]= value;
        else
            this.m[fieldName][this.m.t] = value;
        this.post_save(this);
    },

    /**
     * Update the view. Change the color method if an update is detected in model
     * @param {integer[]} - list - array of clone index
     * */
    updateElemStyle: function (list) {
        if (this.m.colorMethod != this.colorMethod)
            this.update()
        this.colorMethod = this.m.colorMethod

        if (this.m.axisColor.name != this.axisColorName){
            this.axisColorName = this.m.axisColor.name
            this.update()
        }
    },

    create_sample_info_container: function(info, className, id, placeholder, target) {
        var self = this;
        var container = this.create_info_container(info, className, id, placeholder);
        $(textarea).on("change", function() {
            self.update_model_sample_data(target, this.value, "samples");
        });
        return container;
    },

    create_generic_info_container: function(info, className, id, placeholder, target) {
        var self = this;
        var container = this.create_info_container(info, className, id, placeholder);
        $(textarea).on("change", function() {
            self.update_model_data(target, this.value);
        });
        return container;
    },

    create_info_container: function (info, className, id, placeholder, target) {
        var self = this;
        var container = document.createElement('div');
        container.className = className;

        textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.className = 'info_container';
        textarea.innerHTML = info ;
        textarea.setAttribute('placeholder', placeholder);

        $(textarea).data('keys', [this.m.group_id]);
        $(textarea).data('needs-atwho', true);
        $(textarea).on('focus', function() {
            new VidjilAutoComplete().setupTags(this);
        })

        container.appendChild(textarea);

        return container;
    },

    build_multi_system: function () {
        var div = document.createElement('div');
        div.className = "info_line locus_line";

        var span2 = document.createElement('span');
        span2.className = "locus_row";
        var keys = 0;

        var key_list = this.m.system_available;
        

        var last_key = "";

        var checkbox_onchange = function () {
            m.toggle_system(this.id.replace("checkbox_system_",""));
        }

        var span_onclick = function (e) {
            if (e.shiftKey) {
                m.keep_one_active_system(this.firstChild.nextSibling.textContent);
            } else {
                this.firstChild.nextSibling.click();
            }
        }

        for (var k in key_list) {
            key = key_list[k];

            // Are we at the start of a new group of locus ?
            if (key.substring(0,2) != last_key.substring(0,2)) {

                if (keys > 0) {
                    // Flush existing span2
                    div.appendChild(span2);
                    span2 = document.createElement('span');
                    span2.className = "locus_row";
                }

            }
            last_key = key;

            keys += 1 ;

            var checkbox = this.builder.setupInput("checkbox_system_" + key, "", "checkbox", "");
            checkbox.className = "hiddenCheckBox";
            checkbox.appendChild(document.createTextNode(key));
            if (this.m.system_selected.indexOf(key) != -1)
                checkbox.checked=true;

            checkbox.onchange = checkbox_onchange;
            var span_system = this.m.systemBox(key);

            var span = document.createElement('span');
            span.className = "systemBoxNameMenu "+key;
            if (this.m.system_selected.indexOf(key) == -1)
                span.className = "systemBoxNameMenu unchecked " + key;
            span.appendChild(span_system);
            span.appendChild(checkbox);
            span.appendChild(document.createTextNode(key));
            span.onclick = span_onclick;
            span2.appendChild(span);
        }

        div.appendChild(span2);

        return div;
    },

    build_line_read_number: function (id, label, qualifier, read_number) {
        var val = "no read";
        var warning_title = false;
        var warning_class = '' ;

        if (read_number[this.m.t] > 0) {
            var percent = (read_number[this.m.t] / this.m.reads.total[this.m.t]) * 100;
            val = this.m.toStringThousands(read_number[this.m.t]) + " (" + percent.toFixed(2) + "%)";

            if (percent < 10) {
                warning_title = "Very few reads " + qualifier;
                warning_class = "alert";
            } else if (percent < 50) {
                warning_title = "Few reads " + qualifier;
                warning_class = "warning";
            }
        }
        div = this.build_named_info_line(id, label, val, false);

        if (warning_class !== "") {
            var warning_span = document.createElement('span');
            warning_span.className = "warningReads " + warning_class;
            warning_span.appendChild(icon('icon-warning-1', warning_title));
            div.appendChild(warning_span);
        }
        return div;
    },

    build_info_line: function (id, value, className) {
        var val = value !== ""? value : "-/-";
        var span = document.createElement('span');
        if (typeof(className) !== "undefined") {
            if (className) span.className = className;
        }
        span.appendChild(document.createTextNode(val));

        var div = document.createElement('div');
        div.id = id;
        div.className = "info_line";
        div.appendChild(span);

        return div;
    },

    build_composite_info_line: function(id, children) {
        var div = document.createElement('div');
        div.id = id;
        div.className = "info_line";

        for(var i = 0; i < children.length; i++) {
            div.appendChild(children[i])
        }
        return div;
    },

    build_named_info_line: function (id, name, value, className) {
        var div = this.build_info_line(id, value, className);
        var inner_span = div.firstChild;
        div.removeAllChildren();

        var info_row = document.createElement("span");
        info_row.className = "info_row";
        info_row.appendChild(document.createTextNode(name));

        div.appendChild(info_row);
        div.appendChild(inner_span);
        return div;
    },

    build_info_color: function () {
        var self = this;

        var div = document.createElement('div');
        div.className = "info_color centered vertical_space"

        var span0 = document.createElement('span');
        var span1 = document.createElement('span');
        var span2 = document.createElement('span');
        var span3 = document.createElement('span');

        if (m.axisColor){
            this.axisColorName = this.m.axisColor.name
            var a = m.axisColor;

            if (a.labels){
                var keys = Object.keys(a.labels);
                for (var i = 0; i < keys.length; i++) {
                    var l = a.labels[keys[i]]
                    if (typeof l.color != "undefined"){
                        var spantag = document.createElement('span');
                        spantag.className = "tagColorBox tagColor8";
                        spantag.style.backgroundColor = l.color;
                        spantag.value = keys[i];
                        spantag.onclick = function(){
                            self.m.multiSelect(self.m.axisColor.getLabelInfo(this.value).clones)
                        };
                        span2.appendChild(spantag);
                    }
                }
            }

        }
/*
        switch (this.m.colorMethod) {
        case "N":
            span0.appendChild(document.createTextNode("N length"));

            span1.appendChild(document.createTextNode(" 0 "));

            span2.className = "gradient";

            span3.appendChild(document.createTextNode(" " + this.m.n_max + " "));

            break;
        case "Tag":

            var span_onclick = function () {
                self.builder.nextDisplayTag(this);
            }

            for (var i = 0; i < this.m.tag.length; i++) {
                var spantag = document.createElement('span');
                spantag.className = "tagColorBox tagColor" + i;
                spantag.id = "fastTag" + i;
                spantag.onclick = span_onclick;
                span2.appendChild(spantag);
            }

            break;
        case 'productive':
            span0.appendChild(document.createTextNode('not productive '));
            var spanNotProductive = document.createElement('span');
            spanNotProductive.style.backgroundColor = colorProductivity('false');
            spanNotProductive.className = 'tagColorBox';
            var spanProductive = document.createElement('span');
            spanProductive.style.backgroundColor = colorProductivity('true');
            spanProductive.className = 'tagColorBox';
            span1.appendChild(spanNotProductive);
            span1.appendChild(spanProductive);
            span2.appendChild(document.createTextNode('productive'));

            var spanNoCDR3 = document.createElement('span');
            spanNoCDR3.className = 'tagColorBox tagColor8';
            span3.style.marginLeft = '20px';
            span3.appendChild(document.createTextNode(' no CDR3 '));
            span3.appendChild(spanNoCDR3);

            break;
        case "abundance":
            span0.appendChild(document.createTextNode("abundance"));

            span1.appendChild(document.createTextNode(" 0% "));

            span2.className = "gradient";

            span3.appendChild(document.createTextNode(" 100%"));

            break;
        }
*/

        div.appendChild(span0);
        div.appendChild(span1);
        div.appendChild(span2);
        div.appendChild(span3);
        return div;
    },

    createClickableElem: function(type, children, id, className, onclick) {
        var element = document.createElement(type);

        for (var i = 0; i < children.length; ++i)
            element.appendChild(children[i]);
        if (id !== "" && typeof id !== "undefined") element.id = id;
        if(className !== "" && typeof className !== "undefined") element.className = className;

        if (typeof onclick === "function")
            element.onclick = onclick;
        else if (typeof onclick != "undefined")
            console.log("Error: invalid parameter " + onclick + " is not a function");

        return element;
    },
}
Info.prototype = $.extend(Object.create(View.prototype), Info.prototype);
