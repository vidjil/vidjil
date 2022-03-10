// ***********************************************

Cypress.Commands.add('open_sample_info', () => { 
  cy.get('.button > .icon-info').click()
  cy.get("#info_timepoint").should("be.visible")
})

Cypress.Commands.add('close_sample_info', () => { 
  cy.get('.data-container > .closeButton > .icon-cancel').click()
  cy.get("#info_timepoint").should("not.exist")
})
