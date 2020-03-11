
QUnit.module("Url", {
});

/* ------------------------------------ */
var current_url = "mock://"
var windowMock = {
    mocked: true,
    location: {
        search: {
            toString: function() { var search = (current_url + '?').split('?')[1] ;
                                   return (search == "" ? "" : '?' + search) }
        }},
    history: {
        pushState: function(x, y, url) { current_url = url }
    }
};
windowMock.window = windowMock
/* ------------------------------------ */

QUnit.test("clone : modifyURL", function(assert) { with (windowMock) {

    m = new Model();
    var db = new Database(m)
    var notification = new Notification(m)
    m.parseJsonData(json_data,100)
    var sp = new ScatterPlot("visu",m);
    sp.init();
    var url= new Url(m, window);
    url.init();
    sp.init();
    // assert.equal(sp.select_preset.selectedIndex,1, "test selected index");
    // assert.equal(sp.default_preset, 1, "test default_preset")

    var done = assert.async(4);
    var delay = 0;
    var step = 500;

    m.select(1)
    m.update()

    setTimeout( function() {
        assert.equal(window.location.search.toString(),"?clone=1", "url is updated with the clone name");
        assert.deepEqual(url.url_dict,{
            "clone": "1"
        }, "test url_dict")

        m.multiSelect([1,2,3])
        m.update()
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(window.location.search.toString(),"?clone=1,2,3", "url is updated with the multiple clone name");
        assert.deepEqual(url.url_dict,{
            "clone": "1,2,3"
        }, "test url_dict");

        m.unselectAll();
        done()
    }, delay+=step);

    
    setTimeout( function() {
        assert.equal(window.location.search.toString(),"", "reboot url");

        sp.init()
        sp.changeSplitMethod("N length", "size", "bar");
        m.update()
        done()
    }, delay+=step);

    setTimeout( function() {
        assert.equal(window.location.search.toString(),"?plot=N length,size,bar", "test if plot is in url");
        done()
    }, delay+=step);
    

}});

QUnit.test("plot : modifyURL",function (assert) { with (windowMock) {

    var done = assert.async(2);
    var delay = 0;
    var step = 500;

    var m = new Model();
    var db = new Database(m)
    var notification = new Notification(m)
    m.parseJsonData(json_data,100)
    var sp = new ScatterPlot("visu",m);
    sp.init();
    var url= new Url(m, window);
    url.init();

    setTimeout( function() {
        sp.changeSplitMethod("N length", "size", "grid");
        m.update()

        done()
    }, delay+=step);  

    setTimeout( function() {
        assert.deepEqual(url.url_dict,{
            "plot": "N length,size,grid"
            }, "test plot url_dict")
        assert.equal(window.location.search.toString(),"?plot=N length,size,grid", "test if plot is in url");

        done()
    }, delay+=step);



}});


