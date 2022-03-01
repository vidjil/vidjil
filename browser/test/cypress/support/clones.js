/**
 * Allow to rename a click by interactive way and control result
 * Tested on a clone outside of the visible list without any problem
 * @param  {String/integer} id        Index of the clone, in string or Integer format
 * @param  {String}         new_name  New name to set for this clone
 */
Cypress.Commands.add('clone_rename', (id, new_name) => { 
    cy.getCloneInList(id)
      .dblclick()
    cy.get('#new_name')
      .type(new_name)
    cy.get('#btnSave')
      .click()
    cy.get('#listElem_'+id+' > .nameBox')
      .should("contain", new_name)

})

Cypress.Commands.add('getCloneInList', (id) => {

  cy.get('#listElem_'+id+' > .nameBox')
    .should("exist")
})

Cypress.Commands.add('getCloneInSegmenter', (id) => {

  cy.get('#seq'+id)
    .should("exist")
})


Cypress.Commands.add('getCloneInScatterplot', (id, format="circle", scatter=1) => {
  function scatterplot_id(scatter){
    if (scatter == 1) { return "visu"}
    return "visu"+scatter
  }

  var name = '#'+scatterplot_id(scatter)+'_'+format+id
  return cy.get(name)
})

Cypress.Commands.add('getClusterInList', (id) => {
  cy.get('#cluster1')
    .should("exist")
})


Cypress.Commands.add('selectClone', (id, ctrl_pressed) => {
    cy.get('#listElem_'+id+' > .nameBox')
      .click({ctrlKey: ctrl_pressed})
})

Cypress.Commands.add('selectCloneMulti', (ids) => {
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i]
    cy.get('#listElem_'+id+' > .nameBox')
      .click({ctrlKey: (i==0 ? false: true), force: true})
  }
  cy.update_icon()
})

Cypress.Commands.add('unselectClone', () => {
    cy.get('#list_clones')
      .click()
})

Cypress.Commands.add('openClusterClone', (id) => {
    cy.get('#clusterBox_'+id+' > .icon-plus')
      .click()
    cy.update_icon()
})
Cypress.Commands.add('closeClusterClone', (id) => {
    cy.get('#clusterBox_'+id+' > .icon-minus')
      .click()
    cy.update_icon()
})
