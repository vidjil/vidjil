// ***********************************************

Cypress.Commands.add('open_menu_settings', () => { 
  cy.get('#settings_menu').click()
  cy.get('#settings_menu > .selector').invoke('show')
})

Cypress.Commands.add('open_menu_filter', () => {
  cy.get('#filter_menu > .selector').invoke('show')
})

Cypress.Commands.add('open_menu_cluster', () => {
  cy.get('#cluster_menu > .selector').invoke('show')
})

Cypress.Commands.add('open_menu_palette', () => {
  cy.get('#palette_menu > .selector').invoke('show')
})

Cypress.Commands.add('getSliderTop', () => {
  cy.get('#top_slider')
})

Cypress.Commands.add('close_menu', () => { 
  cy.get('.selector').invoke('hide')
})

Cypress.Commands.add('change_name_key', (type_name) => {
  cy.open_menu_settings()
  cy.get('#menuTimeForm_'+type_name).check({force:true})
    .should('be.checked')
    .trigger('change', {force: true})
  cy.update_icon()
  cy.close_menu()
})

Cypress.Commands.add('change_colorby', (color_by) => {
  cy.get('#color_menu_select')
    .select(color_by)
})

