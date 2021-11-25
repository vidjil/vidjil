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
  cy.document().then(($document) => {
    const documentResult = $document.querySelectorAll('.tip_1')
    if (documentResult.length) {
      cy.get('.tip_1')
        .should('be.visible')
        .and('contain', 'Tip:')
        .get('.tip_1 > .icon-cancel')
        .click()
    }
  })
})

Cypress.Commands.add('closeFlash', (flash_class) => {
  cy.document().then(($document) => {
    const documentResult = $document.querySelectorAll(flash_class)
    cy.log( "Close flash; "+ flash_class+"; length " + documentResult.length )
    documentResult.forEach( (elt) => elt.click() )
  })
})

Cypress.Commands.add('setBrowser', (url) => {
  cy.visit(url)
  // close disclamer only for direct opening of the index.html file
  if (url.indexOf("index.html") != -1){
    cy.close_disclamer()
    cy.close_tips()
    cy.closeFlash('.flash_1')
    cy.closeFlash('.flash_2')
    cy.closeFlash('.flash_3')
  }
})

Cypress.Commands.add('open_menu_import', () => { 
  cy.get('#demo_file_menu').click()
})



Cypress.Commands.add("openAnalysis", (file_vidjil, file_analysis, timeout) => {
  cy.open_menu_import()
  cy.get('#import_data_anchor').click()
  cy.log(`file_vidjil: ${file_vidjil}`)
  cy.log(`file_analysis: ${file_analysis}`)
  // Upload vidjil file
  cy.get("input[id=upload_json]")
    .then(($btn) => { cy.get("input[id=upload_json]").uploadFile(file_vidjil); })
  // Upload analysis file (if given)
  if (file_analysis != undefined) {
    cy.get("input[id=upload_pref]")
      .then(($btn) => {cy.get("input[id=upload_pref]").uploadFile(file_analysis); })
  }
  // Launch loading
  cy.get("button[id=start_import_json]")
    .click();
  // Wait the end of the loading (async)
  cy.update_icon(timeout)
})

/**
 * Allow to wait for update icon to be not visible
 */
Cypress.Commands.add("update_icon", (delay=0, timeout=undefined) => {
  let visible_icon = false;
  cy.get('#updateIcon')
    .then( ($icon) => {
      if ($icon.is(":visible")) { 
        // cy.log( "wait icon already visible")
        delay = 0 // Don't use delay if icon already visible
      }
      if (delay){
        cy.wait(delay)
      }
    }
  )
  timeout = (timeout!=undefined) ? timeout : 6000
  cy.get('#updateIcon', { timeout: timeout })
    .should("not.visible")

})

Cypress.Commands.add('getById', (input) => {
  cy.get(`[data-cy=${input}]`)
})
