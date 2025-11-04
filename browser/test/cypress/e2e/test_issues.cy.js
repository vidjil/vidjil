/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test sandbox', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('2589-fix_error_in_renaming_clone',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.clone_rename("4", "un clone")
    cy.clone_rename("4", ">un clone")
    cy.clone_rename("4", "<un clone")

    // To test all possibilities (but very long)
    // for(var i=32;i<127;++i){
    //     cy.clone_rename("4", String.fromCharCode(i) + "un clone")
    // }

    // Clone rename by enter button
    cy.getCloneInList("4")
      .dblclick()
    cy.get('#new_name')
      .type("un clone{enter}")
    cy.get('#listElem_4 > .nameBox')
      .should("contain", "un clone")

    return
  })

  it('4892; views update after aligner sequence deletion',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    
    cy.get('#listElem_0 > .nameBox')
    cy.get('#listElem_3 > .nameBox').click( {ctrlKey: true} )
    cy.get('#listElem_4 > .nameBox').click( {ctrlKey: true} )
    cy.get('#listElem_5 > .nameBox').click( {ctrlKey: true} )

    cy.get('#seq5 > .sequence-holder > .seq-fixed > .nameBox > .delBox > .icon-cancel')
      .click()

    cy.get('#seq4 > .sequence-holder > .seq-fixed > .nameBox > .nameBox2')
      .should('be.visible') // information should still be present

    cy.get('#seq5 > .sequence-holder > .seq-fixed > .nameBox > .nameBox2')
      .should("not.be.visible")
    
    return
  })

  it('error_with_wrong_analysis_format',  function() {
    // With analysis; wrong formated json string
    cy.openAnalysis("browser/test/data/demo_lil_l3_tutorial.vidjil", "browser/test/data/5240_wrong_json.analysis")
    cy.get('#listElem_1 > .nameBox')
      .should("have.text", "IGHV3-9 7/CCCGGA/17 J6*02")

    cy.get('.popup_msg').should("be.visible")
      .invoke('text').should('contain', "Error – incorrect .analysis file")
    return

  })


  it('Normalized size as for MRD', function () {
    // Sample with full normalized values (norm in clone, and norm in germline)
    cy.openAnalysis("tools/tests/data/Demo-MRD_normalized_with_germline.vidjil")

    // If size if 75%, we don't have germline value, and we compute size from simple total normalized value (from reads/normalization/total)
    cy.getCloneSize("0").should("have.text", '75.00%')


    cy.open_menu_settings()

    cy.get('input[type="radio"][name="normalize_list"][value="-1"]')
      .as("radio_no_norm")
    cy.get('input[type="radio"][name="normalize_list"][id="reset_norm_external"]')
      .as("radio_external_norm")


    cy.get('@radio_no_norm')
      .should('not.be.checked');
    cy.get('@radio_external_norm')
      .should('be.checked');


    cy.get('@radio_no_norm')
      .check({ force: true })
      .should('be.checked');
    cy.get('@radio_external_norm')
      .should('not.be.checked');

    cy.getCloneSize("0").should("have.text", '50.00%')

    cy.get('@radio_external_norm')
      .check({ force: true })
      .should('be.checked');

    cy.get('#toogleLocusSystemBox_TRB') // REmove TRB normalized value - 150reads
      .click()

    cy.getCloneSize("0").should("have.text", '83.33%') // 750/850

    cy.get('#toogleLocusSystemBox_TRD') // REmove TRB normalized value - 100reads
      .click()

    cy.getCloneSize("0").should("have.text", '100.0%') //  750/750


    cy.get('@radio_no_norm')
      .check({ force: true })

    cy.getCloneSize("0").should("have.text", '100.0%') // Value still at 100% as only IGH locus active

    cy.get('#toogleLocusSystemBox_TRD')
      .click()
    cy.getCloneSize("0").should("have.text", '71.42%') // 50/70

    // TODO; same data, but without normlize germline value. 
    // In this case, size is computed against total normalization if present
    cy.openAnalysis("tools/tests/data/Demo-MRD_normalized.vidjil")
    cy.getCloneSize("0").should("have.text", '75.00%')
    cy.get('#toogleLocusSystemBox_TRD').click() // No impact on size returned
    cy.get('#toogleLocusSystemBox_TRB').click()
    cy.getCloneSize("0").should("have.text", '75.00%')
    
    cy.get('input[type="radio"][name="normalize_list"][value="-1"]')
      .check({ force: true })

    cy.getCloneSize("0").should("have.text", '100.0%')
    return

  })
})
