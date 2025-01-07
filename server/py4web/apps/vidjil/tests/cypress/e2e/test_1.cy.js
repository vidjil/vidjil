/// <reference types="cypress" />


describe('Manipulate db page (for cypress pipeline)', function () {
    it('01-Open db',  function() {
        cy.isDbPageVisible().should('equal', true)

        // These function get their own should inside to verify that correct db element is present and visible
        cy.goToRunPage()
        cy.goToPatientPage()

        // Close and check session is still active
        cy.closeDBPage()
        cy.goToRunPage()
        cy.goToPatientPage()

        // Call multiple times patient page to verify that cypress handle correctly intercept
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToPatientPage()
        cy.goToPatientPage()
        
        // loop between 2 token
        cy.goToRunPage()
        cy.goToPatientPage()
        cy.goToRunPage()
        cy.goToPatientPage()
    })
})
