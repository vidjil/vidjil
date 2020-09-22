QUnit.module("Form", {
});

QUnit.test("clipboard", function(assert) {
    console = new Com(console)

    var clipboard_content = "1	pim	tim	2000-10-10	hi\n"+  //patient 1
    "XTHSVJVDKLJSVDVNB\n"+                                  //invalid
    "2	pam	tam	bob	 \n"+                                   //patient 2
    "HPSOHNUHKJNFJKSDFPKJSDFH\n"+                           //invalid
    "3	poum	toum	2002-12-12	ho\n"+                  //patient 3
    "64	poum	toum	2002-12-12	hu	HOSBFPHSDFHBSHD\n"+ //invalid (too many column)
    "1	run1	2002-12-12	\n"+                            //run 1 (with empty info)
    "set1	hi\n"+                                          //set 1
    "1	run1	2002-12-12\n"                               //invalid (3 column, too much for a set, too little for a run)
            
    var parsed_lines = parseClipboard(clipboard_content)
    //check lines
    assert.equal(parsed_lines.length, 5, "found expected valid number of lines")

    //check type
    assert.equal(parsed_lines[0].type , "patient", "valid type for line 1")
    assert.equal(parsed_lines[1].type , "patient", "valid type for line 2")
    assert.equal(parsed_lines[2].type , "patient", "valid type for line 3")
    assert.equal(parsed_lines[3].type , "run",     "valid type for line 4")
    assert.equal(parsed_lines[4].type , "generic", "valid type for line 5")

    //check some content
    assert.equal(parsed_lines[0].patient_id , "1")
    assert.equal(parsed_lines[1].patient_id , "2")
    assert.equal(parsed_lines[2].info , "ho")
    assert.equal(parsed_lines[3].date , "2002-12-12")
    assert.equal(parsed_lines[4].info , "hi")

    console = console.default
});
