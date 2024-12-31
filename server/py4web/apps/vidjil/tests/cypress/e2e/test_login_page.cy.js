/// <reference types="cypress" />


describe('Before all step', function () {

    beforeEach(function () {
        cy.login(Cypress.env('host'))
        cy.visitpage(Cypress.env('host'))
        cy.closeFlashAll()
    })
    after(function () {
        // cy.screenshot('screenshot_after_all')
    })
    
    
    it('Login page customization',  function() {
        cy.get('#logout_button').click()

        cy.get('#welcome_message')
          .should("contain", "Welcome to Vidjil server!")

        cy.get('#mailto_support')
          .should("contain", "request an account")
          .should("have.attr", "href", "mailto:support@vidjil.org?Subject=%5BVidjil%5D%20Account%20on%20dev.vidjil.org&Body=%0ADear%20Vidjil%20Team%2C%0A%0AI%20would%20like%20to%20have%20an%20account%20on%20the%20Vidjil%20server.%0A%0A")

        cy.get('#href_server_url')
          .should("have.attr", "href", "https://dev.vidjil.org/")

        cy.get('#href_server_url_analyze')
          .should("have.attr", "href", "https://dev.vidjil.org/analyze")
    })


})