/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Filters', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('filter using color box (Tag)',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //use color by tag
    cy.get('#color_menu_select').select('Tag')
    cy.get('#info').find('.tagColorBox').should('have.length', 10)

    //change tag of clone0
    cy.get('#listElem_0').find('.starBox').click()
    cy.get('.tagSelector').find('#tagElem_0').click()

    //filter tag 0 out
    cy.get('#info').find('.tagColorBox').first().click()
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 1)
    cy.get('#listElem_0').should('not.be.visible')
    
    //remove filter 
    cy.get('#filter_list',{ force: true }).children('div').find('.button').click({ force: true })
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 0)
    cy.get('#listElem_0').should('be.visible')

    return
  })


  it('filter using Search',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 7)

    cy.get('#filter_input').type("cluster{enter}")
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 2)

    cy.get('#filter_input').clear().type("clone{enter}")
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 6)

    cy.get('#filter_input').clear().type("AAT{enter}")
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 3)

    //check filter list
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 1)

    //remove filter
    cy.get('#clear_filter').click()
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 0)
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 7)

    return
  })


  it('filter menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //top slider
    cy.get('#top_slider',{ force: true }).click({ force: true })
    cy.get('#top_slider',{ force: true }).invoke('val', 5).trigger('change')
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 5)

    //focus on single sample
    cy.get('#filter_switch_sample',{ force: true }).click({ force: true })
    cy.get('#time1').click()
    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 4)
    return
  })


  it('filter focus/hide',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#reset_focus').should("not.be.visible")

    //focus
    cy.get('#listElem_0').click()
    cy.get('#listElem_2').click({ctrlKey: true})
    cy.get('#listElem_4').click({ctrlKey: true})
    cy.get('#listElem_5').click({ctrlKey: true})
    cy.get('#focus_selected').click()

    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 4)
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 1)
    cy.get('#reset_focus').should("be.visible")

    //hide
    cy.get('#listElem_0').click()
    cy.get('#listElem_4').click({ctrlKey: true})
    cy.get('#hide_selected').click()

    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 2)
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 2)
    cy.get('#reset_focus').should("be.visible")

    //reset
    cy.get('#reset_focus').click()

    cy.get('#list_clones').children('li').filter(':visible').should('have.length', 7)
    cy.get('#filter_list',{ force: true }).children('div').should('have.length', 0)
    cy.get('#reset_focus').should("not.be.visible")

    return
  })



})
