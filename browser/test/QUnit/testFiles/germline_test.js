test("germline_data : ", function() {

    // Those tests should fail whenever we change the structure of germline.js
    ok(typeof(germline_data) != "undefined", "germline_data should be loaded")
    ok(typeof(germline_data['systems']) != "undefined", "germline_data should have a systems entry")
    ok(typeof(germline_data['systems']['IGH']) != "undefined", "germline_data should have an IGH entry")
    equal(typeof(germline_data['systems']['AZE']), "undefined", "germline_data should not have an AZE entry")
    equal(germline_data['species'], "Homo sapiens", "species in germline_data is Homo sapiens")
})

test("GermlineList : ", function() {
    gl = new GermlineList();
    gl.load()

    ok(gl.getColor('IGH') != "", "IGH should have a color")
    ok(gl.getColor('IGH+') != "", "IGH+ should have a color")
    ok(gl.getColor('TRG') != "", "TRG should have a color")
    ok(gl.getColor('IGL') != "", "IGL should have a color")
    equal(gl.getColor('AZE'), "", "AZE should not have a color")

    ok(gl.getShortcut('IGH') != "", "IGH should have a shortcut")
    ok(gl.getShortcut('IGH+') != "", "IGH+ should have a shortcut")
    ok(gl.getShortcut('TRG') != "", "TRG should have a shortcut")
    ok(gl.getShortcut('IGL') != "", "IGL should have a shortcut")
    equal(gl.getShortcut('AZE'), "x", "AZE should not have a shortcut")

    gl.add({'AZE': { 'shortcut': '$', 'color': '#ffffff'}})
    equal(gl.getColor('AZE'), "#ffffff", "AZE should have a color")
    equal(gl.getShortcut('AZE'), "$", "AZE should have a shortcut")
})
