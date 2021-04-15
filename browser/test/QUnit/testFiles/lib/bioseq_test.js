

QUnit.module("lib_bioseq", {
});


QUnit.test("simple alignment", function(assert) {

    var sequence    = "catcatcatgatgctacg" // clone test5; pos 6 in list
    var mismatch_1  = "catcGtcatgatgctacg" // 1x mismatch
    var mismatch_3  = "catcGtcaCgatcctacg" // 3x mismatch
    var mismatch_3g = "catcGtcaCCCtgctacg" // 3x mismatch; 1gap

    var matrix = [ 1, -2] //square score matrix or [match,mismatch] array
    var gapsc  = [-2, -1] //[gap_open,gap_ext] array; k-length gap costs gap_open+gap_ext*k

    // identical sequences
    var rst = bsa_align(true, sequence, sequence, matrix, gapsc) // return [score, start pos, ~cigar]
    assert.equal("18M", bsa_cigar2str(rst[2]), 'Correct cigar')
    assert.equal(18, rst[0], 'Correct score if perfect match') // +18*1
    console.log( rst )


    // sequences with 1 mimsmatch
    var rst = bsa_align(true, sequence, mismatch_1, matrix, gapsc) // return [score, start pos, ~cigar]
    assert.equal("18M", bsa_cigar2str(rst[2]), 'Correct cigar')
    assert.equal(15, rst[0], 'Correct score if 1 mismatch') // +17*1 -2*1

    // sequences with 3 mimsmatch
    var rst = bsa_align(true, sequence, mismatch_3, matrix, gapsc) // return [score, start pos, ~cigar]
    assert.equal("18M", bsa_cigar2str(rst[2]), 'Correct cigar')
    assert.equal(9, rst[0], 'Correct score if 3 mismatch') // +15*1 -2*3
    console.log( rst )

    // sequences with 1 mimsmatch+1gap
    var rst = bsa_align(true, sequence, mismatch_3g, matrix, gapsc) // return [score, start pos, ~cigar]
    assert.equal("11S7M", bsa_cigar2str(rst[2]), 'Correct cigar')
    assert.equal(7, rst[0], 'Correct score if 1 mismatch + 1gap (len3)') // +14*1 -2*1 -2-1-1
    console.log( rst )

})


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

