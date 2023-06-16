/// <reference types="cypress" />


describe('Manipulate db page', function () {
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


    it('00-config_airr', function() {
        var config_name  = ".vidjil/.clntab"
        var config_class = ["3", "Analysis with/for other software"]
        var config_soft  = undefined
        var config_cmd   = "x"
        var config_fuse  = "-t 100 --overlaps"
        var config_info  = "Direct input of .vidjil files or EC-NGS .clntab files"
        var expected_id  = "9"
        cy.createConfig(config_name, config_class, config_soft, config_cmd, config_fuse, config_info, expected_id )

        cy.createPatient("", "config_airr", "test", "2000-01-01", "Cypress; Patient with airr uploaded file")

        cy.addSample(undefined, "nfs", "Demo-X5.airr", undefined, "2000-01-01", "file in AIRR format")

        var sample_id = 49
        cy.launchProcess(expected_id, sample_id)
        cy.waitAnalysisCompleted(expected_id, sample_id)
        return
    })


    it('01-preprocess_config', function() {
        // Create a preprocess (with id == 2)
        var pre_process_name_1  = 'dummy1'
        var pre_process_name_2  = 'dummy2'
        var pre_process_command = 'dummy &file1& &file2& > &result&'
        var pre_process_info    = 'Cypress; dummy pre-process for testing purposes'
        cy.createPreprocess(pre_process_name_1, pre_process_command, pre_process_info) // n°6
        cy.createPreprocess(pre_process_name_2, pre_process_command, pre_process_info) // n°7

        // Edit a preprocess
        cy.editPreprocess(1, pre_process_name_1, pre_process_command, pre_process_info+"; cypress edited") // n°1

        // Change permissions for group public (id=3)
        cy.permissionPreprocess(2, 3, true)
        cy.permissionPreprocess(2, 3, false)

        // Delete a preprocess
        cy.deletePreprocess(7, pre_process_name_2)// second cypress created preprocess
    })


})
