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


})
