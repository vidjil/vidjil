/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test sandbox', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('00-distrib_splitted_by_locus',  function() {
    cy.openAnalysis("browser/test/data/fused_multiple_distrib_locus.vidjil")
  
    // Tests on size after top change
    cy.get("#top_slider")
      .invoke('val', 5)
      .trigger('change',{ force: true })

    // change in another preset with distributions clones
    cy.changePreset("visu", "read length distribution")
    cy.update_icon(1000)

    // Define clones ids
    var clone_real        = 0
    var clone_igh_distrib_preset_length = 17
    var clone_trb_distrib_preset_length = 20
    var clone_igh_preset_VJ             = 29


    cy.getCloneInScatterplot(clone_real,  "bar").should("be.visible") // 'real' clone exist in sp
    cy.getCloneInScatterplot(clone_igh_distrib_preset_length, "bar").should("be.visible") // 'corresponding distrib' clone (IGH, len=160) exist in sp
    cy.getCloneInScatterplot(clone_trb_distrib_preset_length, "bar").should("be.visible") // 'corresponding distrib' clone (TRD, len=173) exist in sp
    cy.getCloneInScatterplot(clone_igh_preset_VJ, "bar").should("not.be.visible") // 'NOT correpsonding distrib' clone DON'T exist in sp
    cy.getCloneInList(clone_igh_distrib_preset_length).should("be.visible") // 'corresponding distrib' clone (IGH, len=160) exist in list
    cy.getCloneInList(clone_trb_distrib_preset_length).should("be.visible") // 'corresponding distrib' clone (TRD, len=173) exist in list


    // Verify that data don't reappear at m.update()
    cy.get("#visu").click()
    cy.update_icon()
    cy.getCloneInScatterplot(clone_igh_preset_VJ, "bar").should("not.be.visible") // 'other' clone DON'T exist in graph
    

    // Hide TRD locus and verify that it is now hidden
    cy.get(':nth-child(1) > .systemBoxNameMenu').click() // todo: change by a direct call (after !1135 trash watir)
    cy.update_icon()
    // Visibility in scatterplot
    cy.getCloneInScatterplot(clone_igh_distrib_preset_length, "bar").should("be.visible") // 'corresponding distrib' clone (IGH, len=160) exist in sp
    cy.getCloneInScatterplot(clone_trb_distrib_preset_length, "bar").should("not.be.visible") // 'corresponding distrib' clone (TRD, len=173) is hidden
    // Visibility in list
    cy.getCloneInList(clone_igh_distrib_preset_length).should("be.visible") //'corresponding distrib' clone (IGH, len=160) exist in clone list"
    cy.getCloneInList(clone_trb_distrib_preset_length).should("not.be.visible") //'corresponding distrib' clone (TRD, len=173) is hidden in clone list"

    return
  })


  it('01-hide_clone',  function() {
    cy.viewport(1000, 600) // restore old viewport, old firefox seem to have probleme of superposition of DOM element
    cy.openAnalysis("tools/tests/data/fused_multiple.vidjil")
    cy.getCloneInList(1).should('be.visible')

    cy.selectClone(1)
    cy.get('#hide_selected').click()
    cy.changePreset("visu", "read length distribution")
    cy.update_icon(500)

    cy.getCloneInList(0).scrollIntoView().should('be.visible')
    cy.getCloneInList(1).should('not.be.visible')

    cy.getCloneInScatterplot(0, "bar").should('be.visible')
    cy.getCloneInScatterplot(1, "bar").should('not.be.visible')
  })


  it('02-download AIRR from getHtmlInfo',  function() {
    cy.openAnalysis("tools/tests/data/fused_multiple.vidjil")
    cy.openCloneInfo(0)
    cy.get('#download_info_0_airr').should("be.visible")
  })

})
