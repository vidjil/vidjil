


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


Cypress.Commands.add('filterSearch', (text) => {
  cy.get('#filter_input')
    .type(text)
    .trigger('change', {force: true})
})


Cypress.Commands.add('filterSearchReset', () => {
  cy.get('#clear_filter > .icon-cancel')
    .click()
})


Cypress.Commands.add('openTagPanelOneClone', (id) => {
  cy.get(`#tag_icon_${id}`).click({force: true})
  cy.get(`#tag_panel_clones_${id}`).should('be.visible')
})


Cypress.Commands.add('changeTagClone', (id, tagname) => {
  cy.openTagPanelOneClone(id)
  cy.get(`.tagName_${tagname}`).click()
  cy.get(`#tag_panel_clones_${id}`).should('not.be.visible')
  cy.get('.tagSelector').should('not.be.visible')
})

