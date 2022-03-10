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


  it('06-name_distrib_clone',  function() {
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")

    // Tests on size after top change
    cy.get('#filter_menu').click()
    cy.get("#top_slider")
      .invoke('val', 5)
      .trigger('change')
    cy.get('body').click()

    // change in another preset with distributions clones
    cy.get('body').trigger('keydown', { keyCode: 52, key: "4"});
    cy.get('body').trigger('keyup',   { keyCode: 52, key: "4"});
    cy.update_icon(1000)
    cy.getCloneInList(18).should('have.text', "162 (2 clonotypes)")

    // change sample
    cy.get('#time1').click()
    cy.getCloneInList(18).should('have.text', "162 (0 clonotype)")


    cy.get('#time2').click()
    cy.getCloneInList(18).should('have.text', "162 (7 clonotypes)")

    cy.get('#time0').click()
    cy.get('#filter_menu').click()
    cy.get("#top_slider")
      .invoke('val', 15)
      .trigger('change')
    cy.get('body').click()
    cy.getCloneInList(18).should('have.text', "162 (0 clonotype)") //name of distrib clonotype for time 0, top max

    cy.selectClone(1)
    cy.get('#hide_selected').click()
    cy.update_icon()

    cy.getCloneInList(18).should('have.text', "162 (0 clonotype)") //name of distrib clonotype for time 0, top max, clone 1 hidden
  })


  it('07-focus_clone',  function() {
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")
    cy.get('body').trigger('keydown', { keyCode: 52, key: "4"});
    cy.get('body').trigger('keyup',   { keyCode: 52, key: "4"});
    cy.get('#filter_menu').click()
    cy.get("#top_slider")
      .invoke('val', 5)
      .trigger('change')
    cy.update_icon()

    // test size before focus
    cy.getCloneSize(0).should("have.text", "20.00%")  //before focus; clone 0;correct starting size
    cy.getCloneSize(1).should("have.text", "12.00%")  //before focus; clone 1;correct starting size
    cy.getCloneSize(2).should("have.text", "10.00%")  //before focus; clone 2;correct starting size
    cy.getCloneSize(17).should("have.text", "8.000%")  //before focus; clone 17;correct starting size
    cy.getCloneSize(18).should("have.text", "8.000%")  //before focus; clone 18;correct starting size
    cy.getCloneSize(19).should("have.text", "6.000%")  //before focus; clone 19;correct starting size
    cy.getCloneInList(3).should("be.visible")

    // Focus on the selection of clonotype
    cy.selectCloneMulti([0, 1, 2, 17, 18, 19])
    cy.get('#focus_selected').click()
    cy.update_icon()

    // test size after focus
    cy.getCloneSize(0).should("have.text", "20.00%")  //After focus; clone 0;correct size
    cy.getCloneSize(1).should("have.text", "12.00%")  //After focus; clone 1;correct size
    cy.getCloneSize(2).should("have.text", "10.00%")  //After focus; clone 2;correct size
    cy.getCloneSize(17).should("have.text", "8.000%") //After focus; clone 17;correct size
    cy.getCloneSize(18).should("have.text", "8.000%") //After focus; clone 18;correct size
    cy.getCloneSize(19).should("have.text", "6.000%") //After focus; clone 19;correct size
    cy.getCloneInList(3).should("not.be.visible")

    cy.get('#focus_selected').click()
    cy.update_icon()

    // Re-click: no modification waited
    cy.getCloneSize(0).should("have.text", "20.00%")  //After focus; clone 0;correct size
    cy.getCloneSize(1).should("have.text", "12.00%")  //After focus; clone 1;correct size
    cy.getCloneInList(3).should("not.be.visible")
  })


  it('08-cluster clone',  function() {
    cy.viewport(1280, 720)
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")
    cy.get('body').trigger('keydown', { keyCode: 52, key: "4"});
    cy.get('body').trigger('keyup',   { keyCode: 52, key: "4"});
    cy.get('#filter_menu').click()
    cy.get("#top_slider")
      .invoke('val', 5)
      .trigger('change')
    cy.update_icon()

    cy.getCloneSize(1).should("have.text", "12.00%")  // Init size of a real clone before merge
    cy.getCloneSize(18).should("have.text", "8.000%") // Init size of a distrib clone (len 162) before merge
    cy.getCloneSize(19).should("have.text", "6.000%") // Init size of a distrib clone (len 164) clone before merge
    cy.selectCloneMulti([1, 2, 18])
    cy.get('#cluster').click()
    cy.update_icon()

    cy.getCloneInList(1).should("be.visible")     // Real clone A should be present in list 
    cy.getCloneInList(2).should("not.be.visible") // Real clone B should NOT be present in list 
    cy.getCloneInList(18).scrollIntoView().should("be.visible")    // Distrib clone should be present in list 

    cy.getCloneSize(1).should("have.text", "22.00%")  // Size after merge of support real clone
    cy.getCloneSize(18).should("have.text", "8.000%") // Size after merge of distrib clone (len 162)
    cy.getCloneSize(19).should("have.text", "6.000%") // Size after merge of distrib clone (len 164)

    cy.selectClone(1)
    cy.get('#hide_selected').click()
    cy.update_icon()
    cy.getCloneSize(18).should("have.text", "8.000%") // Size of distrib clone (len 162) after hiding of merged clone
    cy.getCloneSize(19).should("have.text", "6.000%") // Size of distrib clone (len 164) after hiding of merged clone

    cy.get('#list_split_all')
  })


  it('09-filter clone',  function() {
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")

    cy.get('#filter_input').type('acag{enter}') // All real clone have this sequence, no distrib clonotype
    cy.update_icon()

    cy.getCloneInList(0).should("be.visible")  // real clone exist in list
    cy.getCloneInList(18).should("not.be.visible") // distrib clone is hidden
  })


  it('10-lock',  function() {
    cy.openAnalysis("/doc/analysis-example2.vidjil")

    cy.get('#div_sortLock')
      .should('have.class', "icon-lock-1 list_lock_on")
      .should('have.attr', 'title', "Release sort as '-' on sample T8045-BC081-Diag")
    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "0") // first child should be clone 0

    cy.changeSortList("size")

    cy.get('#div_sortLock')
      .should('have.class', "icon-lock-1 list_lock_on")
      .should('have.attr', 'title', "Release sort as 'size' on sample T8045-BC081-Diag")

    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "0") // first child still should be clone 0

    cy.get('#time1').click() // change timepoint

    // sort lock still present, no change in order or text
    cy.get('#div_sortLock')
      .should('have.class', "icon-lock-1 list_lock_on")
      .should('have.attr', 'title', "Release sort as 'size' on sample T8045-BC081-Diag")
    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "0") // first child should be clone 0

    // Remove lock
    cy.get('#div_sortLock').click()
      .should('have.class', "icon-lock-open list_lock_off")
      .should('have.attr', 'title', "Freeze list as '-' on sample T8045-BC082-fu1")

    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "0") // first child should still be clone 0 (as no change in order at this moment)

    cy.changeSortList("size")
    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "7") // change order, new first child is clone 7 (other)
    cy.get('#div_sortLock') //lock in good state after change of sort method (locked)
      .should('have.class', "icon-lock-1 list_lock_on")
      .should('have.attr', 'title', "Release sort as 'size' on sample T8045-BC082-fu1")

    cy.get('#time0').click() // change timepoint

    cy.get('#list_clones').children()
      .should('have.length', 8)
      .should('have.attr', 'id', "7") // No lock, should reorder
  })


  it('11-Tag clone',  function() {
    cy.openAnalysis("doc/analysis-example2.vidjil")


    cy.getCloneInList(0).scrollIntoView().should('have.css', 'color', 'rgb(101, 123, 131)')

    cy.get('.tagSelector').should("not.be.visible")
    cy.get('#tag_icon_0').click()

    cy.get('.tagName0').click()
    cy.get('.tagSelector').should("not.be.visible")
    cy.getCloneInList(1).click() // click outside to not hover clonotype 0
    cy.update_icon()
    cy.getCloneInList(0).scrollIntoView().should('have.css', 'color', 'rgb(220, 50, 47)')

    // Tag multiple
    cy.selectCloneMulti([4, 5, 6])
    cy.get("#tag_icon__multiple").click()
    cy.get('.tagName6').click()
    cy.selectClone(0)
    cy.getCloneInList(4).scrollIntoView().should('have.css', 'color', 'rgb(211, 54, 130)')
    cy.getCloneInList(5).scrollIntoView().should('have.css', 'color', 'rgb(211, 54, 130)')
    cy.getCloneInList(6).scrollIntoView().should('have.css', 'color', 'rgb(211, 54, 130)')
    return
  })


  it('12-smaller clonotype in list',  function() {
    cy.openAnalysis("/doc/analysis-example.vidjil")

    // Correct text and number
    cy.getCloneInList(100).should("have.text", "TRB smaller clonotypes").should('be.visible')
    cy.getCloneInList(101).should("have.text", "TRD smaller clonotypes").should('be.visible')
    cy.getCloneInList(99 ).should("have.text", "TRA smaller clonotypes").should('be.visible')
    cy.getCloneInList(102).should("have.text", "IGH smaller clonotypes").should('be.visible')
    cy.getCloneInList(103).should("have.text", "ERG smaller clonotypes").should('not.be.visible') // not present in sample 1

    // Correct order in list
    cy.get('#list_clones')
      .children().should('have.attr', 'id', "100") // first child should be clone 0
    // cy.get('#list_clones')
    //   .children().should('have.attr', 'id', "101") // second child should be clone 0
  })

  it('13-xxx',  function() {
    cy.openAnalysis("/doc/analysis-example.vidjil")

    var clone_list = ["1", "32", "24", "68"]
    // # clone with seg & sequence (1)
    cy.getCloneInScatterplot(clone_list[0]).click()
    cy.update_icon()
    cy.get('#seq'+clone_list[0]).should("be.visible")// Clone %s (seg+/seq+) is in segmenter" % clone_list[0]
    
    // # clone with seg & not sequence (32)
    cy.getCloneInScatterplot(clone_list[1]).click()
    cy.update_icon()
    cy.get('#seq'+clone_list[1]).should("not.exist")// Clone %s (seg+/seq-) is NOT in segmenter" % clone_list[1]

    // # clone without seg & sequence (24)
    cy.getCloneInScatterplot(clone_list[2]).click()
    cy.update_icon()
    cy.get('#seq'+clone_list[2]).should("not.exist")// Clone %s (seg-/seq-) is NOT in segmenter" % clone_list[2]

    // # clone without seg & sequence (68)
    cy.getCloneInScatterplot(clone_list[3]).click()
    cy.update_icon()
    cy.get('#seq'+clone_list[3]).should("be.visible")// Clone %s (seg-/seq+) is in segmenter" % clone_list[3]
  })

})
