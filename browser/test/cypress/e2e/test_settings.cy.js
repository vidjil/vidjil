/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


// those tests are opening different .vidjil files with or without .analysis and check the expected data have been loaded
describe('Settings', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


    it('01 - change settings an check is store',  function() {
      cy.openAnalysis("doc/analysis-example2.vidjil")

      var type_name = "short_name"
      cy.change_name_key(type_name)
      cy.test_name_values(type_name)

      // reload page, settings saved ?
      cy.setBrowser(url)
      cy.openAnalysis("doc/analysis-example2.vidjil")
      cy.test_name_values(type_name)

      type_name = "delta_date"
      cy.change_name_key(type_name)
      cy.test_name_values(type_name)

      // reload page, settings saved ?
      cy.setBrowser(url)
      cy.openAnalysis("doc/analysis-example2.vidjil")
      cy.test_name_values(type_name)
    })


    it('02 - export file', { browser: 'chromium' }, function() {
      // Skip old version of firefox (~86) cypress download directory is not found (maybe resolve on cypress > 12.9)
      if (Cypress.browser.name === 'firefox' && Cypress.browser.version.split(".")[0] == "86") {
        // don't know why, but this condition don't work
        cy.log(`${Cypress.browser.name === 'firefox'} -- ${Cypress.browser.version} -- ${Cypress.browser.version.split(".")[0] == "86"}`) // return true -- 86.0 -- true
        this.skip
      }
      
      cy.openAnalysis("doc/analysis-example2.vidjil")

      var type_name = "short_name"
      cy.change_name_key(type_name)
      cy.test_name_values(type_name)
      cy.wait(500)

      // cy.open_menu_settings()
      cy.openSettingsManager()
      cy.get('#settings_export')
        .should("be.visible")
        .click()

      cy.readFile('cypress/downloads/vidjil_settings.json')
        .its('timeFormat').should('eq', "short_name")


      cy.get('#settings_reset').click({force:true})
      cy.get('#settings_export')
        .should("be.visible")
        .click()

      var increase = Cypress.browser.name === 'firefox' ? "(1)" : "" // Downaloded file name increase on firefox, but not on chrome
      cy.readFile(`cypress/downloads/vidjil_settings${increase}.json`)
        .its('timeFormat').should("eq", undefined)
    })


    it('03 - import settings files',  function() {
      cy.openAnalysis("doc/analysis-example2.vidjil")
      // cy.open_menu_settings()
      cy.openSettingsManager()
      var settings_file_short = "browser/test/data/vidjil_settings_format_short.json"
      var settings_file_delta = "browser/test/data/vidjil_settings_format_delta.json"


      // Before import; correct time format selected (time delta)
      cy.get('#menuTimeForm_delta_date')
        .should('be.checked')


      // Import settings XXX, with 'short name' selected
      // cy.open_menu_settings()
      cy.openSettingsManager()
      cy.get('#settings_import')
        .should("be.visible")
        .then(($btn) => { cy.get("#settings_import").selectFile(settings_file_short); })


      cy.get('#listElem_0 > .nameBox')
        .click()
      cy.open_menu_settings()
      // cy.openSettingsManager()

      cy.get('#menuTimeForm_short_name')
        .should('be.checked')

      cy.close_menu_settings()

      // Import YYY, with 'time delta' selected
      // cy.open_menu_settings()
      cy.openSettingsManager()
      cy.get('#settings_import')
        .should("be.visible")
        .then(($btn) => { cy.get("#settings_import").selectFile(settings_file_delta); })

      cy.get('#listElem_0 > .nameBox')
        .click()
      cy.open_menu_settings()

      cy.get('#menuTimeForm_delta_date')
        .should('be.checked')

      return 
    })

    it('04 - import settings files - report',  function() {
      cy.openAnalysis("doc/analysis-example2.vidjil")
      cy.openSettingsManager()
      var settings_file_report = "browser/test/data/vidjil_settings_with_report.json"


      cy.openSettingsManager()
      cy.get('#settings_import')
        .should("be.visible")
        .then(($btn) => { cy.get("#settings_import").selectFile(settings_file_report); })

      cy.get('.flash_container > :nth-child(1)')
        .should("contain", "Import templates: own_template_XXX")

      cy.get('#export_report_menu').click({force: true})

      cy.get('#rs-save-select')
        .select("own_template_XXX")
      return 

    })


    it('05 - reset selected primerset',  function() {
      cy.openAnalysis("doc/analysis-example2.vidjil")
      
      // At init, no primer gap computed
      cy.changePreset("visu", "Primers gap")
      cy.get("#visu_id_label_x_undefined")
        .should("exist")
      
      // After primer set selection, undefined primer gap is no more present
      cy.get("#primers_ecngs").click({force:true})
      cy.get("#visu_id_label_x_undefined")
        .should("not.be.visible")
      cy.get("#visu_id_label_x_100")
        .should("exist")
      
      // After loading of new analysis, primer set is reseted to undefined
      cy.openAnalysis("doc/analysis-example2.vidjil")
      cy.changePreset("visu", "Primers gap")
      cy.get("#visu_id_label_x_undefined")
        .should("exist")
      cy.get("#visu_id_label_x_100")
        .should("not.exist")

    })

  
})
