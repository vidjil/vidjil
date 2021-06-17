/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Actions v1', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })



  it('Open a simple vidjil file',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    cy.get('#list_clones').children().should('have.length', 8)
    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.408%")

    return
  })



  it('Open a vidjil file + analysis',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")
    // second sample open with analysis, so size is smaller
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.014%")
    cy.get('#listElem_6 > .nameBox').should('not.visible');
    return
  })





  it('test_00_list_clones',  function() {
      cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")
      //   # change current sample to start on sample 0 (second in loaded order)
      // cy.get("body").type("{rightarrow}")
      cy.update_icon()

      // declare variables
      var lock      = cy.get('#div_sortLock')
      var listClone = cy.get('#list_clones')

      // tester la presence du lock
      cy.get('#div_sortLock')
        .should('have.class', "icon-lock-1 list_lock_on")
        .and('have.attr', 'title')
        .and('include', "Release sort as '-' on sample diag")

      cy.get('#list_clones').children().eq(0)
        .should("contain", "Main ALL clone")
      cy.get('#list_clones').children().eq(1)
        .should("contain", "TRG smaller clone")

      // change order by 'size'
      cy.get('#list_sort_select')
        .select('size')
        .should('have.value', 'size')
      cy.get('#list_sort_select')
        .should('not.have.value', '-')

      cy.update_icon()
      // cy.waitForUpdates()

      cy.get('#div_sortLock').should('have.class', "icon-lock-1 list_lock_on")
        .and('have.attr', 'title')
        .and('include', "Release sort as 'size' on sample fu1")
      cy.get('#list_clones').children().eq(0)
        .should("contain", "TRG smaller clone")
      cy.get('#list_clones').children().eq(1)
        .should("contain", "Main ALL clone")


      // Ex test_01_xxx
      cy.get("body").type("{rightarrow}")
      cy.update_icon()

      cy.get('#list_clones').children().eq(0)
        .should("contain", "TRG smaller clone")

      cy.get('#div_sortLock').should('have.class', "icon-lock-1 list_lock_on")
        .and('have.attr', 'title')
        .and('include', "Release sort as 'size' on sample fu1")

      cy.get('#list').screenshot('/panel_list_v2')
 })



})
