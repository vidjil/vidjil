/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test screenshot client', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

    it('00-screenshot_on_opened_analysis',  function() {

        
        cy.openAnalysis("doc/demo_lil_l3_tutorial.vidjil", "doc/demo_lil_l3_tutorial.analysis", 90000)

        cy.screenshot('starting_state')


        cy.get('#info')
          .screenshot('panel_info')


        cy.openClusterClone(1)
        cy.get('#list')
          .screenshot('panel_list_merge_2')

        cy.closeClusterClone(1)
        cy.get('#list')
          .screenshot('panel_list')

        // switch locus to TRG
        cy.get('#toogleLocusSystemBox_TRG')
          .click()
          .update_icon(1000)

        cy.get('#visu_back')
          .screenshot('panel_scatterplot')


        cy.selectClone(25)
        cy.selectClone(100, true)
        cy.selectClone(107, true)
        cy.selectClone(124, true)
        cy.selectClone(132, true)
        cy.get('#align')
          .click()
          .update_icon(300)
        cy.get('#aligner-open-button')
          .click({force: true})

        cy.get('.aligner')
          .screenshot('panel_sequence')

        cy.selectClone(1)
        // hide untagged clones
        cy.get('#tag_none').click()
        cy.update_icon()
        cy.get('#tag_standard').click()
        cy.update_icon()
        cy.get('#aligner-open-button')
          .screenshot('panel_bot_bar')
        cy.get('#list')
          .screenshot('panel_list_merge_1')

        cy.get('#visu2_back')
          .screenshot('panel_graph')

        cy.get('.button > .icon-info').click()
        cy.get('#line_index_Ds_diversity > :nth-child(1)')
          .scrollIntoView()
        cy.screenshot("diversity_not_splitted", { clip: { x: 505, y: 470, width: 250, height: 80 } })


        // Splitted diversity
        cy.openAnalysis("data/fused_diversity_splitted.vidjil")
        cy.get('.button > .icon-info').click()
        cy.get('#line_index_Ds_diversity_IGH > :nth-child(1)')
          .scrollIntoView()
        cy.screenshot("diversity_splitted_by_locus", { clip: { x: 512, y: 255, width: 250, height: 250 } })

    })



})