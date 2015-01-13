/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Antonette Carin <antonin.carette@etudiant.univ-lille1.fr>
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

/*
Javascript object which permits to obtain statistical informations on scatterPlot's data
@param sp: the scatterPlot
*/

function Stats(sp) {
    this.sp = sp;
    this.data = [];
    //gap -> statistical gap
    this.gap = 10;
    //Data returns
    this.average = 0;
    this.median = 0;
    this.layout = [];
}

Stats.prototype = {

    /*usage function*/
    usage: function() {
        /*Average*/
        console.log("**printAverage(): ");
        console.log("\tFonction permettant d'afficher dans la sortie standard la moyenne des longueurs des aretes du jeu de données\n");
        /*Layout*/
        console.log("**printLayout(bool, gap): ");
        console.log("\tPermet d afficher en mode console une représentation de la distribution des arêtes");
        console.log("\t\tbool -> True: Affiche seulement les valeurs dont la distribution est supérieure à 0");
        console.log("\t\tgap: écart (10 par défaut)\n");
        /*Median*/
        console.log("**printMedian(): ");
        console.log("\tPermet d'afficher en mode console la médiane du jeu de données étant analysé\n");
    },

    /*Data reloading*/
    reloadData: function() {
        this.data = this.sp.allEdges;
    },

    /*Function which permits to return the average of data*/
    addAverage: function() {
        if (this.data.length == 0) this.reloadData();
        var sum = 0;
        for (var i = 0; i < this.data.length; i++)
            sum += this.data[i].len;
        sum = sum / this.data.length;
        this.average = sum;
    },

    /*Function which display, in the stdout, the average of the edges's lengths*/
    printAverage: function() {
        this.addAverage();
        console.log("Average of the set of data edges: "+this.average);
    },

    /*Function which allows to return an array, which contains percentages of edges
    @param gap: new gap*/
    addLayout: function(gap) {
        if (this.data.length == 0) this.reloadData();
        if (typeof(gap) != "undefined") this.gap = gap;
        /*Sorted edges array, according to length*/
        var edgesSorted = new Array(100/this.gap);
        for (var i = 0; i < edgesSorted.length; i++)
            edgesSorted[i] = new Array();
        for (var i = 0; i < this.data.length; i++) {
            var around = Math.round(this.data[i].len / this.gap);
            edgesSorted[around].push(this.data[i]);
        }
        /*Added of the edges length distribution*/
        var layoutTab = new Array(edgesSorted.length);
        for (var i = 0; i < layoutTab.length; i++)
            layoutTab[i] = edgesSorted[i].length / this.data.length;
        this.layout = layoutTab;
    },

    /*Function which allow to display (console) a representation of edges distribution
     *@param bool -> True: Only display values which distribution is > 0
     *@param gap: new gap
     */
    printLayout: function(bool, gap) {
        this.addLayout(gap);
        if ((typeof(this.layout) != "undefined") && (this.layout.length != 0)) {
            for (var i = 0; i < this.layout.length; i++) {
                if (bool) {
                    if (this.layout[i] != 0)
                        console.log("["+i * this.gap+","+((i+1) * this.gap)+"]"+": "+this.layout[i]+" %");
                }
                else
                    console.log("["+i * this.gap+","+((i+1) * this.gap)+"]"+": "+this.layout[i]+" %");
            }
        }
    },

    /*Function which permits to compute median of dataset*/
    addMedian: function() {
        if (this.data.length == 0) this.reloadData();
        if (typeof(this.data) != "undefined") {
            var sortedTab = this.data.sort(function(a,b) {if (a.len < b.len) return -1; if (a.len > b.len) return 1; return 0;});
            var tabLength = this.data.length;
            if (tabLength % 2 == 0)
                this.median = sortedTab[tabLength / 2].len;
            else
                this.median = sortedTab[(tabLength + 1) / 2].len;
        }
    },

    /*Function which permits to display median (console mode)*/
    printMedian: function() {
        this.addMedian();
        console.log("Median of the set of data edges: "+this.median);
    },

}
