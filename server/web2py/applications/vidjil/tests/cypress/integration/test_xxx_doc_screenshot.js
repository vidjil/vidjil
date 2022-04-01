
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

    it('00-screenshot_on_opened_analysis',  function() {

        cy.closeDBPage()
        
        cy.openAnalysis("doc/demo_lil_l3_tutorial.vidjil", "doc/demo_lil_l3_tutorial.analysis", 90000)

        cy.screenshot('starting_state')

        


        cy.get('#info')
          .screenshot('panel_info')


        

        cy.openClusterClone(1)
        cy.get('#list')
          .screenshot('panel_list_merge_2')

        cy.closeClusterClone(1)
        cy.get('#list')
          .screenshot('panel_list')

        // switch locus to TRG
        cy.get('.sp_system').contains("TRG")
          .click()
          .update_icon(1000)

        cy.get('#visu_back')
          .screenshot('panel_scatterplot')


        cy.selectClone(25)
        cy.selectClone(100, true)
        cy.selectClone(107, true)
        cy.selectClone(124, true)
        cy.selectClone(132, true)
        cy.get('#align')
          .click()
          .update_icon(300)
        cy.get('#aligner-open-button')
          .click({force: true})

        cy.get('.aligner')
          .screenshot('panel_sequence')



        cy.selectClone(1)
        // hide untagged clones
        cy.get('[title="-/-"]').click()
        cy.update_icon()
        cy.get('[title="standard"]').click()
        cy.update_icon()
        cy.get('#aligner-open-button')
          .screenshot('panel_bot_bar')
        cy.get('#list')
          .screenshot('panel_list_merge_1')

        cy.get('#visu2_back')
          .screenshot('panel_graph')

    })

    it('01-screenshot_on_db',  function() {

        cy.logout()
        cy.fillLogin("user4@email.org", "OnePassword123")

        cy.get('.db_msg')
          .screenshot('table_db_content_patient_list')


        cy.goToPatientPage()
        var uid = 2;
        cy.get('[onclick="db.call(\'sample_set/index\', {\'id\' :\''+uid+'\' , \'config_id\' : \'-1\' })"] > :nth-child(2) > .set_token')
          .click({force: true})
        cy.update_icon()

        // cy.selectConfig(2)
        // useless, patient created by public user, so no config switch available
        
        cy.get('.db_msg')
          .screenshot('table_db_content_patient_0_multi_config')



        return    
    })


})
