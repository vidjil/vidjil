// ***********************************************

Cypress.Commands.add('open_menu_settings', () => { 
  cy.get('#settings_menu').click()
})

Cypress.Commands.add('close_menu', () => { 
  cy.get('body').click()
  cy.get('#patient_info_text').click()
})
