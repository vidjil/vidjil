/// <reference types="cypress" />


describe('Before all step', function () {

    beforeEach(function () {
        cy.login(Cypress.env('host'))
        cy.visitpage(Cypress.env('host'))
        cy.closeFlashAll()
    })
    after(function () {
    })
    
    it('01-Remove anon for public grp',  function() {
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
