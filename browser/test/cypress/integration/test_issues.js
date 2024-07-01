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
    cy.openAnalysis("data/demo_lil_l3_tutorial.vidjil", "data/5240_wrong_json.analysis")
    cy.get('#listElem_1 > .nameBox')
      .should("have.text", "IGHV3-9 7/CCCGGA/17 J6*02")

    cy.get('.popup_msg').should("be.visible")
      .invoke('text').should('contain', "Error – incorrect .analysis file")
    return

  })
})
