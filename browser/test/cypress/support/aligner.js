

Cypress.Commands.add('focusOnSelection', () => { 
  cy.get('#focus_selected').click({force: true})
  cy.update_icon()
})

Cypress.Commands.add('hideSelection', () => { 
  cy.get('#hide_selected').click({force: true})
  cy.update_icon()
})


Cypress.Commands.add('resetAllFilter', () => { 
  cy.get('#reset_focus').click({force: true})
  cy.get('.icon-cancel-circled-outline')
    .should('not.exist')
  cy.update_icon()
})


