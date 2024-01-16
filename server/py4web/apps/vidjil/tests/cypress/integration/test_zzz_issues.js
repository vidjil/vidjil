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

        var uid = 25; // TODO; reuse previous uid // async; first cypress created patient with real analysis
        var config_id = 9 // not directly use for the moment (issue with cypress and variable in regexp)

        // Create analysis
        cy.goToPatientPage()
        cy.openAnalysisFromDbPage(uid, config_id)
        cy.get('#top_info')
          .should("contain", "test")
        cy.saveAnalysis()

        
        // Test Link
        cy.goToPatientPage()
        cy.openSet(uid)

        cy.get('#db_content > :nth-child(4) > .db_block_right a')
          .eq(0)
          .should("have.attr", "href")
          .and("match", /get_data\?/)
          .and("match", /config=9/)
          .and("match", /sample_set_id=25/)

        
        cy.get('#db_content > :nth-child(4) > .db_block_right a')
          .eq(1)
          .should("have.attr", "href")
          .and("match", /get_analysis\?/)
          .and("match", /config=9/)
          .and("match", /sample_set_id=25/)
    })


    it('5070 - get_reads',  function() {
        var uid = 26; // TODO; reuse previous uid // async; second patient created with cypress, real analysis multi+inc+xxx
        var config_id = 2

        cy.goToPatientPage()
        // cy.screenshot('debug_5070_1_patient_page')

        cy.openSet(uid)
        // cy.screenshot('debug_5070_2_open_set')

        cy.openAnalysisFromSetPage(uid, config_id)
        cy.openCloneInfo(1)
        // cy.screenshot('debug_5070_3_clone_panel')
        cy.get(':nth-child(2) > .icon-down').click()

        const downloadsFolder = Cypress.config('downloadsFolder')
        const downloadedFilename = downloadsFolder+'/reads__1__file_id__'+uid+'.fa'

        // Don't work on gitlab, but work locally...
        // cy.readFile(downloadedFilename, { timeout: 120000 })
        //   .should('contain', '>clone-001')
    })

    it('5178 - bad render when request error occured',  function() {
        // Before fixing, request return error has HTML and are badly interpreted and break DOM page

        cy.goToPatientPage()
        // cy.screenshot('debug_5070_1_patient_page')

        cy.get('#result_sample_set_13_config_1')
          .click()

        cy.get('.popup_msg')
          .should("contain", "An error occured (Internal Server Error; code 500)")
    })

    it('5213 - open analysis without bug',  function() {
        // Creat an analysys, tag some clones, save it on the server, and reopen it. Check if tag is present

        if (Cypress.browser.name === 'firefox' && Cypress.browser.version.split(".")[0] == "78") {
          // Skip old version of firefox (~62) that don't work on cypress for this test
          this.skip
        }

        // Pre existant config
        var uid = 26; // TODO; reuse previous uid // async; second patient created with cypress, real analysis multi+inc+xxx
        var config_id = 2

        // Open an analysis
        cy.goToPatientPage()
        cy.openSet(uid)
        cy.openAnalysisFromSetPage(uid, config_id)

        // Tag clone and save analysis
        cy.selectCloneMulti([4, 5, 6])
        cy.get("#tag_icon__multiple").click()
        cy.get('.tagName_custom_2').click()
        cy.save_analysis()


        // Re-open an analysis
        cy.goToPatientPage()
        cy.openSet(uid)
        cy.openAnalysisFromSetPage(uid, config_id)

        // check that clone have a tag color
        cy.getCloneInList(4).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)')
        cy.getCloneInList(5).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)')
        cy.getCloneInList(6).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)')
    })

})
