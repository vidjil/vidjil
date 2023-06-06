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
        var informations = "un set d'information; #tag_sample"
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations)

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


    it('02-Use search field',  function() {
        cy.goToPatientPage()
        var uid = 2; // TODO; reuse previous uid // async
        var sample_id = 2

        var value_filter = "airr"
        cy.dbPageFilter(value_filter)

        cy.get('#db_table_container')
          .find('tbody')
          .find('tr').each(($el, index, $list) => {
              // $el is a wrapped jQuery element
              // wrap this element so we can
              // use cypress commands on it
              cy.wrap($el).should("contain", value_filter)
        })
    })


    it('03-Association between sets',  function() {
        cy.goToPatientPage()
        
        var id          = ""
        var firstname   = "first name"
        var lastname    = "last name"
        var birthday    = "2000-01-01"
        var informations= "a patient created by cypress"
        cy.createPatient(id, firstname+"_1", lastname+"_1", birthday, informations + " (iter 1)")
        cy.createPatient(id, firstname+"_2", lastname+"_2", birthday, informations + " (iter 2)")
        cy.createPatient(id, firstname+"_3", lastname+"_3", birthday, informations + " (iter 3)")
        cy.createRun(id, "run with samples linked to some patients", "2023-01-01", "A run created by cypress")

        cy.goToTokenPage("run")
        cy.openSet(6)

        var preprocess   = undefined
        var filename1    = "Demo-X5.fa"
        var filename2    = undefined
        var samplingdate = "2021-01-01"
        var informations = "Sample from a fictive patient"
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations+" (1) #tag_sample", firstname+"_1")
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations+" (2)", firstname+"_2")
        cy.addSample(preprocess, "nfs", filename1, filename2, samplingdate, informations+" (3)")
    })


    it('04-Association between sets; jump',  function() {
        cy.goToPatientPage()
        
        var uid = 3
        var sample_id = 3

        cy.openSet(uid)
        cy.get(`#row_sequence_file_${sample_id} > :nth-child(5) > .run_token`)
          .should("exist")
          .click({force: true})

        var run_name="run with samples linked to some patients"
        cy.get('h3 > .set_token')
          .should("contain", run_name)
    })


    it('05-Delete association between sets',  function() {
        cy.goToPatientPage()
        
        var uid = 3
        var sample_id = 3

        cy.openSet(uid)
        cy.removeCommonSet(sample_id, "patient", "run with samples linked")
    })


    it('06-Delete a set',  function() {
        cy.goToPatientPage()

        var firstname = "first name"
        cy.deleteSet("patient", 3, firstname+"_1")
    })


    it('07-Set and samples with tags',  function() {
        cy.goToPatientPage()
        var previous_length=4
        cy.getTableLength('#db_table_container').should('eq', previous_length)
        
        var id          = ""
        var firstname   = "first_tagged"
        var lastname    = "last_tagged"
        var birthday    = "2000-01-01"
        var informations= "patient with tags"

        // Some with tag
        cy.createPatient(id, firstname+"_4", lastname+"_4", birthday, informations + " (iter 4) #tagXXX #tagYYY")
        cy.createPatient(id, firstname+"_5", lastname+"_5", birthday, informations + " (iter 5) #tagXXX #tagZZZ")
        cy.createPatient(id, firstname+"_6", lastname+"_6", birthday, informations + " (iter 6) #tagXXX")

        cy.goToPatientPage()
        cy.getTableLength('#db_table_container').should('eq', previous_length+3)

        cy.get('#sample_set_open_9_config_id_-1 > :nth-child(4) > [data-linkable-name="#tagXXX"]')
          .should("exist")
          .should("contain", "#tagXXX")
          .click()
          
        cy.wait(['@getActivities'])
        cy.wait(500)
        cy.getTableLength('#db_table_container').should('eq', 3)


        // from inside a patient
        cy.openSet(9)
        cy.get('.tag-link')
          .should("contain", "#tagXXX")
          .click()

        cy.wait(['@getActivities'])
        cy.wait(500)
        cy.getTableLength('#db_table_container').should('eq', 3)
    })


    it('08-Page usage',  function() {
        cy.goToUsagePage()

        // Start ; 2 sample present, only first with tag
        cy.get('#public_info > :nth-child(5) > :nth-child(2) > .button > a')
          .should("contain", "test config_airr")
        cy.get('#public_info > :nth-child(5) > :nth-child(3) > .button > a')
          .should("contain", "name first (2)")
          .should("exist")

        // Click on a tag 
        cy.get('#public_info > .set_data.margined-bottom > .tag-link')
          .should("contain", "tag_sample")
          .click()

        // only one sample still present
        cy.get('#public_info > :nth-child(5) > :nth-child(2) > .button > a')
          .should("contain", "test config_airr")
        cy.get('#public_info > :nth-child(5) > :nth-child(3) > .button > a')
          .should("not.exist")
    })


    it('09-Page process',  function() {
        cy.goToProcessPage()
        var previous_length=2
        cy.getTableLength('#table_process').should('eq', previous_length)


        cy.get('.tag-link')
          .should("contain", "tag_sample")
          .click()

        cy.get('#db_filter_input')
          .should('have.value', "#tag_sample")

        cy.getTableLength('#table_process').should('eq', 1)

        cy.get('#db_filter_input')
          .type("{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{backspace}{rightArrow}{enter}") // 11 calls to del + 1 space
          .click({force: true})

        cy.getTableLength('#table_process').should('eq', previous_length)
    })


    it('10-Edit patient',  function() {
        var id          = ""
        var firstname   = "first_tagged"
        var lastname    = "last_tagged"
        var birthday    = "2000-01-01"
        var informations= "patient with tags"

        cy.editPatient(7, id, firstname+"_4", lastname+"_4", birthday, informations + " (iter 4) MODIFY")
    })


    it('11-Configs list inside set/sample',  function() {
        cy.goToPatientPage()        
        var uid = 1
        cy.openSet(uid)

        cy.get('#choose_config')
          // TODO; check html content
          // .should('contain', 'Human V(D)J recombinations') // A prefilled optgroup (initial database)
    })


})
