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


  it('00-sandbox',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    
    cy.get('#listElem_0 > .nameBox')
    cy.get('#listElem_3 > .nameBox').click( {ctrlKey: true} )
    cy.get('#listElem_4 > .nameBox').click( {ctrlKey: true} )
    cy.get('#listElem_5 > .nameBox').click( {ctrlKey: true} )

    cy.get('#seq5 > .sequence-holder > .seq-fixed > .nameBox > .delBox > .icon-cancel')
      .click()

    cy.get('#seq4 > .sequence-holder > .seq-fixed > .nameBox > .nameBox2')
      .should('be.visible') // inforamtion should still be present
    
    return
  })
})
