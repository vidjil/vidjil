QUnit.test("console : ", function(assert) {
    console = new Com(console)
    
    stop()
    console.log({msg: 'plop', type: 'flash', priority: 3})
    setTimeout( function() {
        QUnit.start()
        var box = document.getElementsByClassName("flash_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plop"), -1, "console flash : Ok")
    }, 100)
    
    
    stop()
    console.log({msg: 'plup', type: 'popup', priority: 3})
    setTimeout( function() {
        QUnit.start()
        var box = document.getElementsByClassName("popup_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plup"), -1, "console popup : Ok")
        console.closePopupMsg()
        assert.equal(box.innerHTML.indexOf("plup"), -1, "console close popup : Ok")
    }, 100)
    
    
    stop()
    console.log({msg: 'plip', type: 'big-popup', priority: 3})
    setTimeout( function() {
        QUnit.start()
        var box = document.getElementsByClassName("data-container")[0]
        assert.notEqual(box.innerHTML.indexOf("plip"), -1, "console data : Ok")
        console.closeDataBox()
        assert.equal(box.innerHTML.indexOf("plip"), -1, "console close data : Ok")
    }, 100)
    
    stop()
    console.log({msg: 'plap', type: 'log', priority: 3})
    setTimeout( function() {
        QUnit.start()
        var box = document.getElementsByClassName("log_container")[0]
        assert.notEqual(box.innerHTML.indexOf("plap"), -1, "console log : Ok")
    }, 100)
});
