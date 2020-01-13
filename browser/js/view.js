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

    //smartUpdate
    this.useSmartUpdate = true;
    this.updateCallCount = 0;
    this.updateTime = new Date().getTime();
    this.updateMinWait = 50;    //update will at least wait XXX(ms) before starting 
    this.updateMaxWait = 2000;  //update will start anyway if the wait has been more than XXX(ms)

    //smartUpdateElem
    this.useSmartUpdateElem = true;
    this.updateElemCallCount = 0;
    this.updateElemTime = new Date().getTime();
    this.updateElemList = {};
    this.updateElemMinWait = 50;    //update will at least wait XXX(ms) before starting 
    this.updateElemMaxWait = 200;   //update will start anyway if the wait has been more than XXX(ms)

    //smartUpdateElemStyle
    this.useSmartUpdateElemStyle = true;
    this.updateElemStyleCallCount = 0;
    this.updateElemStyleTime = new Date().getTime();
    this.updateElemStyleList = {};
    this.updateElemStyleMinWait = 10;   //update will at least wait XXX(ms) before starting 
    this.updateElemStyleMaxWait = 50;   //update will start anyway if the wait has been more than XXX(ms)
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
     * wait a small delay (updateMinWait) before starting the update
     * any addictional update() call during the wait will be discarded and will restart the delay
     * update will be 
     * can be used instead of update()
     * is used by model.js instead of update() if useSmartUpdate is true
     * @param {*} speed  update speed transition in ms
     */
    smartUpdate: function (speed) {
        var self = this;

        if (this.updateCallCount==0)
            this.updateTime = new Date().getTime();
        this.updateCallCount++;
        
        var count =  this.updateCallCount;
        setTimeout(function() { self.smartUpdate2(speed, count); }, this.updateMinWait);
    },

    /**
     * [DO NOT USE]
     * should be used only by smartUpdate()
     * @param {*} speed  update speed transition in ms
     * @param {*} callcount number of update already pending
     */
    smartUpdate2 : function(speed, callcount){   
        var elapsedTime = new Date().getTime() - this.updateTime;

        if (this.updateCallCount==0) //an update has already been done
        {
            this.smartUpdate(speed); //reschedule this update for next round
            return this;
        }

        if ( callcount == this.updateCallCount || 
        //counter did not increased during the timeout -> ready for update
             elapsedTime > this.updateMaxWait)
        //already XXXms has passed since first call -> start update anyway
        {
            var tmp = this.updateCallCount;
            this.updateCallCount = 0;
            var startTime = new Date().getTime();           
            this.update(speed);
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
     * same as smartUpdate but for updateElem
     * */
    smartUpdateElem: function (list) {
        var self = this;

        for(var i = 0 ; i < list.length; i++)
            this.updateElemList[list[i]] = true;

        if (this.updateElemCallCount==0)
            this.updateElemTime = new Date().getTime();
        this.updateElemCallCount++;
        
        var count =  this.updateElemCallCount;
        setTimeout(function() { self.smartUpdateElem2(count); }, this.updateElemMinWait);
    },

    smartUpdateElem2 : function(callcount){
        var elapsedTime = new Date().getTime() - this.updateElemTime;

        if (Object.keys(this.updateElemList).length == 0) 
            return this

        if (this.updateElemCallCount==0)
        {
            this.smartUpdateElem([]);
            return this;
        }

        if (callcount == this.updateElemCallCount || elapsedTime > this.updateElemMaxWait)
        {
            var tmp = this.updateElemCallCount;
            this.updateElemCallCount = 0;
            var startTime = new Date().getTime();
            
            this.updateElem(Object.keys(this.updateElemList));
            this.updateElemList = {};
        }
        
        return this
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
     * same as smartUpdate but for updateElemStyle
     * */
    smartUpdateElemStyle: function (list) {
        var self = this;

        for(var i = 0 ; i < list.length; i++)
            this.updateElemStyleList[list[i]] = true;

        if (this.updateElemStyleCallCount==0)
            this.updateElemStyleTime = new Date().getTime();
        this.updateElemStyleCallCount++;
        
        var count =  this.updateElemStyleCallCount;
        setTimeout(function() { self.smartUpdateElemStyle2(count); }, this.updateElemStyleMinWait);
    },

    smartUpdateElemStyle2 : function(callcount){   
        var elapsedTime = new Date().getTime() - this.updateElemStyleTime;

        if (Object.keys(this.updateElemStyleList).length == 0) 
            return this

        if (this.updateElemStyleCallCount==0)
        {
            this.smartUpdateElem([]);
            return this;
        }

        if (callcount == this.updateElemStyleCallCount || elapsedTime > this.updateElemStyleMaxWait)
        {
            var tmp = this.updateElemStyleCallCount;
            this.updateElemStyleCallCount = 0;
            var startTime = new Date().getTime();
            
            this.updateElemStyle(Object.keys(this.updateElemStyleList));
            this.updateElemStyleList = {};
        }
        return this
    },

    /**
     * return true if an update/elem/style has been call but is pending
     * @abstract
     * */
    updateIsPending: function(){
        if (this.useSmartUpdate && this.updateCallCount>0)
            return true;
        if (this.useSmartUpdateElem && Object.keys(this.updateElemList).length>0)
            return true;
        if (this.useSmartUpdateElemStyle && Object.keys(this.updateElemStyleList).length>0)
            return true;
        return false;
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
