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
  cy.update_icon() // Add time to load model and component.
  cy.wait(1000)

  // close disclamer only for direct opening of the index.html file
  if (url.indexOf("index.html") != -1){
    cy.close_disclamer()
    cy.close_tips()
    cy.closeFlash('.flash_1')
    cy.closeFlash('.flash_2')
    cy.closeFlash('.flash_3')
  }
})

Cypress.Commands.add('open_menu', (id) => { 
  cy.get('#'+id+'> .selector').invoke('show')
})

Cypress.Commands.add('close_menu', (id) => { 
  cy.get('#'+id+'> .selector').invoke('hidden')
})


Cypress.Commands.add("openAnalysis", (file_vidjil, file_analysis, timeout) => {
  timeout = (timeout!=undefined) ? timeout : 30000
  //cy.open_menu("demo_file_menu")
  cy.get('#import_data_anchor').click({force: true})
  //cy.close_menu("demo_file_menu")
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
  cy.update_icon(0, timeout)
})

Cypress.Commands.add('save_analysis', () => { 
  cy.get('#patientSelector_save').click({force: true})
  cy.get(".flash_1")
    .first()
    .should("contain", "analysis saved")
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

Cypress.Commands.add('pressKey', (key) => {
  var codes = {"escape": 27}
  cy.get('body').trigger('keydown', { keyCode: codes[key]});
  cy.wait(500);
  cy.get('body').trigger('keyup', { keyCode: codes[key]});
})

Cypress.Commands.add('changePreset', (sp_id, value) => {
  cy.get(`#${sp_id}`).click()
  cy.get(`#${sp_id}_select_preset`)
    .select(value, {force: true})
    .trigger('change', {force: true})
  cy.update_icon(10000)
})
