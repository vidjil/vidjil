/*
* This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
* Copyright (C) 2013, 2014 by Marc Duez <marc.duez@lifl.fr>, Antonin Carette <antonin.carette@etudiant.univ-lille1.fr> and the Vidjil Team
* Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
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
    document.getElementById("file_menu")
        .style.display = "block";
    document.getElementById("analysis_menu")
        .style.display = "none";
}

function loadAnalysis() {
    document.getElementById("analysis_menu")
        .style.display = "block";
    document.getElementById("file_menu")
        .style.display = "none";
}

function cancel() {
    document.getElementById("analysis_menu")
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
