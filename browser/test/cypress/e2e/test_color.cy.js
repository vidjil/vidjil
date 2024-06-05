var localhost = true
var url = "./browser/index.html"
console.log( url )

/*only check that interface interaction trigger a change in clone's colors
 *see Unit test to test color returning functions
 */

describe('Colors', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  //check color and info panel are updated after selecting a new axis as color
  it('Axis update',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //default axis color used is Tag
    cy.get("#0").find(".nameBox").invoke('css', 'color').then((old_color) => {

      //check correct number of element in info panel (14 boxes / 0 gradient)
      cy.get('#info').find('.tagColorBox').should('have.length', 14)
      cy.get('#info').find('.gradient').should('have.length', 0)

      //update axis color Size
      cy.get('#color_menu_select').select('Size')

      //check correct number of element in info panel (1 box / 1 gradient)
      cy.get('#info').find('.tagColorBox').should('have.length', 1)
      cy.get('#info').find('.gradient').should('have.length', 1)

      //check color of clone_0 has been updated 
      cy.get("#0").find(".nameBox").invoke('css', 'color').should("not.be.equal", old_color)
      cy.get("#polyline0").invoke('css', 'stroke').should("not.be.equal", old_color)
      cy.get("#visu_circle0").invoke('css', 'fill').should("not.be.equal", old_color)
    })

    return
  })

  //check color of a clone is updated after modifying it's parameter currently displayed by axis color
  it('Clone update',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get("#0").find(".nameBox").invoke('css', 'color').then((old_color) => {

      //change tag of clone0
      cy.get('#0').find('.starBox').click()
      cy.get('.tagSelector').find('#tagElem_dominant').click()

      //check color of clone_0 has been updated 
      cy.get("#visu2").click()
      cy.get('.info_color').find('.tagColorBox').invoke('css', 'background-color').then((new_tag_color) => {
        cy.get("#0").find(".nameBox").invoke('css', 'color').should("not.be.equal", old_color)
        cy.get("#0").find(".nameBox").invoke('css', 'color').should("be.equal", new_tag_color)
        cy.get("#polyline0").invoke('css', 'stroke').should("be.equal", new_tag_color)
        cy.get("#visu_circle0").invoke('css', 'fill').should("be.equal", new_tag_color)
      })
    })

    return
  })

  //check if clone colors are updated after a change of timepoint
  it('Time update',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //use axis color Size (because clone size change over time)
    cy.get('#color_menu_select').select('Size')

    cy.get("#0").find(".nameBox").invoke('css', 'color').then((old_color) => {

      //change timepoint
      cy.get('#time1').click()

      //check color of clone_0 has been updated 
      cy.get("#visu2").click()
      cy.get("#0").find(".nameBox").invoke('css', 'color').then((new_color) => {
        cy.get("#0").find(".nameBox").invoke('css', 'color').should("not.be.equal", old_color)
        cy.get("#0").find(".nameBox").invoke('css', 'color').should("be.equal", new_color)
        cy.get("#polyline0").invoke('css', 'stroke').should("be.equal", new_color)
        cy.get("#visu_circle0").invoke('css', 'fill').should("be.equal", new_color)
      })
    })

    return
    })

})
