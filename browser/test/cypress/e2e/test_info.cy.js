var localhost = true
var url = "./browser/index.html"
console.log( url )

describe('Colors', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  //check color and info panel are updated after selecting a new axis as color
  it('00-info',  function() {
    cy.openAnalysis("browser/test/data/issues/4070_diversity_null.vidjil")
    cy.get('.button > .icon-info').click()

    cy.get('#modal_line_value_index_Ds_diversity')
      .should("have.text", "undefined")
  })

  //check color and info panel are updated after selecting a new axis as color
  it('01-overlap index',  function() {
    cy.openAnalysis("browser/test/data/issues/4422.vidjil")
    cy.get('.button > .icon-info').click()

    cy.get("#overlap_morisita")
      .should("exist", "Morisita overlap table exist")
    cy.get("#overlap_jaccard")
      .should("exist", "Jaccard overlap table exist")
  })
  

  it('02-info informations',  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    cy.get('#info_segmented > :nth-child(2)')
      .should("have.text", '742 377 (94.35%)') // Incorrect number of segmented reads
    cy.get('#info_segmented')
      .should('have.attr', 'title', "total: 786 861") // Incorrect number of reads
    cy.get("#info_point").should("have.text", 'helloworld')

    cy.get('#toogleLocusSystemBox_TRA').should("be.visible")
    cy.get('#toogleLocusSystemBox_TRB').should("be.visible")
    cy.get('#toogleLocusSystemBox_TRD').should("be.visible")
    cy.get('#toogleLocusSystemBox_IGH').should("be.visible")
    cy.get('#toogleLocusSystemBox_ERG').should("be.visible")

    cy.get("#info_timepoint").should("not.exist")
    cy.open_sample_info()
    cy.get("#info_timepoint").should("be.visible")

    cy.get('#modal_line_value_info_timepoint_reads').should("have.text", "786861")
    cy.get('#modal_line_value_info_timepoint_analyzed_reads').should("have.text", "742377 (94.347 % )")
    
    cy.close_sample_info()
  })

  it('03-info shortcut',  function() {
    cy.openAnalysis("doc/analysis-example.vidjil")

    // check BEFORE number of reads available
    cy.get('#info_selected_locus > :nth-child(2)')
      .should("contain", "741 684 (94.26%)")


    // check hide one system
    cy.get('#toogleLocusSystemBox_TRB').click({shiftKey: false})
    cy.get('#info_selected_locus > :nth-child(2)')
      .should("contain", "25 648 (3.26%)")


    // check AFTER number of reads available
    cy.get('#toogleLocusSystemBox_TRB').click({shiftKey: true})
    cy.get('#info_selected_locus > :nth-child(2)')
      .should("contain", "716 036 (91.00%)")


    // check GET BACK to all avaialable system
    cy.get('#toogleLocusSystemBox_TRB').click({shiftKey: true})
    cy.get('#info_selected_locus > :nth-child(2)')
      .should("contain", "741 684 (94.26%)")
    
  })

})
