
QUnit.module("Url", {
});

/* ------------------------------------ */
var initial_url = "mock://";
var current_url = initial_url;

function getSearch(url) {
    var search = url.split('?')[1] ;
    return (search == "" ? "" : '?' + search)
}

function getPathname(url) {
    // remove protocol
    var pathname = url.split('//');
    pathname = pathname[1];
    // remove search
    pathname = pathname.split('?')[0];
    // remove hostname
    pathname = pathname.split('/');
    return '/' + pathname.slice(1).join('/');
}

var windowMock = {
    mocked: true,
    location: {
        search: "",
        pathname: ""
    },
    history: {
        pushState: function(x, y, url) {
            current_url = url;
            windowMock.location.search = getSearch(url);
            windowMock.location.pathname = getPathname(url);
        }
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

QUnit.test("url: parse", function(assert) { with (windowMock) {
    windowMock.history.pushState('plop', 'plop', 'mock://foo.bar?param1=foo&param2=bar');
    var m = new Model();
    var url = new Url(m, windowMock);

    var params = url.parseUrlParams(url.url);
    assert.deepEqual(params, {
        "param1": "foo",
        "param2": "bar"
    }, "test url parse correct url");

    windowMock.history.pushState('plop', 'plop', 'mock://foo.bar?fakeparam&realparam=real');
    url = new Url(m, windowMock);
    params = url.parseUrlParams(url.url);
    assert.deepEqual(params, {
        'realparam': 'real'
    });
}})

QUnit.test("url: generate", function(assert) { with (windowMock) {
    var params = {
        'param1': 'first',
        'param2': 'second',
        'param3': 'third'
    };

    var m = new Model();
    var url = new Url(m, windowMock);
    var param_string = url.generateParamsString(params);
    assert.equal(param_string, "param1=first&param2=second&param3=third");
}});

QUnit.test("url: positional parse", function(assert) { with (windowMock) {
    var m = new Model();
    windowMock.history.pushState('plop', 'plop', 'mock://foo.bar/browser/1/3?param3=third');
    var url = new PositionalUrl(m, windowMock);

    var params = url.parseUrlParams();
    assert.deepEqual(params, {
        'sample_set_id': '1',
        'config': '3',
        'param3': 'third'
    });
}});

QUnit.test("url: positional generate", function(assert) { with (windowMock) {
    var params = {
        'sample_set_id': 1,
        'config': 4,
        'foobar': 'barfoo',
        'param4': 'fourth'
    };

    var m = new Model();
    var url = new PositionalUrl(m, windowMock);
    var param_string = url.generateParamsString(params);
    assert.equal(param_string, '/1/4?foobar=barfoo&param4=fourth');
}});
