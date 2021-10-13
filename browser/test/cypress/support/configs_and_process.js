
/**
 * Create a configuration and fill it informations
 */
Cypress.Commands.add('createConfig', (config_name, config_class, config_soft, config_cmd, config_fuse, config_info, expected_id) => {
  cy.goToConfigsPage()

  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#new_config_btn')
    .should('contain', ' + new config')
    .click()
  cy.wait(['@getActivities'])


  cy.fillConfig(config_name, config_class[0], config_soft, config_cmd, config_fuse, config_info)

  cy.get('#add_config_submit')
    .click()
  cy.wait(['@getActivities'])

  cy.get('#config_name_'+expected_id).should('contain', config_name)
  cy.get('#config_classification_'+expected_id).should('contain', config_class[1])
  cy.get('#config_program_'+expected_id).should('contain', config_soft==undefined ? "none": config_soft)
  cy.get('#config_command_'+expected_id).should('contain', config_cmd)
  cy.get('#config_fuse_command_'+expected_id).should('contain', config_fuse)
  cy.get('#config_info_'+expected_id).should('contain', config_info)

})


Cypress.Commands.add('fillConfig', (config_name, config_class, config_soft, config_cmd, config_fuse, config_info) => {
  cy.get('#config_name').type(config_name)
  if (config_class != undefined){
    cy.get('#config_classification')
      .select(config_class)
      .should('have.value', config_class)
  }

  if (config_soft != undefined){
    cy.get('#config_program')
      .select(config_soft)
      .should('have.value', config_soft)
  }

  cy.get('#config_command').type(config_cmd)
  cy.get('#config_fuse_command').type(config_fuse)
  cy.get('#config_info').type(config_info)
})

