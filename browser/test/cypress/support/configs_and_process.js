
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
      .select(config_class, { force: true })
      .should('have.value', config_class)
  }

  if (config_soft != undefined){
    cy.get('#config_program')
      .select(config_soft, { force: true })
      .should('have.value', config_soft)
  }

  cy.get('#config_command').type(config_cmd)
  cy.get('#config_fuse_command').type(config_fuse)
  cy.get('#config_info').type(config_info)
})


/**
 * Create a preprocess configuration and fill it informations
 */
Cypress.Commands.add('createPreprocess', (config_name, config_cmd, config_info, expected_id) => {
  cy.goToPreprocessPage()

  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#new_preprocess_btn')
    .should('contain', ' + new pre-process')
    .click()
  cy.wait(['@getActivities'])

  cy.fillPreprocess(config_name, config_cmd, config_info)

  cy.get('#add_preprocess_submit')
    .click()
  cy.wait(['@getActivities'])

  if (expected_id != undefined){
    cy.controlPreprocess(expected_id, config_name, config_cmd, config_info)
  }

})

/**
 * Control preprocess value for a given id
 */
Cypress.Commands.add('controlPreprocess', (expected_id, config_name, config_cmd, config_info) => {
    cy.get('#preprocess_name_'+expected_id).should('contain', config_name)
    cy.get('#preprocess_command_'+expected_id).should('contain', config_cmd)
    cy.get('#preprocess_info_'+expected_id).should('contain', config_info)
})

/**
 * Edit a preprocess and control values
 */
Cypress.Commands.add('editPreprocess', (id, config_name, config_cmd, config_info) => {
  cy.goToPreprocessPage()

  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#preprocess_edit_'+id)
    .click()
  cy.wait(['@getActivities'])

  cy.fillPreprocess(config_name, config_cmd, config_info)

  cy.get('#preprocess_update_submit')
    .click()
  cy.wait(['@getActivities'])

  cy.controlPreprocess(id, config_name, config_cmd, config_info)

})

/**
 * Fill a preprocess form
 */
Cypress.Commands.add('fillPreprocess', (config_name, config_cmd, config_info) => {
  cy.get('#pre_process_name').clear().type(config_name)
  cy.get('#pre_process_command').clear().type(config_cmd)
  cy.get('#pre_process_info').clear().type(config_info)
})

/**
 * Delete a preprocess by his id
 */
Cypress.Commands.add('deletePreprocess', (id, config_name) => {
  cy.goToPreprocessPage()

  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#preprocess_delete_'+id)
    .click()
  cy.wait(['@getActivities'])

  cy.get('#preprocess_name').should("contain", config_name)
  cy.get('#delete_preprocess_confirm_btn')
    .click()

  cy.wait(['@getActivities'])
  cy.get("#preprocess_line_"+id)
    .should('not.exist')
})

/**
 * Set a permission on a preprocess to a group
 */
Cypress.Commands.add('permissionPreprocess', (id, group_id, value) => {
  cy.goToPreprocessPage()

  cy.intercept({
    method: 'GET', // Route all GET requests
    url: 'get_active_notifications*',
  }).as('getActivities')

  cy.get('#preprocess_permission_'+id)
    .click()
  cy.wait(['@getActivities'])

  if (value==true){
      cy.get('#permission_checkbox_'+group_id)
        .should('not.be.checked')
        .check()
        .should('be.checked')
      cy.goToPreprocessPage()
      cy.get('#preprocess_permission_'+id)
        .click()
      cy.wait(['@getActivities'])
      cy.get('#permission_checkbox_'+group_id)
        .should('be.checked')
  } else if (value==false){
      cy.get('#permission_checkbox_'+group_id)
        .should('be.checked')
        .uncheck()
        .should('not.be.checked')
      cy.goToPreprocessPage()
      cy.get('#preprocess_permission_'+id)
        .click()
      cy.wait(['@getActivities'])
      cy.get('#permission_checkbox_'+group_id)
        .should('not.be.checked')
  }
})

