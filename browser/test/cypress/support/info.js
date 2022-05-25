// ***********************************************

Cypress.Commands.add('open_sample_info', () => { 
  cy.get('.button > .icon-info').click()
  cy.get("#info_timepoint").should("be.visible")
})

Cypress.Commands.add('close_sample_info', () => { 
  cy.get('.data-container > .closeButton > .icon-cancel').click()
  cy.get("#info_timepoint").should("not.exist")
})

Cypress.Commands.add('switchTag', (name) => { 
  cy.get(`#tag_${name}`).click()
})


Cypress.Commands.add('getInfoAnalysedReads', () => {
  cy.get('#info_segmented > :nth-child(2)')
})

Cypress.Commands.add('getInfoSelectedLocus', () => {
  cy.get('#info_selected_locus > :nth-child(2)')
})

