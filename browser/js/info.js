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

function Info(model, builder) {
    View.call(this, model);
    this.builder = builder;
}

Info.prototype = {

    init : function () {
        var self = this
        try {
            var parent = document.getElementById("info");
            parent.removeAllChildren();

            var patient_info = typeof this.m.info != 'undefined' ? this.m.info : "";
            var div_patient_info = this.create_generic_info_container(
                    patient_info,
                    'patient_info',
                    'patient_info_text',
                    'patient information',
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

            this.initTag();
        } catch(err) {
            sendErrorToDb(err, this.db);
        }
    },

    updateElem : function (list) {},

    updateElemStyle : function () {},

    resize : function () {},
}