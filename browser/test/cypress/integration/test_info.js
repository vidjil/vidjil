var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

describe('Colors', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  //check color and info panel are updated after selecting a new axis as color
  it('00-info',  function() {
    cy.openAnalysis("/data/issues/4070_diversity_null.vidjil")
    cy.get('.button > .icon-info').click()

    cy.get('#line_index_Ds_diversity > :nth-child(2)')
      .should("have.text", "null")
  })

  //check color and info panel are updated after selecting a new axis as color
  it('01-overlap index',  function() {
    cy.openAnalysis("/data/issues/4422.vidjil")
    cy.get('.button > .icon-info').click()

    cy.get("#overlap_morisita")
      .should("exist", "Morisita overlap table exist")
    cy.get("#overlap_jaccard")
      .should("exist", "Jaccard overlap table exist")
  })

})
