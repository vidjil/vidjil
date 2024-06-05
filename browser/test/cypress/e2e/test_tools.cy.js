/// <reference types="cypress" />

var localhost = true
var url = "./browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test tools', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('00-action on vertical-separator',  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    cy.get("#left-container").should("be.visible")// left menu should be visible
    cy.get("#vertical-separator").click()
    cy.get("#left-container").should("not.be.visible")// left menu is still visible
    cy.get("#vertical-separator").click()
    cy.get("#left-container").should("be.visible")// left menu did not reappear
    return
  })
})
