

QUnit.module("lib_bioseq", {
});


QUnit.test("degenerated alignment", function(assert) {

    sequence         = "CGTTTTACTACTGTGCTGCGTGTCTGGGGA"
    prim_raw         = "CGTTTTACTACTGTGCTGCGTGTCTGGGGA"
    prim_degen       = "CGTTyTACTACTGTsCTrvGTGTCTGGGGA"
    prim_degen_last  = "CGTTyTACTACTGTsCTrvGTGTCTGGGGd"
    prim_degen_first = "vGTTyTACTACTGTsCTrvGTGTCTGGGGA"

    // identical sequences
    var rst = bsa_align(true, sequence, prim_raw, [1, -2], [-2, -1]) // return [score, start pos, ~cigar]
    var nb_match = bsa_cigar2match(rst[2])
    var cigar    = bsa_cigar2str(rst[2])
    assert.equal(30, nb_match, 'Correct alignment even with degenerated nucleotides (except if last nt is degenerated)')
    assert.equal("30M", cigar, 'Correct cigar even with degenerated nucleotides (except if last nt is degenerated)')
    
    // some degenerated nt
    rst = bsa_align(true, sequence, prim_degen, [1, -2], [-2, -1])
    nb_match = bsa_cigar2match(rst[2])
    cigar    = bsa_cigar2str(rst[2])
    assert.equal(30, nb_match, 'Correct alignment even with degenerated nucleotides')
    assert.equal("30M", cigar, 'Correct cigar even with degenerated nucleotides')
    
    // some degenerated nt + one at last position
    rst = bsa_align(true, sequence, prim_degen_last, [1, -2], [-2, -1])
    nb_match = bsa_cigar2match(rst[2])
    cigar    = bsa_cigar2str(rst[2])
    assert.equal(29, nb_match, 'Correct alignment even with degenerated nucleotides (except if last nt is degenerated)')
    assert.equal("29M1S", cigar, 'Correct cigar even with degenerated nucleotides (except if last nt is degenerated)')
    

    // some degenerated nt + one at first position
    rst = bsa_align(true, sequence, prim_degen_first, [1, -2], [-2, -1])
    nb_match = bsa_cigar2match(rst[2])
    cigar    = bsa_cigar2str(rst[2])
    assert.equal(29, nb_match, 'Correct alignment even with degenerated nucleotides (except if last nt is degenerated)')
    assert.equal("1S29M", cigar, 'Correct cigar even with degenerated nucleotides (except if last nt is degenerated)')
    

})

