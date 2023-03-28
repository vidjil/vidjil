/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Scatterplot', function () {
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
  
  it('00-Bar mode',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#visu').find('.sp_menu_icon_bar').click({ force: true })

    //check visibility
    cy.get('#visu_bar_container').children('rect').should('have.length', 8)
    cy.get('#visu_plot_container').children('circle').should('not.be.visible')
    cy.get('#visu_bar_container').children('rect').should('be.visible')

    //check axis y (axis y should automaticaly switch to size in bar mode)
    cy.get('#visu_axis_y_container').children('line').should('have.length', 6)
    cy.get('#visu_axis_container').should('contain', "Size")
    
    return
  })

  it('01-Switch Axis',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //using preset selector
    cy.get('#visu').find('.axis_select_preset_select').select('V/N length',{ force: true })

    cy.get('#visu_axis_x_container').children('line').should('have.length', 2)
    cy.get('#visu_axis_container').should('contain', "V/5' gene")
    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "N length")
    
    cy.changePreset("visu", "V/J (alleles)")
    cy.update_icon()

    cy.get('#visu_axis_x_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "V/5' allele")
    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "J/3' allele")

    //using axis_x selector
    cy.get('#visu').find('select[name*="select_x[]"]').select('Sequence length',{ force: true })

    cy.get('#visu_axis_x_container').children('line').should('have.length', 13)
    cy.get('#visu_axis_container').should('contain', "Sequence length")

    //using axis_y selctor
    cy.get('#visu').find('select[name*="select_y[]"]').select('CDR3 length',{ force: true })

    cy.get('#visu_axis_y_container').children('line').should('have.length', 3)
    cy.get('#visu_axis_container').should('contain', "CDR3 length")

    return
  })


  it('02-custom Axis range',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    cy.get('#visu').find('select[name*="select_x[]"]').select('Sequence length',{ force: true })
    cy.get('#visu_axis_x_container').children('line').should('have.length', 13) // 0/20/40/60/80/100/120

    cy.window().then((win) => {win.sp.updateScaleX([40,120]);});
    cy.get('#visu_axis_x_container').children('line').should('have.length', 17) // 40/50/60/70/80/90/100/110/120

    cy.window().then((win) => {win.sp.updateScaleX([91,114]);});
    cy.get('#visu_axis_x_container').children('line').should('have.length', 13) // 90/95/100/105/110/115

    return
  })


  it('03-select/focus',  function() {
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


  it('04-tooltips',  function() {
    // # issue 4370; test tooltip content on graph
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // mouseover_delay, before hover, tooltip should be hidden
    cy.get("#visu2_tooltip")
      .should('have.css', 'opacity', '0')// correct opacity of tooltip when label is NOT hover
    cy.get('#time0')
      .trigger('mouseover')

    cy.get("#visu2_tooltip")
      .should('have.css', 'opacity', '0')// correct opacity of tooltip when label is NOT hover
      .wait(500)
      .should('have.css', 'opacity', '0')// correct opacity of tooltip when label is hover, but under timeout
      .wait(1000)
      .should('have.css', 'opacity', '1')// correct opacity of tooltip when label is hover after timeout

    cy.get('#time1')
      .trigger('mouseover')
    cy.get("#visu2_tooltip") // tooltip text don't have '\n'
      .should("have.text", "T8045-BC082-fu12019-12-27+10300 000 reads (65.53%)") //Correct text in tshe sample tooltip

    // mouseover_without_dates
    cy.openAnalysis("/doc/analysis-example.vidjil")

    cy.get('#time0')
      .trigger('mouseover')
    cy.get("#visu2_tooltip") // tooltip text don't have '\n'
      .should('have.css', 'opacity', '1')
      .should("have.text", "helloworld741 684 reads (94.26%)") //Correct text in tshe sample tooltip
  })


  it('05-labels',  function() {
    // Issue 4472; model precision is incorect if distributions clones are set
    cy.openAnalysis("/data/issues/4472.vidjil")
    cy.get('#text_container > [y="40"]').should("have.text", "100%")

    // First label is 100% with TRG, and 10% TRG hide
    cy.get('#toogleLocusSystemBox_TRG').click()
    cy.update_icon()
    cy.get('#text_container > [y="40"]').should("have.text", "10%")
  })

  it('06-Axis selector in menus',  function() {
    cy.openAnalysis("/doc/analysis-example.vidjil")
    cy.get("#visu_V5_gene")
      .should('have.attr', 'title', "V gene (or 5' segment), gathering all alleles")
  })

})
