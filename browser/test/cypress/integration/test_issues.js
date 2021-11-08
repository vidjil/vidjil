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

    return
  })
})
