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

    this.updateCallCount = 0;
    this.updateTime = new Date().getTime();

    this.type = "default";
    this.useSmartUpdate = false;
    this.smartUpdateMinWait = 50; //update will at least wait XXX(ms) before starting 
    this.smartUpdateMaxWait = 2000; //update will start anyway if the wait has been more than XXX(ms)
}
    
View.prototype = {
    
    /**
     * init the view before use
     * @abstract
     * */
    init : function () {
    },
    
    /**
     * update all elements, perform a complete rebuild of the view <br>
     * by default doing a updateElem() on each clone must do the job
     * @abstract
     * */
    update: function () {
        list=[]
        for (var i = 0; i < this.m.clones.length; i++) {
              list.push(i);
        }
        this.updateElem(list); 
    },

    /**
     * wait a small delay (smartUpdateMinWait) before starting the update
     * any addictional update() call during the wait will be discarded and will restart the delay
     * update will be 
     * can be used instead of update()
     * is used by model.js instead of update() if useSmartUpdate is true
     * @param {*} speed  update speed transition in ms
     */
    smartUpdate: function (speed) {
        speed = typeof speed !== 'undefined' ? speed : 500;
        var self = this;

        if (this.updateCallCount==0)
            this.updateTime = new Date().getTime();
        this.updateCallCount++;
        
        var count =  this.updateCallCount;
        setTimeout(function() { self.smartUpdate2(speed, count); }, this.smartUpdateMinWait);
    },

    /**
     * [DO NOT USE]
     * should be used only by smartUpdate()
     * @param {*} speed  update speed transition in ms
     * @param {*} callcount number of update already pending
     */
    smartUpdate2 : function(speed, callcount){
        var elapsedTime = 0;
        elapsedTime = new Date().getTime() - this.updateTime;
        
        if (this.updateCallCount==0){
            //counter has been reset during the timeout (an update has been done)
            this.smartUpdate(speed);
            return this;
        }

        if (callcount == this.updateCallCount 
            //counter did not increased during the timeout -> ready for update
            ||
            elapsedTime > this.smartUpdateMaxWait
            //already XXXms has passed since first call -> start update anyway
            ){

            var tmp = this.updateCallCount;
            this.updateCallCount = 0;
            var startTime = new Date()
                .getTime();
            
            speed = typeof speed !== 'undefined' ? speed : 500;
            this.update(speed);
            
            var stopTime = new Date()
                .getTime() - startTime;

            console.log("update "+this.type+": " + stopTime + "ms "     // the time needed to update the view
                       +"total time: " + elapsedTime + "ms "    // the time since the first update() call
                       +"n:" +tmp);                             // the number of update() call squashed
        }
        
        return this
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

    /**
     * reset the inner data withoout having to initialise the whole view
     * */
    reset : function () {

    },
}
