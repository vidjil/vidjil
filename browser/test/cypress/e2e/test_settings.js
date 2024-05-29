/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// those tests are opening different .vidjil files with or without .analysis and check the expected data have been loaded
describe('Load', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


    it('01 - change settings an check is store',  function() {
      cy.openAnalysis("/doc/analysis-example2.vidjil")

      var type_name = "short_name"
      cy.change_name_key(type_name)
      cy.test_name_values(type_name)

      // reload page, settings saved ?
      cy.setBrowser(url)
      cy.openAnalysis("/doc/analysis-example2.vidjil")
      cy.test_name_values(type_name)

      type_name = "delta_date"
      cy.change_name_key(type_name)
      cy.test_name_values(type_name)

      // reload page, settings saved ?
      cy.setBrowser(url)
      cy.openAnalysis("/doc/analysis-example2.vidjil")
      cy.test_name_values(type_name)
    })


    it('02 - export file',  function() {
      cy.openAnalysis("/doc/analysis-example2.vidjil")

      cy.open_menu_settings()
      cy.get('#settings_export').should("be.visible")
      // TODO; testing content after update to cypress > 10
      // "timeFormat": "delta_date",

      cy.get('#settings_reset').click({force:true})
      cy.get('#settings_export').should("be.visible")
      // TODO; testing content after update to cypress > 10

    })


    it('03 - import settings files',  function() {
      cy.openAnalysis("/doc/analysis-example2.vidjil")
      cy.open_menu_settings()
      var settings_file_short = "data/vidjil_settings_format_short.json"
      var settings_file_delta = "data/vidjil_settings_format_delta.json"


      // Before import; correct time format selected (time delta)
      cy.get('#menuTimeForm_delta_date')
        .should('be.checked')


      // Import settings XXX, with 'short name' selected
      cy.open_menu_settings()
      cy.get('#settings_import')
        .should("be.visible")

        .then(($btn) => { cy.get("input[id=settings_import]").uploadFile(settings_file_short); })


      cy.get('#listElem_0 > .nameBox')
        .click()
      cy.open_menu_settings()

      cy.get('#menuTimeForm_short_name')
        .should('be.checked')


      // Import YYY, with 'time delta' selected
      cy.open_menu_settings()
      cy.get('#settings_import')
        .should("be.visible")
        .then(($btn) => { cy.get("input[id=settings_import]").uploadFile(settings_file_delta); })

      cy.get('#listElem_0 > .nameBox')
        .click()
      cy.open_menu_settings()

      cy.get('#menuTimeForm_delta_date')
        .should('be.checked')

      return 
    })

  
})
