

QUnit.module("Compare", {
});


QUnit.test("compare", function(assert) {
    
    // avec des valeurs identiques
    // numbers
    getted = compare("42", "42")
    assert.equal(getted, 0, "identical number return 0")
    // only string
    getted = compare("intron-a", "intron-a")
    assert.equal(getted, 0, "identical string return 0")
    // string with number
    getted = compare("intron-42", "intron-42")
    assert.equal(getted, 0, "identical string+number retrun 0")

	 // * Renvoie  0 si les deux chaînes sont strictement équivalentes
	 // * Renvoie -1 si la première chaîne doit être classée avant la deuxième
	 // * Renvoie  1 si la deuxième chaîne doit être classée avant la première
    getted = compare("intron-1", "intron-1-var")
    assert.equal(getted, -1, "string+number have correct return")
    getted = compare("intron-1-var", "intron-1")
    assert.equal(getted, 1, "reverse of the previous")

    getted = compare("intron-vax", "intron-var")
    assert.equal(getted, 1, "string return correct order")
    getted = compare("intron-1-var", "intron-1-vax")
    assert.equal(getted, -1, "reverse of the previous")
    


    getted = compare("42", "512")
    assert.equal(getted, -1, "number return correct order")
    getted = compare("512", "42")
    assert.equal(getted, 1, "reverse of the previous")
    getted = compare("042", "512")
    assert.equal(getted, -1, "number with 0 at first place return correct order")
    getted = compare("512", "042")
    assert.equal(getted, 1, "reverse of the previous")
    
    getted = compare("intron-42*42", "intron-512*42")
    assert.equal(getted, -1, "straing, number + allele return correct order")
    getted = compare("intron-512*42", "intron-42*42")
    assert.equal(getted, 1, "reverse of the previous")

});
