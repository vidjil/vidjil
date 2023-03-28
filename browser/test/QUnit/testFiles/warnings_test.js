
QUnit.module("Warnings", {
});

QUnit.test("default menu", function(assert) {
    var m = new Model();

    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()
    m.clones[0].warn  = [{"code": "W69", "msg": "Several genes with equal probability", "level": "warn"}]
    m.clones[5].warn  = [{"code": "W82", "msg": "Merged clone has different productivities in some samples", "level": "warn"}]

    console.log( m.clones[1].warn )
    m.clones[1].warn  = [
        {"code": "contigsext_script", "msg": "warning throw by external prefuse script", "level": "alert"},
        {"code": "contigsext_script_info", "msg": "warning throw by external prefuse script; info level", "level": "info"}
    ]

    var warnings = new Warnings("warnings_list", m, false);
    warnings.build_warnings()

    var warnings_list  = document.getElementById("warnings_list")
    var w69_sample     = document.getElementById("warn_span_W69_sample")
    var w69_all_sample = document.getElementById("warn_span_W69_all_samples")

    assert.includes(w69_sample.innerHTML, "1 (10)", "warnings W69; correct value")
    assert.includes(w69_all_sample.innerHTML, "1 (50)", "warnings W69; correct value")

    var Unclassified = document.getElementById("Unclassified")
    var contigs_warn = document.getElementById("subwarn_contigsext_script")
    assert.includes(contigs_warn.innerHTML, "1 (20)", "warnings contigsext_script; exist in warning view")
});
