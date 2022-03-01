/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('List', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })



  it('00-Open a simple vidjil file',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")
    cy.get('#list_clones').children().should('have.length', 8)
    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.408%")

    return
  })



  it('01-Open a vidjil file + analysis',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")
    // second sample open with analysis, so size is smaller
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.014%")
    cy.get('#listElem_6 > .nameBox').should('not.visible');
    return
  })





  it('02-test_00_list_clones',  function() {
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
        .should("contain", "TRG smaller clonotype")

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
        .should("contain", "TRG smaller clonotype")
      cy.get('#list_clones').children().eq(1)
        .should("contain", "Main ALL clone")


      // Ex test_01_xxx
      cy.get("body").type("{rightarrow}")
      cy.update_icon()

      cy.get('#list_clones').children().eq(0)
        .should("contain", "TRG smaller clonotype")

      cy.get('#div_sortLock').should('have.class', "icon-lock-1 list_lock_on")
        .and('have.attr', 'title')
        .and('include', "Release sort as 'size' on sample fu1")

      cy.get('#list').screenshot('/panel_list_v2')
 })




  it('03-Handle a cluster in list',  function() {
    // link to issue #4806
    cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")

    // Open a loaded cluster
    cy.get('#listElem_6')
      .should("not.be.visible")
    cy.get('#clusterBox_5 > .icon-plus').click()

    // remove sub clone
    cy.get('#clusterBox_5 > .icon-minus')
      .should("exist")
    cy.get('#delBox_list_6 > .icon-cancel')
      .should('be.visible')
      .click()
    cy.update_icon()

    // Test that icon disapear
    cy.get('#clusterBox_5 > .icon-plus')
      .should("not.exist")
    cy.get('#clusterBox_5 > .icon-minus')
      .should("not.exist")
    cy.get('#clusterBox_5')
      .should("contain", " ")

    // Subclone should be visible in main list
    cy.get('#listElem_6')
      .should("be.visible")
    return
  })



  it('04-Title on size',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")

    // default axis; size
    cy.get('#listElem_4 > .axisBox')
      .should('have.attr', 'title', '16 nt, 1021 reads (0.408%) reads')

    cy.changeListAxix("Top")
    cy.get('#listElem_4 > .axisBox')
      .should('have.attr', 'title', '')
    return
    })


  it('05-hide_distrib_clones_with_tagspan',  function() {

    //// Issue 4375; hide distrib clone by tag
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")
    // # id     0 --> biggest clone, IGHV1, IGHJ1, _average_read_length==162
    //  # id 15/16 --> other clone (TRD, IGH)
    //  # id    18 --> lenSeqAverage/_average_read_length == 162
    //  # id    27 --> lenCDR3 (undefined), represent all clones
    //  # id    29 --> seg5; seg3 (IGHV1; IGHJ1)

    // first, distrib clones are visible, in opened preset 0 or 4
    cy.getCloneInList(0)// >> real clone exist in list
    cy.getCloneInList('29')
      .should('have.css', 'display', 'block') // seg5/seg3 distrib clone exist in list
    cy.getCloneInList('18')
      .should('not.be.visible') // lenSeqAverage distrib clone DON'T show in list


    // hide distrib clone by tag switch
    cy.get('[title="smaller clonotypes"]')
      .click()


    cy.getCloneInList('0') // real clone still presnet in list
    cy.getCloneInList('29')
      .should('not.be.visible') // seg5/seg3 distrib clone are NO MORE present in list

    // change in another preset with distributions clones
    cy.get('body').trigger('keydown', { keyCode: 52, key: "4"});
    cy.get('body').trigger('keyup',   { keyCode: 52, key: "4"});

    cy.getCloneInList('18')
      .should('not.be.visible') //lenSeqAverage distrib clone is NOT present in list"

    // Remove filter
    cy.get('body').trigger('keydown', { keyCode: 48, key: "0"});
    cy.get('body').trigger('keyup',   { keyCode: 48, key: "0"});
    cy.update_icon()
    cy.get('#tag_smaller_clonotypes')
      .click()

    cy.getCloneInList('29')
      .should('not.be.visible') // seg5/seg3 distrib clone is present in list
      .should('have.css', 'display', 'block')
  })


})
