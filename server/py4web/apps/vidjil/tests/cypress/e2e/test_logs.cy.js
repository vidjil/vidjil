/// <reference types="cypress" />
// Nb: These tests are launched at the end of other tests. this allow to get already present analysis on the server when they are executed

describe('Test logs', function () {
    before(function () {
        cy.login(Cypress.env('host'))
        cy.close_tips()
    })
    beforeEach(function () {
      cy.closeFlashAll()
    })
    afterEach(function () {
    })
    after(function () {
        cy.clearCookies()
    })


    it('Basic logs in logs page',  function() {
        cy.goToPatientPage()
        var id          = ""
        var firstname   = "test log"
        var lastname    = "XYZinsert log ?" 
        var birthday    = "2000-01-01"
        var informations= "a patient created by cypress to try log table fix"
        cy.createPatient(id, firstname, lastname, birthday, informations)

        var preprocess   = undefined
        var filename1    = "demo/Demo-X5-x100.fasta"
        var filename2    = undefined
        var samplingdate = "2021-01-01"
        var informations = "un set d'information"
        cy.addSample(preprocess, "computer", filename1, filename2, samplingdate, informations)

        var sample_id = 5 // TODO; fix correct number at this step of testing pipeline
        cy.launchProcess("2", sample_id)


        cy.goToLogsPage()

        // Log are tested in reverse order as last is shown first
        // TODO; lines positions are noe correct as some actions logging don't work for the moment (link to #5133/MR !1311)
        cy.get(`tbody > :nth-child(1) > :nth-child(3)`)
          .should("contains", "run requested with config multi+inc+xxx")
        cy.get(`tbody > :nth-child(2) > :nth-child(3)`)
          .should("contains", /file \([0-9]*\) Demo-X5-x100\.fasta added/)
        cy.get(`tbody > :nth-child(3) > :nth-child(3)`)
          .should("contains", /patient \([0-9]*\) XYZ added/)
    })

})