var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('External Aligner', function () {
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
    cy.get('#align-segment-info_select').children().should('have.length', 7)

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


  it('Aligner external provider - mix locus',  function() {
    cy.openAnalysis("data/demo_lil_l3_0.vidjil")

    cy.selectCloneMulti([1, 4]) // Locus IGH && TRG

    cy.get('#align-refresh-button')
      .should("be.visible")

    // before calling provider
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")


    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .click({force:true})

    // Both clonotype have a result
    cy.get('#seq1 > .sequence-holder > .seq-fixed > .axisBox > .VIdentity > .identityBox > .identityBad')
      .should("be.visible") // IGH locus
    cy.get('#seq4 > .sequence-holder > .seq-fixed > .axisBox > .VIdentity > .identityBox > .identityBad')
      .should("be.visible") // TRG locus

    return
  })


  it('Aligner external provider',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    cy.get('#polyline0').click()
    cy.get('#align-refresh-button')
      .should("be.visible")

    // before calling provider
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")

    cy.get('#toIMGTseg').click({force:true})

    cy.get('.identityBad')
      .should("be.visible")

    cy.get('#align-refresh-button > span > i')
      .should("have.class", "icon-ok")

    cy.get('#align-refresh-button')
      .should("be.visible")

    cy.get('#align-refresh-button > span > i')
      .should("have.class", "icon-ok")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-ok")

    // test after add of one new clonotype
    cy.selectClone(1, true)
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")


    // TODO; testing menu hover is not possible by cypress fro the moment
    // Default config have provider IMGT, but not CloneDB
    // Only imgt button should be displayed
    cy.get("#toIMGTseg").should('not.have.css', 'display', 'none')
    cy.get("#toCloneDBseg").should('have.css', 'display', 'none')


    return
  })

  it('Aligner external provider reset if trimming',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    cy.get('#polyline0').click()

    cy.get('#align-refresh-button')
      .should("be.visible")

    // before calling provider
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")

    cy.get('#toIMGTseg').click({force:true})

    cy.get('.identityBad')
      .should("be.visible")

    cy.get('#align-refresh-button > span > i')
      .should("have.class", "icon-ok")

    cy.get("#primers_ecngs").click({force:true})

    cy.get("#remove_primer_external").click({force:true})

    // after trimming call
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")
    return
  })



  it('Aligner external provider - Get Correct Videntity',  function() {
    // Use ins/del event if available
    cy.openAnalysis("data/demo_lil_l3_tutorial.vidjil")

    cy.selectClone(4)

    cy.get('#align-refresh-button')
      .should("be.visible")

    // before calling provider
    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .should("exist")
    cy.get("#icon_external_IMGT")
      .should("have.class", "icon-arrows-ccw")

    cy.get('#align-refresh-button > span > .icon-arrows-ccw')
      .click({force:true})

    // Make test on aligner before to be sure that data have been received
    cy.get('#seq4 > .sequence-holder > .seq-fixed > .axisBox > .VIdentity > .identityBox > .identityBad')
      .should("be.visible") // TRG locus
      .should("not.have.text", "100%") // If use ins/del, value is not 100%

    // Now panel will include imgt information
    cy.get('#listElem_4 > #clone_infoBox_4 > .icon-info')
      .click()
    cy.get('#modal_line_value_V-REGION_identity__with_ins_del_events_')
      .should("have.text", "99.10")

    return
  })

})
