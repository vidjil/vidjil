

Cypress.Commands.add('focusOnSelection', () => { 
  cy.get('#focus_selected').click()
})

Cypress.Commands.add('hideSelection', () => { 
  cy.get('#hide_selected').click()
})


Cypress.Commands.add('resetAllFilter', () => { 
  cy.get('#reset_focus').click()
})


