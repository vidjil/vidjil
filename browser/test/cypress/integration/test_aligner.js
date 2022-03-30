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

  //menu in aligner top right corner (focus/hide/tag) are already tested in test_filter.js


  it('01-Aligner stats',  function() {
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")

    cy.get("#top_slider")
      .invoke('val', 5)
      .trigger('change',{ force: true })

    // Select only distrib clonotypes
    cy.selectCloneMulti([20, 21, 22])
    cy.update_icon()

    cy.get('.stats_content').should("have.text", "+5 clonotypes, 50 reads (20.00%) ")

    cy.selectClone(0, true)
    cy.update_icon()

    // Add a real clone
    cy.get('.stats_content').should("have.text", "1+5 clonotypes, 100 reads (40.00%) ")

    // large selection
    cy.selectCloneMulti([0, 1, 2, 3, 4, 17, 18, 19])
    cy.update_icon()

    cy.get('.stats_content').should("have.text", "5+5 clonotypes, 200 reads (80.00%) ")

  })

  it('02-Merge play',  function() {
    cy.openAnalysis("/doc/analysis-example.vidjil")

    cy.selectCloneMulti([1, 37, 90])
    cy.get('#cluster').click()

    cy.getCloneInSegmenter(90)
      .should("be.visible") // Main clone of the cluster should be clone 90
    cy.getCloneInScatterplot(90)
      .should('have.class','circle_select')

    cy.getCloneInSegmenter(1)
      .should("not.be.visible")

    cy.open_cluster(90)

    cy.getCloneInScatterplot(1)
      .should("be.visible")
      .should('have.class','circle_select')

    cy.removeCloneFromCluster(1)
    cy.removeCloneFromCluster(37)

    cy.getCloneInScatterplot(1)
      .should("be.visible")
  })

})
