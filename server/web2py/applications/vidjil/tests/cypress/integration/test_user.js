/// <reference types="cypress" />


describe('Creation of users and groups', function () {
    before(function () {
        cy.login(Cypress.env('host'))
        cy.fixture('l3.json').then(function (l3data) {
            this.l3data = l3data
        })
        cy.close_tips()
    })
    beforeEach(function () {
    })
    afterEach(function () {
    })
    after(function () {
        cy.clearCookies()
    })


    it('Open db; access to various page of the bd',  function() {
        cy.isDbPageVisible().should('equal', true)

        // These function get their own should inside to verify that correct db element is present and visible
        cy.openDBPage()

        // Try to access to all page of the db (except patient/run/set)
        // Each call to function goTo use a should test to make automatic verification
        
        cy.goToUsagePage()
        cy.goToProcessPage()
        cy.goToNewsPage()
        cy.goToPreprocessPage()
        cy.goToConfigsPage()
        cy.goToGroupsPage()
        cy.goToUsersPage()
        cy.goToAdminPage()
        return
    })


    it('Open db; Users',  function() {
        cy.openDBPage()
        cy.goToUsersPage()

        var previous_length = 2 // 1+1header
        cy.getTableLength("#table_users").should('eq', previous_length)

        var first_name = "user_first"
        var last_name  = "user_last"
        var email      = "user4@email.org"
        var password   = "OnePassword123"
        cy.createUser(first_name, last_name, email, password)

        cy.goToUsersPage()
        cy.getTableLength("#table_users").should('eq', previous_length+1)

        cy.goToGroupsPage()
        var grp_user4 = 4
        cy.setGroupRight(grp_user4, ["run"], true)
    })



})
