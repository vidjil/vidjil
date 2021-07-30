/// <reference types="cypress" />


describe('Manipulate db page', function () {
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


    it('Open db1; classic',  function() {
        cy.isDbPageVisible().then((val) => {
            console.log( val ) 
            cy.wrap(val).should('equal', true) 
        }) 
        cy.isDbPageVisible().should('equal', true)

        // These function get their own should inside to verify that correct db element is present and visible
        cy.openDBPage()
        cy.goToRunPage()
        cy.goToPatientPage()
        return
    })


    it('Open db2; session still active',  function() {

        cy.isDbPageVisible().should('equal', true)

        // These function get their own should inside to verify that correct db element is present and visible
        cy.openDBPage()
        cy.goToRunPage()
        cy.goToPatientPage()

        cy.closeDBPage()

        cy.openDBPage() // go to db from close db page
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToPatientPage()

        cy.closeDBPage()
        return
    })


    it('Open db3; start from correct point from previous',  function() {
        cy.isDbPageVisible().should('equal', false)

        // These function get their own should inside to verify that correct db element is present and visible
        cy.openDBPage()
        cy.goToPatientPage()
        cy.goToPatientPage()
        cy.goToRunPage()
        return
    })


    it('Open db 4',  function() {
        // Call multiple times patient page to verify that cypress handle correctly intercept

        cy.openDBPage()
        cy.isDbPageVisible().should('equal', true)
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToRunPage()
        cy.goToPatientPage()
        cy.goToPatientPage()
        
        // loop between 2 token
        cy.goToRunPage()
        cy.goToPatientPage()
        cy.goToRunPage()
        cy.goToPatientPage()
        cy.goToRunPage()
        cy.goToPatientPage()

        cy.closeDBPage()
        return
    })


})
