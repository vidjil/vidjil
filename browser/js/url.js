function Url(model) {
    View.call(this, model);
    this.m = model;
}

Url.prototype= {

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

    updateModel:function() {

    },

};
