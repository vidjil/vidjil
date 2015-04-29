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


/** View constructor <br>
 * super-class for all view <br>
 * contains all functions required by the model to interact with a view. <br>
 * the model don't need anything else to handle a view.
 * @class View
 * @constructor 
 * */
function View(model) {
    this.m = model;
    this.m.view.push(this); //Model's sync
}
    
View.prototype = {
    
    /**
     * init the view before use
     * @abstract
     * @return {object] this
     * */
    init : function () {
        return this
    },
    
    /**
     * update all elements, perform a complete rebuild of the view <br>
     * by default doing a updateElem() on each clone must do the job
     * @abstract
     * */
    update: function () {
        for (var i = 0; i < this.m.clones.length; i++) {
            this.updateElem([i]);   
        }
    },
    
    /**
     * update(size/style/position) a list of selected clones <br>
     * a slight function for operation who impact only a bunch of clones (merge/split/...)
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElem : function (list) {
        
    },
    
    /**
     * update(style only) a list of selected clones <br>
     * a slight function for operation who impact only styles of clones (select/focus)
     * @abstract
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle : function () {
        
    },
    
    /**
     * resize view to match his div size <br>
     * each view must be able to match the size of it's div
     * @abstract
     * */
    resize : function () {
        
    },
}