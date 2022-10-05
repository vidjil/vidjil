/// <reference types="cypress" />
// Nb: These tests are launched at the end of other tests. this allow to get already present analysis on the server when they are executed

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


    it('2577_jstree_avoid_folder_selection',  function() {
        // Test behavior of jstree for file or folder
        var filename1    = "/"
        var filename2    = "Demo-X5.fa"

        cy.goToPatientPage()
        // open a patient
        var id          = ""
        var firstname   = "jstree"
        var lastname    = "issue 2577"
        var birthday    = "2000-01-01"
        var informations= "avoid_folder_selection"
        cy.createPatient(id, firstname, lastname, birthday, informations)

        // Open adding sample page
        cy.get('#add_sample_button')
          .should('contain', ' + add samples')
          .click()
        cy.update_icon()

        cy.get('#upload_sample_form > :nth-child(1)')
          .should('contain', 'Add samples')
          .click()

        cy.update_icon()
        cy.get('#submit_samples_btn')
          .click()

        cy.get('#jstree_field_1_0').click()

        // Control that folder selection disable submit button
        cy.get('.jstree-anchor').contains(filename1)
          .click( { force: true} )
        cy.get("#jstree_button")
          .should('have.class','disabledClass');

        // Open the root folder
        cy.get('.jstree-ocl').click()
        cy.wait(1000)


        // Control that file selection able submit button
        cy.get('.jstree-anchor').contains(filename2)
          .click( { force: true} )

        cy.get("#jstree_button")
          .should('not.have.class','disabledClass');


        ///////////////////////////
        // Control search action

        // init state
        cy.get('.jstree-anchor').contains(filename2)
          .should('not.have.class','jstree-search');

        // put a search value
        cy.get('#jstree_search_input')
          .type("demo")

        cy.get('#jstree_search_form > button')
          .click()

        // Now it is highlighted by search action
        cy.get('.jstree-anchor').contains(filename2)
          .should('have.class','jstree-search');

        return
    })

    it('5070 - get_reads',  function() {
        cy.goToPatientPage()
        var uid = 2; // TODO; reuse previous uid // async
        cy.get('[onclick="db.call(\'sample_set/index\', {\'id\' :\''+uid+'\' , \'config_id\' : \'-1\' })"] > :nth-child(2) > .set_token')
          .click({force: true})
        cy.update_icon()
        cy.get('[href="?sample_set_id='+uid+'&config=2"]').click()
        cy.openCloneInfo(0)
        cy.get(':nth-child(2) > .icon-down').click()

        const downloadsFolder = Cypress.config('downloadsFolder')
        const downloadedFilename = downloadsFolder+'/reads__0__file_id__'+uid+'.fa'
        
        cy.readFile(downloadedFilename, { timeout: 120000 })
        .should('contain', '>clone-001')
    })
})
