var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Graph', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  it('Graph init',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //check correct number of samples are present in graph [2])
    cy.get('#time0').should('have.length', 1)
    cy.get('#time1').should('have.length', 1)
    cy.get('#time2').should('have.length', 0)

    //check checkboxes default values
    cy.get('#visu2_listElem_check_0').should('be.checked')
    cy.get('#visu2_listElem_check_1').should('be.checked')

    //check if selected samples is time0
    cy.get('#time0').should('have.class','graph_time2');

    //check top right menu content
    cy.get('#visu2_title').contains("2 / 2")

    return
  })

  // test commands in top right menu
  it('Graph Menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //change selected sample 
    cy.get("#visu2_listElem_text_1").click({force:true})
    cy.get('#time1').should('have.class','graph_time2');
    cy.get('#time0').should('not.have.class','graph_time2');

    //disable a sample
    cy.get('#visu2_listElem_check_0').click({force:true})
    cy.get('#time0').should('have.length', 0)
    cy.get('#visu2_listElem_check_0').should('not.be.checked')
    cy.get('#visu2_title').contains("1 / 2")

    //enable  a sample
    cy.get('#visu2_listElem_check_0').click({force:true})
    cy.get('#time0').should('have.length', 1)
    cy.get('#visu2_listElem_check_0').should('be.checked')
    cy.get('#visu2_title').contains("2 / 2")

    //focus on selected sample
    cy.get("#visu2_listElem_text_1").click({force:true})
    cy.get('#visu2_listElem_hideAll').click({force:true})
    cy.get('#time0').should('have.length', 0)
    cy.get('#time1').should('have.length', 1)
    cy.get('#visu2_listElem_check_0').should('not.be.checked')
    cy.get('#visu2_listElem_check_1').should('be.checked')

    //showall
    cy.get("#visu2_listElem_showAll").click({force:true})
    cy.get('#time0').should('have.length', 1)
    cy.get('#time1').should('have.length', 1)
    cy.get('#visu2_listElem_check_1').should('be.checked')
    cy.get('#visu2_listElem_check_1').should('be.checked')

    //focus on selected clonotype
    cy.get("#listElem_5").click()
    cy.get("#visu2_listElem_hideNotShare").click({force:true})
    cy.get('#time0').should('have.length', 1)
    cy.get('#time1').should('have.length', 0)
    cy.get('#visu2_listElem_check_0').should('be.checked')
    cy.get('#visu2_listElem_check_1').should('not.be.checked')

    return
  })

  // test interaction with header
  it('Graph header',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //click on header (select sample)
    cy.get("#time1").click()
    cy.get('#time1').should('have.class','graph_time2');
    cy.get('#time0').should('not.have.class','graph_time2');

    cy.get("#time0").click()
    cy.get('#time0').should('have.class','graph_time2');
    cy.get('#time1').should('not.have.class','graph_time2');

    //drag drop (reorder samples)
    cy.get('#time0').invoke('attr', 'x').should('eq', '172')
    cy.get('#time0').trigger('mousedown', { which: 1 })
                    .trigger('mousemove', { clientX: 1000, clientY: 200 })
                    .trigger('mouseup', {force: true})
    cy.get('#time0').invoke('attr', 'x').should('eq', '378')

    //dblclick on header (shide sample)
    cy.get("#time1").dblclick()
    cy.get('#time1').should('have.length', 0)

    return
  })

  it('Graph shortcut', { browser: '!firefox' },  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //right 
    cy.get('body').trigger('keydown', { keyCode: 39});
    cy.wait(200);
    cy.get('body').trigger('keyup', { keyCode: 39});
    cy.get('#time0').should('not.have.class','graph_time2');
    cy.get('#time1').should('have.class','graph_time2');

    //left
    cy.get('body').trigger('keydown', { keyCode: 37});
    cy.wait(200);
    cy.get('body').trigger('keyup', { keyCode: 37});
    cy.get('#time0').should('have.class','graph_time2');
    cy.get('#time1').should('not.have.class','graph_time2');

    return
  })

  it('Graph axis resize',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // both sample min/max 0.01 -> 100%
    cy.get('.graph_text').contains('100%').should('have.length', 1)
    cy.get('.graph_text').contains('0.01%').should('have.length', 1)

    // sample 0 only | min/max  0.1% -> 100%
    cy.get('#visu2_listElem_check_1').click({force:true})
    cy.get('.graph_text').contains('100%').should('have.length', 1)
    cy.get('.graph_text').contains('0.1%').should('have.length', 1)
    cy.get('.graph_text').contains('0.01%').should('have.length', 0)

    // sample 1 only | min/max 0.01% -> 10%
    cy.get('#visu2_listElem_check_1').click({force:true})
    cy.get('#visu2_listElem_check_0').click({force:true})
    cy.get('.graph_text').contains('100%').should('have.length', 0)
    cy.get('.graph_text').contains('10%').should('have.length', 1)
    cy.get('.graph_text').contains('0.01%').should('have.length', 1)

    return
  })

  //test polylines class / css
  it('Graph clone',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    //default style
    cy.get('#polyline0').should('have.class', 'graph_line')

    //selected
    cy.get('#polyline0').click()
    cy.get('#polyline0').should('have.class', 'graph_select')

    //hidden
    // set tag 0 to clone 0
    cy.get('#listElem_0').find('.starBox').click()
    cy.get('.tagSelector').find('#tagElem_0').click()
    // hide tag 0
    cy.get('#color_menu_select').select('Tag')
    cy.get('#info').find('.tagColorBox').first().click()
    cy.get('#polyline0').should('have.class', 'graph_inactive')
    
    return
  })

})
