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
    var clone_igh_distrib_preset_length = 19
    var clone_trb_distrib_preset_length = 22
    var clone_igh_preset_VJ             = 31


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

    
  it('5462 - Load smaller clones for each locus', function() {
    // Even if no clone present with locus with some reads/clonotypes, a smaller clone is present 
    cy.openAnalysis("demo/Demo-X5-no-clone.vidjil")
    cy.get('#listElem_20 > .nameBox')
      .should("exist")
      .should('have.attr', 'title', "IGK+ smaller clonotypes")
    cy.get('#listElem_20 > .axisBox')
      .should("exist")
      .should('have.attr', 'title', "0 nt, 2 reads  reads")
  
  });

  it('supplementary data - Show mrd values', function() {
    // Even if no clone present with locus with some reads/clonotypes, a smaller clone is present 
    cy.openAnalysis("browser/test/data/clonotypes_mrd.vidjil")

    cy.get('#listElem_0 > #clone_infoBox_0 > .icon-info')
      .click()

    cy.get('#modal_header_MRD_normalization > .header')
      .should("exist")

    cy.get('#modal_line_title_mrd_norm_cells')
      .should("exist")

    cy.get('#modal_line_title_mrd_spike_norm_factor')
      .should("not.exist")
  


    cy.get('#listElem_1 > #clone_infoBox_1 > .icon-info')
      .click()

    cy.get('#modal_header_MRD_normalization > .header')
      .should("exist")

    cy.get('#modal_line_title_mrd_norm_cells')
      .should("not.exist")

    cy.get('#modal_line_title_mrd_spike_norm_factor')
      .should("exist")
  });


  it('5xxx - supplementary_data table', function () {
    cy.openAnalysis("browser/test/data/supplementary_data.vidjil")

    cy.get('#listElem_0 > #clone_infoBox_0 > .icon-info')
      .click()

    cy.get('.info-container')
      .should("be.visible")

    ////////////////////////////////////////////////////////////////////////////////////
    // Test with some various data values, from "raw data" or array with a single value
    ////////////////////////////////////////////////////////////////////////////////////
    cy.get('#modal_header_various_content')
      .should("have.text", "various_content")

    cy.get('#modal_line_various_content_constant_value_string')
      .should("contain", "constant_value_string")
      .should("contain", "a string value")

    cy.get('#modal_line_various_content_constant_a_float')
      .should('contain', "constant_a_float")
      .should('contain', 1.234)

    cy.get('#modal_line_various_content_constant_an_integer')
      .should('contain', "constant_an_integer")
      .should('contain', 5)

    cy.get('#modal_line_various_content_array_value_string')
      .should('contain', "array_value_string")
      .should('contain', "a string value")

    cy.get('#modal_line_various_content_array_a_float')
      .should('contain', "array_a_float")
      .should('contain', 1.234)

    cy.get('#modal_line_various_content_array_an_integer')
      .should('contain', "array_an_integer")
      .should('contain', 5)

    /////////////////////////////////////////
    // Test of data with specific table name
    /////////////////////////////////////////
    cy.get('#modal_header_content_with_name')
      .should("have.text", "Content with a declared name")

    cy.get('#modal_line_content_with_name_unordered_abc')
      .should('contain', "unordered_abc")
      .should('contain', "unorder ABC")

    //////////////
    // test order
    cy.get('#clone_info_table_0')
      .invoke('text')
      .should('match', /unorder ABC.*unorder GHI/);

    cy.get('#clone_info_table_0')
      .invoke('text')
      .should('match', /ordered_def.*ordered_abc/);


    ///////////////////////////////
    // Test with multiple sample
    cy.openAnalysis("browser/test/data/supplementary_data_multiple.vidjil")

    cy.get('#listElem_0 > #clone_infoBox_0 > .icon-info')
      .click()

    cy.get('.info-container')
      .should("be.visible")

    cy.get('#modal_line_various_content_array_value_string')
      .invoke('text')
      .should('match', /array_value_string.*keyA.*keyB/);

  });

})
