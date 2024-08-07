/// <reference types="cypress" />

var localhost = true
var url = "./browser/index.html"
console.log( url )


describe('Report', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('export_fasta',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // select clones
    cy.get('#listElem_0').click()
    cy.get('#listElem_1').click({ctrlKey: true})

    // export inside current page body -> target blank
    cy.newTabDisabler()
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


  it('modular report menu',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    cy.get('#export_report_menu').click({force: true})

    cy.log(cy.get('#report-clones-list > div'))
    cy.get('#report-clones-list > div').contains("Add clonotypes to the report with")

    cy.get('div[style="display: block;"] > .closeButton > .icon-cancel').click()

    cy.selectCloneMulti([0, 2, 6])

    cy.get('#tag_icon__multiple').click()
    cy.get(':nth-child(15) > div > .icon-newspaper').click()

    cy.selectCloneMulti([0, 2]) // change active selection

    cy.get('#export_report_menu').click({force: true})

    cy.get('#rs-selected-clones-count')
      .contains("[3 selected]") // correct number of clone added to report

    cy.get('#rs-clone-clone-001')
      .should("be.visible")
    cy.get('#rs-clone-clone3')
      .should("be.visible")
    cy.get('#rs-clone-clone_cluster2')
      .should("be.visible")

    cy.get('#rs-clone-clone-001 > .icon-cancel')
      .click() // remove clone from selection to export

    cy.get('#rs-selected-clones-count')
      .contains("[2 selected]") // correct number of clone after removing of first clone

    cy.get('#rs-clone-clone-001')
      .should("not.exist")

    return
  })

  it('Save/delete as template & report',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    cy.get('#export_report_menu').click({force: true})


    // first save as template, should save and close
    cy.get('#rs-save-button-template').click()
    cy.get('#console_text_input')
      .should("be.visible")
      .clear().type("test")
    cy.get("#confirm_btn_continue").click()
    cy.get('#console_text_input')
      .should("not.be.visible")
    cy.get('.flash_1').should("contain", "report template 'test'")

    // second save as template, should save and close
    cy.get('#rs-save-button-template').click()
    cy.get('#console_text_input')
      .should("be.visible")
      .clear().type("test")
    cy.get("#confirm_btn_continue").click()
    cy.get('#console_text_input')
      .should("not.be.visible")
    cy.get('.flash_1').should("contain", "report template 'test'")

    // Save as report with same name, should show flash and 9keep open confirbox
    cy.get('#rs-save-button-report').click()
    cy.get('#console_text_input')
      .should("be.visible")
      .clear().type("test")
    cy.get("#confirm_btn_continue").click()
    cy.get('#console_text_input')
      .should("be.visible")
    cy.get('.flash_2').should("contain", "A local template with the same")

    // Set a new name
    cy.get('#console_text_input')
      .clear().type("test_report")
    cy.get("#confirm_btn_continue").click()
    cy.get('#console_text_input')
      .should("not.be.visible")
    cy.get('.flash_1').should("contain", "report settings 'test_report'")

    // Delete report
    cy.get('#optgroup_report_saved')
      .should("contain", "test_report")

    cy.get('#rs-delete-button').click()
    cy.get('#popup_container_box')
      .should("contain", "Are you sure you want to delete")
    cy.get("#confirm_btn_continue").click()
    cy.get('#optgroup_report_saved')
      .should("not.contain", "test_report")

    // Save again this report AS template
    cy.get('#rs-save-button-template').click()
    cy.get('#console_text_input')
      .should("be.visible")
      .clear().type("test_report")
    cy.get("#confirm_btn_continue").click()
    cy.get('#console_text_input')
      .should("not.be.visible")
    cy.get('.flash_1').should("contain", "report template 'test'")
    cy.get('#optgroup_user_template')
      .should("contain", "test_report")

    return
  })
  
})

