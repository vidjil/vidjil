// ***********************************************

Cypress.Commands.add('open_sample_info', () => { 
  cy.get('.button > .icon-info').click()
  cy.get("#info_timepoint").should("be.visible")
})

Cypress.Commands.add('close_sample_info', () => { 
  cy.get('.data-container > .closeButton > .icon-cancel').click()
  cy.get("#info_timepoint").should("not.exist")
})

/**
 * Switch tag stauts; starting status can be given to ensure that switch is correctly done
 * and DOM element render before return
 */
Cypress.Commands.add('switchTag', (name, starting_status) => {
  if (starting_status == true) {
      cy.get(`#tag_${name}`)
        .should('not.have.class', 'inactiveTag')
  } else if (starting_status == false) {
      cy.get(`#tag_${name}`)
        .should('have.class', 'inactiveTag')
  }

  cy.get(`#tag_${name}`)
    .click()

  if (starting_status == true) {
      cy.get(`#tag_${name}`)
        .should('have.class', 'inactiveTag')
  } else if (starting_status == false) {
      cy.get(`#tag_${name}`)
        .should('not.have.class', 'inactiveTag')
  }

})


Cypress.Commands.add('getInfoAnalysedReads', () => {
  cy.get('#info_segmented > :nth-child(2)')
})

Cypress.Commands.add('getInfoSelectedLocus', () => {
  cy.get('#info_selected_locus > :nth-child(2)')
})

