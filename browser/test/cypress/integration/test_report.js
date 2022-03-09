/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Report', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('export_disable',  function() {
    cy.openAnalysis("doc/analysis-example1.vidjil")

    // single sample -> disable monitor report
    cy.get('#export_monitor_report')
      .invoke('css', 'pointer-events')
      .should('equal', 'none')

    // sequence not aligned -> disable export align
    cy.get('#export_fasta_align')
      .invoke('css', 'pointer-events')
      .should('equal', 'none')

    return
  })

  it('export_monitor',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // multi sample -> enable monitor report
    cy.get('#export_monitor_report')
      .invoke('css', 'pointer-events')
      .should('equal', 'auto')

    //TODO

    return
  })


  it('export_fasta',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // select clones
    cy.get('#listElem_0').click()
    cy.get('#listElem_1').click({ctrlKey: true})

    // export inside current page body -> target blank
    cy.get('#post_target_blank').click({force:true})
    cy.get('#export_fasta').click({force:true});

    // check result
    cy.get('body').contains(">clone-001    119 nt, 243 241 reads (97.29%)")
    cy.get('body').contains("clone2    6 nt, 153 reads (0.061%)")

    //aligned fasta
    cy.get('#align').click()
    cy.get('#export_fasta_align')
      .invoke('css', 'pointer-events')
      .should('equal', 'auto')
    cy.get('#export_fasta_align').click({force:true});


    cy.get('body').contains("–––––––––––––––––––––––––––––––GATAC––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––A")

    return
  })
  
})

