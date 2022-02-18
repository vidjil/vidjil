var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Aligner', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  
  it('Aligner init',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //check aligner is empty
    cy.get('.sequence-line:visible').should('have.length', 0)

    //check menu has been init
    cy.get('#segmenter_axis_menu').click({force:true})
    cy.get('#segmenter_axis_select').children().should('have.length', 8)

    cy.get('#align-settings').click({force:true})
    cy.get('#align-settings_select').children().should('have.length', 4)

    cy.get('#align-segment-info').click({force:true})
    cy.get('#align-segment-info_select').children().should('have.length', 4)

    cy.get('#align-imgt').click({force:true})
    cy.get('#align-imgt_select').children().should('have.length', 3)
    return
  })

  // test basic features
  it('Aligner select/align/cluster/unselect',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //select clones
    cy.get('#listElem_0').click()
    cy.get('.sequence-line:visible').should('have.length', 1)
    cy.get('#listElem_1').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 2)
    cy.get('#listElem_2').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 3)

    //align
    cy.get('#align').click()
    cy.update_icon()
    cy.get('#seq2').find('.seq_layer_nuc').contains('–') 
    
    //cluster
    cy.get('#cluster').click()
    cy.get('#seq0').contains('clone-001') 
    cy.get('#seq0').contains('97.56%') 
    
    //unselect
    cy.get('#seq0').find('.delBox').click({force:true})
    cy.get('.sequence-line:visible').should('have.length', 0)

    return
  })
  

  it('Aligner axis menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //select clone
    cy.get('#listElem_0').click()
    cy.get('.sequence-line:visible').should('have.length', 1)

    //select more axis info
    cy.get('#segmenter_axis_menu').contains("Sequence length").click({force:true})// add Sequence length
    cy.get('#seq0').find("[class='Sequence length']").contains("119") 

    cy.get('#segmenter_axis_menu').contains("Reads length").click({force:true}) // add Reads length
    cy.get('#seq0').find("[class='Reads length']").contains("?" )

    cy.get('#segmenter_axis_menu').contains("GC content").click({force:true}) // GC content
    cy.get('#seq0').find("[class='GC content']").should('have.length', 0) // failed limited to 5 axis info 

    //remove axis info
    cy.get('#segmenter_axis_menu').contains("Size").click({force:true})
    cy.get('#seq0').find("[class='Size']").should('have.length', 0)

    cy.get('#segmenter_axis_menu').contains("Sequence length").click({force:true})
    cy.get('#seq0').find("[class='Sequence length']").should('have.length', 0)

    cy.get('#segmenter_axis_menu').contains("Reads length").click({force:true})
    cy.get('#seq0').find("[class='Reads length']").should('have.length', 0)
    
    //axis info based on imgt request 
    //TODO : proxy imgt 
    /*
    cy.get('#seq0').find("[class='[IMGT] VIdentity']").should('not.contain', "100%")
    cy.get('#align-imgt').click()
    cy.get('#seq0').find("[class='[IMGT] VIdentity']").contains("100%")
    */
    return
  })

  it('Aligner align menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //select/align clones
    cy.get('#listElem_0').click()
    cy.get('#listElem_1').click({ctrlKey: true})
    cy.get('#align').click()

    //enable/disable align settings
    cy.get('#align-settings').contains("Show only mutations").click({force:true})
    cy.get('#seq1').find(".seq_layer_nuc").contains("·") 
    cy.get('#align-settings').contains("Show only mutations").click({force:true})
    cy.get('#seq1').find(".seq_layer_nuc").should('not.contain', "·")

    cy.get('#align-settings').contains("Highlight mutations").click({force:true})
    cy.get('#seq1').find(".seq_layer_deletion").should('have.css', 'display', 'none')

    cy.get('#align-settings').contains("AA separator").click({force:true})
    cy.get('#seq1').find(".seq_layer_amino_separator").should('have.css', 'display', 'none')

    cy.get('#align-settings').contains("Use AA sequence").click({force:true})
    cy.get('#seq0').find(".seq_layer_amino").should('not.have.css', 'display', 'none')
    cy.get('#seq0').find(".seq_layer_nuc").should('have.css', 'display', 'none')

    return
  })

  it('Aligner highlight menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //select/align clones
    cy.get('#listElem_0').click()

    //enable/disable highlight settings
    cy.get('#seq0').find(".seq_layer_V").should('not.have.css', 'display', 'none')
    cy.get('#align-segment-info').contains("V/D/J genes").click({force:true})
    cy.get('#seq0').find(".seq_layer_V").should('have.css', 'display', 'none')

    cy.get('#seq0').find(".seq_layer_CDR3").should('have.css', 'display', 'none')
    cy.get('#align-segment-info').contains("CDR3").click({force:true})
    cy.get('#seq0').find(".seq_layer_CDR3").should('not.have.css', 'display', 'none')

    return
  })


  // test drawer
  it('Aligner drawer',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //select clones
    cy.get('#listElem_0').click()
    cy.get('.sequence-line:visible').should('have.length', 1)
    cy.get('#listElem_1').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 2)
    cy.get('#listElem_2').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 3)
    cy.get('#listElem_3').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 4)
    cy.get('#listElem_4').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 4)
    cy.get('#listElem_5').click({ctrlKey: true})
    cy.get('.sequence-line:visible').should('have.length', 4)

    //open drawer
    cy.get('#aligner-open-button').click()
    cy.get('.sequence-line:visible').should('have.length', 6)
    
    //close drawer
    cy.get('#aligner-open-button').click()
    cy.get('.sequence-line:visible').should('have.length', 4)

    return
  })


  it('Aligner send to IMGT',{ browser: 'chrome' },  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    //select clone
    cy.get('#listElem_25').click()

    //disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    //toIMGT
    cy.get('#toIMGT').click({force:true})

    //check content
    cy.title().should('eq', 'IMGT/V-QUEST')
    cy.get('.sequences_number').contains("Number of analysed sequences: 1")
    cy.get('.summary_synthesis').contains("Homsap TRBV28*01 F")
    cy.get('.summary_synthesis').contains("Homsap TRBJ2-5*01 F")

    cy.go('back')
    cy.setBrowser(url)
    cy.openAnalysis("doc/analysis-example.vidjil")

    //select clone
    cy.get('#listElem_26').click()

    //disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    //toIMGT
    cy.get('#toIMGT').click({force:true})

    //check content
    cy.title().should('eq', 'IMGT/V-QUEST')
    cy.get('.sequences_number').contains("Number of analysed sequences: 1")
    cy.get('.summary_synthesis').contains("Homsap IGHV3-9*01")
    cy.get('.summary_synthesis').contains("Homsap IGHJ6*02")

    return
  })


  it('Aligner send to IgBlast',{ browser: 'chrome' },  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    //select clone
    cy.get('#listElem_25').click()

    //disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    //toIgBlast
    cy.get('#toIgBlast').click({force:true})

    cy.title().should('eq', 'IgBLAST Search Results')
    cy.get('pre').contains("Length=180")
    cy.get('pre').contains("TRBV28*01")
    cy.get('pre').contains("TRBJ2-5*01")

    cy.go('back')
    cy.setBrowser(url)
    cy.openAnalysis("doc/analysis-example.vidjil")

    //select clone
    cy.get('#listElem_26').click()

    //disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    //toIgBlast
    cy.get('#toIgBlast').click({force:true})

    cy.title().should('eq', 'IgBLAST Search Results')
    cy.get('pre').contains("Length=318")
    cy.get('pre').contains("IGHV3-9*01")
    cy.get('pre').contains("IGHJ6*02")

    return
  })

  it('Aligner send to Blast',{ browser: 'chrome' },  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    //select clone
    cy.get('#listElem_25').click()

    //disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    //toIgBlast
    cy.get('#toBlast').click({force:true})

    cy.title().should('eq', 'BLAST/BLAT search - Homo_sapiens - Ensembl genome browser 105')
    cy.get('.seq-wrapper').contains('>25#TRBV29*01 -1/0/-0 TRBD1*01 -2/0/-5 TRBJ2-5*01')

    return
  })

  it('Aligner send to Arrest',{ browser: 'chrome' },  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    cy.get('#listElem_26').click()

    // disable open in another tab
    cy.get('#post_target_blank').click({force:true})

    // send to Arrest/AssignSbset
    cy.get('#toAssignSubsets').click({force:true})

    cy.title().should('eq', 'ARResT/AssignSubsets @ the BAT cave | results')
    cy.get('fieldset').contains("0 / 1 / 1 were assigned / 'healthy' / submitted")
    cy.get('fieldset').contains('26#IGHV3-9*01_7/CCCGGA/17_IGHJ6*02')

    return
  })

  //menu in aligner top right corner (focus/hide/tag) are already tested in test_filter.js

})
