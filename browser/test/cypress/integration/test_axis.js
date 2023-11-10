/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('List', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })



  it('00-Axis size in locus',  function() {
    // Test for axis "Size in locus" and "Size in locus (+inc)"
    cy.openAnalysis("data/issues/issues_4541/4541.vidjil") // Locus loaded in client TRD+, IGH, IGH+, IGK+
    cy.wait(200)

    // Initial state
    cy.getCloneSize(0).should('contain', "10.16%") // TRD+
    cy.getCloneSize(1).should('contain', "62.10%") // IGK+
    cy.getCloneSize(2).should('contain', "1.174%") // IGH
    cy.getCloneSize(4).should('contain', "0.034%") // IGH+
    
    // using axis_x selector in scatterplot
    cy.get('#visu').find('select[name*="select_x[]"]').select("Size in locus",{ force: true })
    cy.get('#visu_axis_container').should('contain', "Size in locus")
    cy.get('#visu').find('select[name*="select_x[]"]').select("Size in locus (+inc)",{ force: true })
    cy.get('#visu_axis_container').should('contain', "Size in locus (+inc)")


    // Using axis selector in clone list
    cy.changeListAxix("Size in locus")
    cy.getCloneSize(0).should('contain', "78.23%") // TRD+
    cy.getCloneSize(1).should('contain', "74.29%") // IGK+
    cy.getCloneSize(2).should('contain', "34.72%") // IGH
    cy.getCloneSize(4).should('contain', "100.0%") // IGH+; only clone of IGH+
    
    cy.changeListAxix("Size in locus (+inc)")
    cy.getCloneSize(0).should('contain', "78.06%") // TRD+; 51 reads of TRD in file, so less than prior
    cy.getCloneSize(1).should('contain', "74.29%") // IGK+; No igk; so same value
    cy.getCloneSize(2).should('contain', "34.37%") // IGH; Merge IGH//IGH+; so less
    cy.getCloneSize(4).should('contain', "1.008%") // IGH+; Merge IGH//IGH+, so less

    return
  })


})
