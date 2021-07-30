/// <reference types="cypress" />


describe('Before all step', function () {

    after(function () {
        cy.screenshot('screenshot_after_all')
    })

    it('Before all launching',  function() {
        // Cypress can't navigate between multiple superdomain (even http/https)
        // This test allow to launch the before all test, with init database (only available at http)
        // See https://docs.cypress.io/guides/guides/web-security#Same-superdomain-per-test
        assert.isTrue(true, "Should init database (error visit https after http)")
        cy.screenshot('screenshot_end_test')

    })

})
