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
newObject object - usefull to obtains informations of a node (i), if it has ever been visited, marked.
@param i: the id of the newObject object
*/
function newObject(i) {
        this.index = i;
        this.visited = false;
        this.mark = null;
};

/*
Enum object which contains three states of a node
*/
var markEnum = {
    "NOISE": -1,
    "CORE": 0,
    "DENSREACHABLE": 1
};

/*
DBSCAN object
@param sp: the scatterPlot
@param eps: edit distance
@param nbr: number of nodes to have in the cluster (minimal)
*/
function DBSCAN(sp, eps, nbr) {
    //this.D contains all the points
    this.D = sp.nodes;
    //this.datalinks contains all the edges
    this.datalinks = addTabOfEdges(this.D.length, sp.allEdges);
    this.epsilon = eps;
    this.min = nbr;
    //Clusters array
    this.clusters = new Array();
    //Array which contains all the newObject objects
    this.visitedTab = new Array();
    //Creation of the newObject objects
    for (var i = 0; i < this.D.length; i++)
        this.visitedTab.push(new newObject(i));
};

/*
Function which permits to create a double-entries edges array
@param nbrNodes: number of nodes, to create the array
@param allEdges: the edges array
*/
function addTabOfEdges(nbrNodes, allEdges) {
    var tabOfEdges = new Array(nbrNodes);
    for (var i = 0; i < tabOfEdges.length; i++)
        tabOfEdges[i] = new Array(nbrNodes);
    //End of the creation of the double-entries edges array
    if (typeof allEdges != 'undefined'){
        for (var i = 0; i < allEdges.length; i++) {
            //Added length/distance
            tabOfEdges[allEdges[i].source][allEdges[i].target] = allEdges[i].len;
            tabOfEdges[allEdges[i].target][allEdges[i].source] = allEdges[i].len;
        }
    }
    return tabOfEdges;
};

DBSCAN.prototype = {

    /*
    Init algorithm
    */
    runAlgorithm: function() {
        for (var P in this.D) {
            if (!this.visitedTab[P].visited) {
                //Node visited
                this.visitedTab[P].visited = true;
                //Get the neighbours
                var neighborPts = this.regionQuery(P);
                //Noise
                if ((neighborPts.length + 1) < this.min) {
                    this.visitedTab[P].mark = markEnum.NOISE;
                }
                //Core -> expandCluster
                else {
                    var nextCluster = this.clusters.length;
                    this.clusters[nextCluster] = new Array();
                    this.expandCluster(P, neighborPts, nextCluster);
                }
            }
        }
        //Added NOISE clone in a single cluster
        for (var P in this.D)
            if (this.visitedTab[P].mark == markEnum.NOISE) {
                var nextCluster = this.clusters.length;
                this.clusters[nextCluster] = new Array();
                this.clusters[nextCluster].push(P);
            }
    },

    /*
    Function which allows to expand cluster
    @param P: current point - to add in the current cluster
    @param neighborPts: array to know all the neighbors of the current point P
    @param currentCluster: the current cluster
    */
    expandCluster: function(P, neighborPts, currentCluster) {
        this.clusters[currentCluster].push(P);
        //CORE
        this.visitedTab[P].mark = markEnum.CORE;
        for (var i = 0; i < neighborPts.length; i++) {
            var P2 = neighborPts[i];
            //No-visited: OK!
            if (!this.visitedTab[P2].visited) {
                this.visitedTab[P2].visited = true;
                this.visitedTab[P2].mark = markEnum.NOISE;
                var neighborPts2 = this.regionQuery(P2);
                if (neighborPts2.length >= this.min)
                    //Concatenation of arrays which contains the P neighbors
                    neighborPts = neighborPts.concat(neighborPts2.filter(function(newC) {return this.every(function(oldC) {return oldC != newC})}, neighborPts));
            }
            //Else: if NOISE, add to current cluster
            if (this.visitedTab[P2].visited && this.visitedTab[P2].mark == markEnum.NOISE) {
                this.clusters[currentCluster].push(P2);
                //Belong to the cluster
                this.visitedTab[P2].mark = markEnum.DENSREACHABLE;
            }
        }
    },

    /*
    Function which permits to return the list of all the neighbours of the current point
    @param P: currentpoint
    */
    regionQuery: function(P) {
        var neighbors = new Array();
        for (var j = 0; j < this.D.length; j++) {
            var i = this.D[j];
            //Push only if the distance between P and i is <= epsilon
            if (this.getDistance(P, i) <= this.epsilon)
                neighbors.push(i);
        }
        return neighbors;
    },

    /*
    Function which allows to obtain the edit distance between two nodes (in datalinks)
    */
    getDistance: function(P, i) {
        return this.datalinks[P][i];
    }
}
