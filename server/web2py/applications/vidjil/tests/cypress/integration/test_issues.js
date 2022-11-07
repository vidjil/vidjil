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


    it('5069_download_link_of_result',  function() {

        var uid = 1; // TODO; reuse previous uid // async
        var config_id = 9 // not directly use for the moment (issue with cypress and variable in regexp)

        // Create analysis
        cy.goToPatientPage()
        cy.get('[href="index.html?sample_set_id='+uid+'&config='+config_id+'"]')
          .click({force: true})
        cy.update_icon()
        cy.get('#top_info')
          .should("contain", "test")
        cy.saveAnalysis()

        
        // Test Link
        cy.goToPatientPage()
        cy.get('[onclick="db.call(\'sample_set/index\', {\'id\' :\''+uid+'\' , \'config_id\' : \'-1\' })"] > :nth-child(2) > .set_token')
          .click({force: true})
        cy.update_icon()

        cy.get('#db_content > :nth-child(4) > .db_block_right a')
          .eq(0)
          .should("have.attr", "href")
          .and("match", /get_data\?config=9/);

        
        cy.get('#db_content > :nth-child(4) > .db_block_right a')
          .eq(1)
          .should("have.attr", "href")
          .and("match", /get_analysis\?config=9&/);
    })
})
