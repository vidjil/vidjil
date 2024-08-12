/// <reference types="cypress" />
// Should we keep these tests ? 
describe('Visibility of panels', function () {
    it('01-visibility of panels',  function() {
        // Test visibility of some panel and z-index
        cy.goToPatientPage()
        cy.get('.db_div').should("be.visible")
        cy.newSet('patient')
        cy.get('.db_div').should("be.visible")
        cy.get('#patient_clipboard > .icon-newspaper').click()
        cy.wait("@getActivities");
        cy.get('.popup_container').should("be.visible")

        cy.get('.popup_container > .closeButton > .icon-cancel').click()
        cy.wait("@getActivities");
        cy.get('.popup_container').should("not.be.visible")
        cy.get('.db_div > .closeButton > .icon-cancel').click()
        cy.wait("@getActivities");
        cy.get('.db_div').should("not.be.visible")

        cy.get('#file_menu').should("not.be.visible")
        cy.get('#import_data_anchor').click({force:true})
        cy.get('#file_menu').should("be.visible")

        cy.openAnalysis("browser/test/data/demo_lil_l3_0.vidjil", undefined, 90000)
        cy.get('#file_menu').should("not.be.visible")
        
        cy.get('.info-container').should("not.be.visible")
        cy.openCloneInfo('1')
        cy.get('.info-container').should("be.visible")

        cy.openDBPage()
        cy.get('.db_div').should("be.visible")
        cy.get('.info-container').should("not.be.visible")
    })

    it('4494 - title in db table',  function() {
        // Test visibility of some panel and z-index
        cy.goToPatientPage()
        
        cy.get('#sample_set_open_22_config_id_-1 > :nth-child(2) > .set_token')
          .should("have.attr", "title")
          .and("equal", "2 patient (22)")

        cy.get('#sample_set_open_22_config_id_-1 > :nth-child(4) > span')
          .should("have.attr", "title")
          .and("equal", "set association test #set_assoc_2")

        cy.get('#result_sample_set_13_config_1')
          .should("have.attr", "title")
          .and("equal", "Display results for config default + extract reads")


        cy.openSet(22) // patient 

        cy.get('#sequence_file_48')
          .should("have.attr", "title").and("equal", "test_file.fasta")

        cy.get('[title="#set_assoc_2"]') // if getter work


        cy.goToConfigsPage()
        cy.get('#config_classification_7')
          .should("have.attr", "title").and("equal", "Human V(D)J recombinations")
        cy.get('#config_command_7')
          .should("have.attr", "title").and("equal", "-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -w 90 -y all --no-airr")
        cy.get('#config_fuse_command_7')
          .should("have.attr", "title").and("equal", "-t 100 -d lenSeqAverage --overlaps")
        cy.get('#config_info_7')
          .should("have.attr", "title").and("equal", "incomplete germlines + larger window (90bp), thus 20bp more on each side. This configuration is advised for studies on IGH clonality")


        cy.goToPreprocessPage()
        cy.get('#preprocess_name_4')
          .should("have.attr", "title").and("equal", "test pre-process 2")
        cy.get('#preprocess_command_4')
          .should("have.attr", "title").and("equal", "dummy &file1& &file2& > &result&")
        cy.get('#preprocess_info_4')
          .should("have.attr", "title").and("equal", "test 2")
        return
    })
})
