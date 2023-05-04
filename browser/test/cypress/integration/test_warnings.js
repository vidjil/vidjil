
/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test tools', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('00-action on vertical-separator',  function() {
    cy.openAnalysis("browser/test/data/fused_multiple_distrib_locus.vidjil")

    cy.get("#warn_span_W69_sample").should("have.text","1 (50)")

    cy.get("body").type("{rightarrow}")
    cy.get("#warn_span_W69_sample").should("have.text","1 (95)")
    // cy.get('#warnings_menu').trigger('mousemove', { which: 1, pageX: 350, pageY: 10 })
    return
  })
})
