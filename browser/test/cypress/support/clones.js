/**
 * Allow to rename a click by interactive way and control result
 * Tested on a clone outside of the visible list without any problem
 * @param  {String/integer} id        Index of the clone, in string or Integer format
 * @param  {String}         new_name  New name to set for this clone
 */
Cypress.Commands.add('clone_rename', (id, new_name) => { 

    cy.get('#listElem_'+id+' > .nameBox')
      .dblclick()
    cy.get('#new_name')
      .type(new_name)
    cy.get('#btnSave')
      .click()
    cy.get('#listElem_'+id+' > .nameBox')
      .should("contain", new_name)

})
