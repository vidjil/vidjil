


Cypress.Commands.add('changeListAxix', (axis) => {
  cy.get('#list_axis_select')
    .select(axis, {force: true})
    .should('have.value', axis)
})


Cypress.Commands.add('changeSortList', (axis) => {
  cy.get('#list_sort_select')
    .select(axis, {force: true})
    .should('have.value', axis)
})



Cypress.Commands.add('open_cluster', (id) => {
  cy.get('#clusterBox_'+id+' > .icon-plus')
    .click()
})

