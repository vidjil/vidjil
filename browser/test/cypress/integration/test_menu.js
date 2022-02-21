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


  it('00-normalization_none',  function() {
    // test_00_normalization_none
    cy.openAnalysis("/doc/analysis-example.vidjil")
    
    cy.open_menu_settings()

    cy.get('#normalize_list').should("be.visible") // "After clicking normalize_list form should be visible"
    cy.get('#reset_norm').should("be.visible")     // "Form have the input for reset normalization"
  
    // test_01_normalization_expected
    cy.getCloneSize("25").should("have.text", '0.129%') // Span show correct size before normalization"
    cy.get('#tag_icon_25').click()

    cy.get('#norm_button').type('0.1{enter}')
    cy.getCloneSize("25").should("have.text", '10.00%') //Span show correct normalized size

    cy.open_menu_settings()
    cy.get('#normalize_list').should("be.visible") // "After clicking normalize_list form should be visible"
    cy.get('#reset_norm').should("be.visible") 

    cy.get('#reset_norm').click()
    cy.pressKey("escape")
    cy.close_menu()
    cy.getCloneSize("25").should("have.text", '0.129%') // Span show correct size after reset normalization


    // test_02_normalization_external
    cy.getCloneSize("1").should("have.text", '0.081%') // Span show correct size after reset normalization
    cy.open_menu_settings()
        
    cy.get('#normalize_list').should("be.visible") // After clicking normalize_list form should be visible
    cy.get('#normalize_external').should("be.visible")// Form have the input for external normalization
    cy.get('#normalizetest25').should("be.visible")// Form still have the input for expected normalization
        
    cy.get('#normalize_external').click()
    cy.getCloneSize("1").should("have.text", '0.122%') // Span should show correct normalized size (external) (" + $b.clone_info('1')[:size].text+")"

  })


})
