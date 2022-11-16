/// <reference types="cypress" />


describe('Manipulate patient, sample and launch analysis', function () {
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



    it('00-Launch analysis',  function() {
        var id          = ""
        var firstname   = "first name"
        var lastname    = "last name"
        var birthday    = "2000-01-01"
        var informations= "a patient created by cypress"
        cy.createPatient(id, firstname, lastname, birthday, informations)


        var preprocess   = undefined
        var filename1    = "Demo-X5.fa"
        var filename2    = undefined
        var samplingdate = "2021-01-01"
        var informations = "un set d'information"
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations)
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations) // supplementary for later tests


        var sample_id = 2
        cy.launchProcess("2", sample_id)
        cy.waitAnalysisCompleted("2", sample_id)

        return
    })

    it('01-Delete analysis',  function() {
        cy.goToPatientPage()
        var uid = 2; // TODO; reuse previous uid // async
        var sample_id = 2

        cy.openSet(uid)
        cy.deleteProcess("2", sample_id)

        cy.launchProcess("2", sample_id) // suppl for later tests
    })


})
