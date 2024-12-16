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


  it('addons - primers',  function() {

    // classical primers
    cy.get('#primers_biomed2').should("exist")
    // Addons primers
    cy.get('#primers_added_primers').should("exist")
    return
  })
})
