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


    it('01-Open db; access to various page of the bd',  function() {
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


    it('02-Open db; Users',  function() {
        cy.openDBPage()
        cy.goToUsersPage()

        var previous_length = 1 // 1
        // cy.getTableLength("#table_users").should('eq', previous_length)

        var first_name = "user_first"
        var last_name  = "user_last"
        var username   = `${first_name}__${last_name}`
        var email      = "user4@email.org"
        var password   = "4P99n!vP3c_/kA]3Yv" // complex password 
        cy.createUser(first_name, last_name, email, username, password)

        cy.goToUsersPage()
        cy.getTableLength("#table_users").should('eq', previous_length+1)

        cy.goToGroupsPage()
        var grp_user4 = 8
        cy.setGroupRight(grp_user4, ["run"], true)
    })


    it('03-owner_set', function() {
        var owner_public = "admin"
        var owner_admin  = "public"
        var owner_user1  = "user_1"
        var owner_user4  = "user_2"

        cy.createPatient("", `owner ${owner_public}`, "test", "2000-01-01", `Cypress; Patient to test owner, ${owner_public}`, owner_public)
        cy.createPatient("", `owner ${owner_admin}`,  "test", "2000-01-01", `Cypress; Patient to test owner, ${owner_admin}`, owner_admin)
        cy.createPatient("", `owner ${owner_user1}`,  "test", "2000-01-01", `Cypress; Patient to test owner, ${owner_user1}`, owner_user1)
        cy.createPatient("", `owner ${owner_user4}`,  "test", "2000-01-01", `Cypress; Patient to test owner, ${owner_user4}`, owner_user4)
        return
    })


    it('04-impersonate from list',  function() {

        cy.goToPatientPage()

        cy.get('#db_auth_name')
          .contains("System Administrator")

        cy.get('#desimpersonate_btn')
          .should('not.exist')

        cy.intercept({
            method: 'GET', // Route all GET requests
            url: 'get_active_notifications*',
          }).as('getActivities')

        cy.get('#choose_user')
          .select("2", {force: true})

        cy.wait(['@getActivities'])
        cy.update_icon(100)

        cy.get('#db_auth_name')
          .should('not.exist')
        cy.get('#desimpersonate_btn')
          .should('exist')
          .click()
        cy.wait(['@getActivities'])

        cy.get('#db_auth_name')
          .contains("System Administrator")
    })


    it('05-impersonate from table',  function() {

        cy.openDBPage()
        cy.goToUsersPage()

        cy.get('#db_auth_name')
          .contains("System Administrator")

        cy.get('#desimpersonate_btn')
          .should('not.exist')

        cy.intercept({
            method: 'GET', // Route all GET requests
            url: 'get_active_notifications*',
          }).as('getActivities')

        // action
        cy.get('#impersonate_btn_2')
          .click()

        cy.wait(['@getActivities'])
        cy.update_icon(100)

        cy.get('#desimpersonate_btn')
          .click()
        cy.wait(['@getActivities'])
    })

})
