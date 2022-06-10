
describe('Screenshot on server', function () {
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
