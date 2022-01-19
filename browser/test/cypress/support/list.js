


Cypress.Commands.add('changeListAxix', (axis) => {
  cy.get('#list_axis_select')
    .select(axis, {force: true})
    .should('have.value', axis)
})

