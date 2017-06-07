
QUnit.module("Info", {
});


QUnit.test("container, boxes", function(assert) {

    var m = new Model()
    m.parseJsonData(json_data, 10)
    m.loadGermline()
    m.initClones()

    var builder = new Builder(m)
    var info = new Info("info", m, builder)
    
    assert.equal(info.id, "info", "info.id")    
    info.init()

    var cont = info.create_info_container("bla bla", "cl", "Id", "Placeholder", "target")
    assert.includes(cont.outerHTML, '>bla bla</textarea>', 'create_info_container: content')
    assert.includes(cont.outerHTML, 'placeholder=\"Placeholder\"', 'create_info_container: placeholder')

    var i = document.getElementById('info')
    assert.includes(i.outerHTML, '<span>2014-10-20</span>', 'info contains date')

    var sbnm = document.getElementsByClassName('systemBoxNameMenu')
    assert.equal(sbnm.length, 2, 'two locus boxes')
})

