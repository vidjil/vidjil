/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Actions v1', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('Plot mode',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //check visibility
    cy.get('#visu_plot_container').children('circle').should('have.length', 8)
    cy.get('#visu_plot_container').children('circle').should('be.visible')
    cy.get('#visu_bar_container').children('rect').should('not.be.visible')

    //check axis x
    cy.get('#visu_axis_x_container').children('line').should('have.length', 2)
    cy.get('#visu_axis_container').should('contain', "V/5' gene")
    //check axis y
    cy.get('#visu_axis_y_container').children('line').should('have.length', 2)
    cy.get('#visu_axis_container').should('contain', "J/3' gene")
    
    return
  })
  
  it('Bar mode',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#visu').find('.sp_menu_icon_bar').click({ force: true })

    //check visibility
    cy.get('#visu_bar_container').children('rect').should('have.length', 8)
    cy.get('#visu_plot_container').children('circle').should('not.be.visible')
    cy.get('#visu_bar_container').children('rect').should('be.visible')

    //check axis y (axis y should automaticaly switch to size in bar mode)
    cy.get('#visu_axis_y_container').children('line').should('have.length', 6)
    cy.get('#visu_axis_container').should('contain', "size")
    
    return
  })

  it('Switch Axis',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //using preset selector
    cy.get('#visu').find('.axis_select_preset_select').select('V/N length',{ force: true })

    cy.get('#visu_axis_x_container').children('line').should('have.length', 2)
    cy.get('#visu_axis_container').should('contain', "V/5' gene")
    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "N length")
    
    //using preset keyboard shortcut
    cy.get('body').trigger('keydown', { keyCode: 49});
    cy.wait(200);
    cy.get('body').trigger('keyup', { keyCode: 49});

    cy.get('#visu_axis_x_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "V/5 allele")
    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "J/3 allele")

    //using axis_x selector
    cy.get('#visu').find('select[name*="select_x[]"]').select('clone consensus length',{ force: true })

    cy.get('#visu_axis_x_container').children('line').should('have.length', 7)
    cy.get('#visu_axis_container').should('contain', "clone consensus length")

    //using axis_y selctor
    cy.get('#visu').find('select[name*="select_y[]"]').select('CDR3 length (nt)',{ force: true })

    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "CDR3 length (nt)")

    return
  })


  it('custom Axis range',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#visu').find('select[name*="select_x[]"]').select('clone consensus length',{ force: true })
    cy.get('#visu_axis_x_container').children('line').should('have.length', 7) // 0/20/40/60/80/100/120

    cy.window().then((win) => {win.sp.updateScaleX([40,120]);});
    cy.get('#visu_axis_x_container').children('line').should('have.length', 9) // 40/50/60/70/80/90/100/110/120

    cy.window().then((win) => {win.sp.updateScaleX([91,114]);});
    cy.get('#visu_axis_x_container').children('line').should('have.length', 6) // 90/95/100/105/110/115

    return
  })


  it('select/focus',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //plot
    //hover
    cy.get('#visu_circle1').trigger('mouseover').should('have.class', 'circle_focus')

    //click
    cy.get('#visu_circle1').click()
    cy.get('#visu_circle1').should('have.class', 'circle_select')

    //dblclick
    cy.get('.info-container').should('not.be.visible')
    cy.get('#visu_circle1').dblclick()
    cy.get('.info-container').should('be.visible')
    cy.get('.info-container').should('contain', "clone2")
    cy.get('.info-container').find('.closeButton').click()


    //bar
    //hover
    cy.get('#visu').find('.sp_menu_icon_bar').click({ force: true })
    cy.get('#visu_bar0').trigger('mouseover').should('have.class', 'circle_focus')

    //click
    cy.get('#visu_bar0').click()
    cy.get('#visu_bar0').should('have.class', 'circle_select')

    //dblclick
    cy.get('.info-container').should('not.be.visible')
    cy.get('#visu_bar0').dblclick()
    cy.get('.info-container').should('be.visible')
    cy.get('.info-container').should('contain', "clone-001")
    cy.get('.info-container').find('.closeButton').click()

    return
  })

})
