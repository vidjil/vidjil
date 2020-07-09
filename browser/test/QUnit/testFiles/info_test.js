
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


QUnit.test("read details", function(assert) {

    var m = new Model()
    m.parseJsonData(json_data, 10)
    m.loadGermline()
    m.initClones()

    var builder = new Builder(m)
    var info = new Info("info", m, builder)
    info.init()

    var reads = document.getElementsByClassName('reads_details')[0]
    assert.includes(reads.outerHTML, 'analyzed reads</span><span>200 (100.00%)', 'read details: analyzed reads')
    assert.includes(reads.outerHTML, 'selected locus</span><span>200 (100.00%)', 'read details: selected locus')

    var top_info = document.createElement('div');
    top_info.id = "top_info"
    document.getElementById('info').appendChild(top_info)

    m.keep_one_active_system('IGH')
    info.update();
    var sbnm = document.getElementsByClassName('systemBoxNameMenu')
    assert.includes(sbnm[0].outerHTML, '<span class="systemBoxNameMenu inactive TRG">', 'system box TRG is inactive')
    assert.includes(sbnm[1].outerHTML, '<span class="systemBoxNameMenu IGH">', 'system box IGH is still active')

    var reads = document.getElementsByClassName('reads_details')[0]
    assert.includes(reads.outerHTML, 'analyzed reads</span><span>200 (100.00%)', 'read details: analyzed reads (same than before)')
    assert.includes(reads.outerHTML, 'selected locus</span><span>100 (50.00%)', 'read details: selected locus (only IGH now)')
});
