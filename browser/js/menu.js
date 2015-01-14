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

function loadData() {
    
    myConsole.closePopupMsg()
    if (m.analysisHasChanged){
        m.analysisHasChanged = false;
        myConsole.popupMsg( myConsole.msg.save_analysis +
            "<div class=\'center\'> <button onclick=\'loadData()\'>Continue</button> "
            +" <button onclick='myConsole.closePopupMsg()'>Cancel</button> </div>"
        )
        return
    }
    
    document.getElementById("file_menu")
        .style.display = "block";
    document.getElementById("axis_choice")
        .style.display = "none";
}

function loadAnalysis() {
    document.getElementById("axis_choice")
        .style.display = "block";
    document.getElementById("file_menu")
        .style.display = "none";
}

function cancel() {
    document.getElementById("axis_choice")
        .style.display = "none";
    document.getElementById("file_menu")
        .style.display = "none";
}

function showSelector(elem) {
        $('.selector')
            .stop()
        $('.selector')
            .css('display', 'none');
        $('#' + elem)
            .css('display', 'block')
            .animate({
                height: $('#' + elem).children(":first").height()
            }, 100);
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
        .stop
    $('#display-menu')
        .toggle("fast");
}
