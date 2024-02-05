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
      cy.closeFlashAll()
    })
    afterEach(function () {
    })
    after(function () {
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
        var email      = "user4@email.org"
        var password   = "4P99n!vP3c_/kA]3Yv" // complex password 
        cy.createUser(first_name, last_name, email, password)

        cy.goToUsersPage()
        cy.getTableLength("#table_users").should('eq', previous_length+1)

        cy.goToGroupsPage()
        var grp_user4 = 8
        cy.setGroupRight(grp_user4, ["run"], true)
    })


    it('03-owner_set', function() {
        var owner_public = "public"
        var owner_admin  = "admin"
        var owner_user1  = "Personal Group"
        var owner_user2  = "user_0002"

        cy.createPatient("", `owner ${owner_public}`, "test", "2000-01-01", `Cypress; Patient to test owner ${owner_public}`, owner_public, `test owner ${owner_public}`)
        cy.createPatient("", `owner ${owner_admin}`,  "test2", "2000-01-02", `Cypress; Patient to test owner ${owner_admin}`, owner_admin, `test2 owner ${owner_admin}`)
        // groups of users should be annon.
        cy.createPatient("", `owner ${owner_user1}`,  "test3", "2000-01-03", `Cypress; Patient to test owner ${owner_user1}`, owner_user1, `tes (`)
        cy.createPatient("", `owner ${owner_user2}`,  "test4", "2000-01-04", `Cypress; Patient to test owner ${owner_user2}`, owner_user2, `tes (`)
        cy.goToPatientPage()
        return
    })


    it('04-impersonate from list',  function() {
        // Don't know why, but user seem to be not logged at starting of test 04
        cy.login(Cypress.env('host'))

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
        cy.login(Cypress.env('host'))
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
