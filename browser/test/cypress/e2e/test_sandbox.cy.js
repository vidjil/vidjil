/// <reference types="cypress" />

var localhost = true
var url = "./browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test sandbox', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('00-sandbox',  function() {
    // First, you probably want to open an analysis
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")
    // or without analysis
    // cy.openAnalysis("doc/analysis-example2.vidjil")
    
    // After that, do some action ...
    cy.get('.button > .icon-info').click()
    
    return
  })
})
