/// <reference types="cypress" />


describe('Before all step', function () {

    after(function () {
        cy.screenshot('screenshot_after_all')
    })

    it('00-Before all launching',  function() {
        // Cypress can't navigate between multiple superdomain (even http/https)
        // This test allow to launch the before all test, with init database (only available at http)
        // See https://docs.cypress.io/guides/guides/web-security#Same-superdomain-per-test
        assert.isTrue(true, "Should init database (error visit https after http)")
        cy.screenshot('screenshot_end_test')

    })

    it('01-Remove anon for public grp',  function() {
        cy.login(Cypress.env('host'))
        cy.visitpage(Cypress.env('host'))


        cy.goToGroupsPage()
        var grp_public = 3
        var grp_admin  = 1

        cy.get('#row_group_'+grp_public+' > #col_access_'+grp_public)
          .should("contain", " //")

        cy.setGroupRight(grp_public, ["anon"], true)
        cy.setGroupRight(grp_admin, ["anon"], true)

        cy.goToGroupsPage()
        cy.get('#row_group_'+grp_public+' > #col_access_'+grp_public)
          .should("contain", "a //")

    })
})
