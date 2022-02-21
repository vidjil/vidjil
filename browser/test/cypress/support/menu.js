// ***********************************************

Cypress.Commands.add('open_menu_settings', () => { 
  cy.get('#settings_menu').click()
})

Cypress.Commands.add('close_menu', () => { 
  cy.get('body').click()
  cy.get('#patient_info_text').click()
})

Cypress.Commands.add('change_name_key', (type_name) => {
  cy.open_menu_settings()
  cy.get('#menuTimeForm_'+type_name).click()
  cy.get('#visu2_menu').click()
})
