// ***********************************************
// import 'cypress-wait-until';
var lil_l3 = {"app": {"id":61, "config":2}, "localhost": {"id":3241, "config":25}}



Cypress.Commands.add('close_disclamer', () => { 
  cy.get("div.popup_container", { timeout: 10000 })
    .should('be.visible')
    .and('contain', 'The Vidjil Team')
    .get('.center > button')
    .click()
})

Cypress.Commands.add('close_tips', () => { 
  cy.get('.tip_1')
    .should('be.visible')
    .and('contain', 'Tip:')
    .get('.tip_1 > .icon-cancel')
    .click()
})


Cypress.Commands.add('open_menu_import', () => { 
  cy.get('#demo_file_menu').click()
})



Cypress.Commands.add("set_browser", (file_vidjil, file_analysis) => {

  cy.open_menu_import()
  cy.get('#import_data_anchor').click()
  cy.log(`file_vidjil: ${file_vidjil}`)
  cy.log(`file_analysis: ${file_analysis}`)

  cy.get("input[id=upload_json]")
    .then(($btn) => { cy.get("input[id=upload_json]").uploadFile(file_vidjil); })

  if (file_analysis != undefined) {
    cy.get("input[id=upload_pref]")
      .then(($btn) => {cy.get("input[id=upload_pref]").uploadFile(file_analysis); })
  }


  cy.get("button[id=start_import_json]")
    .click();
  cy.update_icon()
})


Cypress.Commands.add("update_icon", () => {
  cy.get('#updateIcon').should("not.visible")

})

Cypress.Commands.add('getById', (input) => {
  cy.get(`[data-cy=${input}]`)
})
