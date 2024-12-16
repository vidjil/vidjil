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


  it('00-escape action',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    // Starting state; all panels should be closed
    cy.get('.info-container').should("not.be.visible")
    cy.get('.data-container').should("not.be.visible")
    cy.get('.popup_container').should("not.be.visible")

    // Open some panel and control
    cy.openCloneInfo(0)                              // open clone panel; zindex 3
    cy.get('.info-container').should("be.visible")
    cy.get('.button > .icon-info').click()           // open sample panel zindex 4
    cy.get('.data-container').should("be.visible")



    // Trigger escape key
    cy.get('body').trigger('keydown', { keyCode: 27});
    cy.get('.data-container').should("not.be.visible")
    cy.get('.info-container').should("be.visible")
    cy.get('body').trigger('keydown', { keyCode: 27});
    cy.get('.info-container').should("not.be.visible")

    // TODO; Don't work for the moment, at opening, focus is loose, need a click anywhere in the body (issue #5090)
    // cy.get('#export_report_menu').click({force: true}) // open popup panel; zindex 15
    // cy.get('.popup_container').should("be.visible")
    // cy.get('body').trigger('keydown', { keyCode: 27});
    // cy.get('.popup_container').should("not.be.visible")
    return
  })
})
