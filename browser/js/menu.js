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

function Menu () {

}

Menu.prototype = {

}


function initMenu () {
    if (typeof config != 'undefined') {

        if (config.file_menu && config.file_menu.file.length !== 0){
            
            //detect if files are available
            $.ajax({
                type: "GET",
                timeout: 5000,
                crossDomain: true,
                url: prepend_path_if_not_web(config.file_menu.file[0], config.file_menu.path),
                success: function (result) {
                    $('#static_file_menu').css("display", "")
                    var demo_file = document.getElementById("fileSelector").firstChild

                    var buildConfigLink = function (i) {

                        var a = document.createElement('a');
                        a.className = "buttonSelector"
                        a.onclick = function () {
                            var url = prepend_path_if_not_web(config.file_menu.file[i], config.file_menu.path);
                            m.loadDataUrl(url)
                        }

                        a.appendChild(document.createTextNode(config.file_menu.file[i]))

                        demo_file.appendChild(a);
                    }

                    for (var i = 0; i < config.file_menu.file.length; i++) {
                        buildConfigLink(i);
                    }
                },
                error: function() {
                    console.log({"type": "flash", "msg": "Files are not available" , "priority": 1});
                }
            });

        }
        
        if (typeof config.use_database != 'undefined' && config.use_database){
            $("#db_menu").css("display", "");
        }
    }
}

function changeStyle(newStyle){
    if (newStyle=="solarizeD") document.getElementById("palette").href="css/dark.css";
    if (newStyle=="solarizeL") document.getElementById("palette").href="css/light.css";
    if (newStyle=="display") document.getElementById("palette").href="css/talk.css";
    m.update()
}

function loadData() {

    if (m.analysisHasChanged){
        m.analysisHasChanged = false;
        console.log({"type": "popup", "default": "save_analysis",
                    "msg": "<div class=\'center\'> <button onclick=\'loadData()\'>Continue</button> " +
                    " <button onclick='console.closePopupMsg()'>Cancel</button> </div>"});
        return
    }

    document.getElementById("file_menu")
        .style.display = "block";
    document.getElementById("axis_choice")
        .style.display = "none";
    document.getElementById("add_clone_menu")
        .style.display = "none";
}

function loadAnalysis() {
    document.getElementById("axis_choice")
        .style.display = "block";
    document.getElementById("file_menu")
        .style.display = "none";
    document.getElementById("add_clone_menu")
        .style.display = "none";
}

function cancel() {
    document.getElementById("axis_choice")
        .style.display = "none";
    document.getElementById("file_menu")
        .style.display = "none";
    document.getElementById("add_clone_menu")
        .style.display = "none";
}

function showSelector(elem) {
        $('.selector')
            .stop()
        $('.selector')
            .css('display', 'none');
        $('#' + elem)
            .css('display', 'block')
}

function hideSelector() {
    $('.selector')
        .stop()
        .animate({
            height: "hide",
            display: "none"
        }, 100);
}

function showDisplayMenu() {
    $('#display-menu')
        .stop()
    $('#display-menu')
        .toggle("fast");
}

/**
 * Shows the "add manual clone" menu.
 * @param {boolean} error - represents whether the input should be showed in error style.
 */
function showAddManualCloneMenu(error) {
    var addCloneMenuNode = document.getElementById("add_clone_menu");
    addCloneMenuNode.style.display = "block";

    var inputNode = document.getElementById("addclone_input");

    if (error) {
        inputNode.classList.add("error");
        var onFocus = function(evt) {
            evt.target.removeEventListener("focus", onFocus);
            evt.target.classList.remove("error");
        }
        inputNode.addEventListener("focus", onFocus);
    } else {
        inputNode.classList.remove("error");
    }

    document.getElementById("axis_choice")
        .style.display = "none";
    document.getElementById("file_menu")
        .style.display = "none";
}
/**
 * Switch visu2 content between graph and scatterplot
 * @param {string} view - either 'graph' or 'scatterplot', the view to which switch
 */
function switch_visu2(view) {
    var tmp;
    var index;

    index = m.view.indexOf(sp2);
    if (index > -1) m.view.splice(index, 1);
    index = m.view.indexOf(graph);
    if (index > -1) m.view.splice(index, 1);

    if (view == "graph") {
        m.view.push(graph);
        tmp = graph;
        builder.resizeGraph(50)
    }
    else if (view == "scatterplot") {
        sp2 = new ScatterPlot("visu2", m, db, 5);
        tmp = sp2;
        builder.resizeGraph(40)
    }

    tmp.init();
    m.resize()
}
