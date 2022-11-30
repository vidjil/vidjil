/// <reference types="cypress" />


describe('Creation of users and groups', function () {
    before(function () {
        cy.login(Cypress.env('host'))
        cy.close_tips()
    })
    beforeEach(function () {
    })
    afterEach(function () {
    })
    after(function () {
        cy.clearCookies()
    })


    it('00-visibility of panels',  function() {
        // Test visibility of some panel and z-index
        cy.goToPatientPage()
        cy.get('.db_div').should("be.visible")
        cy.newSet('patient')
        cy.get('.db_div').should("be.visible")
        cy.get('#patient_clipboard > .icon-newspaper').click()
        cy.get('.popup_container').should("be.visible")

        cy.get(':nth-child(20) > .closeButton > .icon-cancel').click()
        cy.get('.popup_container').should("not.be.visible")
        cy.get('.db_div > .closeButton > .icon-cancel').click()
        cy.get('.db_div').should("not.be.visible")

        cy.get('#file_menu').should("not.be.visible")
        cy.get('#import_data_anchor').click({force:true})

        cy.get('#file_menu').should("be.visible")

        cy.openAnalysis("data/demo_lil_l3_0.vidjil", undefined, 90000)
        cy.get('#file_menu').should("not.be.visible")
        
        cy.get('.info-container').should("not.be.visible")
        cy.openCloneInfo('20')
        cy.get('.info-container').should("be.visible")

        cy.openDBPage()
        cy.get('.db_div').should("be.visible")
        cy.get('.info-container').should("not.be.visible")
        return
    })
})
