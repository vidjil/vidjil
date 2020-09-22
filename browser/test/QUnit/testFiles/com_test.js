
QUnit.module("Console", {
});

QUnit.test("console", function(assert) {

    assert.expect(6);
    var ready = assert.async(4);
 
    console.log({msg: 'plop', type: 'flash', priority: 3})
    setTimeout( function() {
        var box = document.getElementsByClassName("flash_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plop"), -1, "console flash : Ok")
        ready()
    }, 100)
    
    console.log({msg: 'plup', type: 'popup', priority: 3})
    setTimeout( function() {
        var box = document.getElementsByClassName("popup_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plup"), -1, "console popup : Ok")
        console.closePopupMsg()
        assert.equal(box.innerHTML.indexOf("plup"), -1, "console close popup : Ok")
        ready()
    }, 100)
    
    console.log({msg: 'plip', type: 'big-popup', priority: 3})
    setTimeout( function() {
        var box = document.getElementsByClassName("data-container")[0]
        assert.notEqual(box.innerHTML.indexOf("plip"), -1, "console data : Ok")
        console.closeDataBox()
        assert.equal(box.innerHTML.indexOf("plip"), -1, "console close data : Ok")
        ready()
    }, 100)

    console.log({msg: 'plap', type: 'log', priority: 3})
    setTimeout( function() {
        var box = document.getElementsByClassName("log_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plap"), -1, "console log : Ok")
        ready()
    }, 100)
});
