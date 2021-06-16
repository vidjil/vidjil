/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )


describe('Actions v1', function () {
    beforeEach(function () {
        cy.fixture('l3.json').then(function (l3data) {
            this.l3data = l3data
        })
        var b = Cypress.browser
        this.basename = b.name + "_" + b.majorVersion + "_" 

        cy.visit(url)
        cy.close_disclamer()
        cy.close_tips()
    })



 it('Open a simple vidjil file',  function() {

    cy.set_browser("doc/analysis-example2.vidjil")
    cy.get('#list_clones').children().should('have.length', 8)
    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.408%")

    return
  })



 it('Open a vidjil file + analysis',  function() {

    // cy.visit(url)
    cy.set_browser("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")
    // cy.get('#list_clones').children().should('have.length', 6)

    cy.get('#listElem_5 > .nameBox').should('have.text', "clone_cluster1")

    // second sample open with analysis, so size is smaller
    cy.get('#listElem_5 > .axisBox > .sizeBox').should('have.text', "0.014%")

    cy.get('#listElem_6 > .nameBox').should('not.visible');
    return
  })





 it('test_00_list_clones',  function() {
    cy.set_browser("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")
  //   # change current sample to start on sample 0 (second in loaded order)
  cy.update_icon()

  //   # declare variables
  var lock      = cy.get('#div_sortLock')
  var listClone = cy.get('#list_clones')

  //   # tester la presence du lock
  cy.get('#div_sortLock')
    .should('have.class', "icon-lock-1 list_lock_on")
    .and('have.attr', 'title')
    .and('include', "Release sort as '-' on sample diag")

  cy.get('#list_clones').children().eq(0)
    .should("contain", "Main ALL clone")
  cy.get('#list_clones').children().eq(1)
    .should("contain", "TRG smaller clone")

  // //   # change order by 'size'
  cy.get('#list_sort_select')
    .select('size')
    .should('have.value', 'size')
  cy.get('#list_sort_select')
    .should('not.have.value', '-')

  cy.update_icon()
  cy.waitForUpdates()

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
 })





  // def test_02_xxx
  //   # Lock off
  //   $lock.click
  //   assert ( $lock.attribute_value("class") == "icon-lock-open list_lock_off"), "lock in good state after click (unlocked)"
  //   # print "\n"+$lock.attribute_value("title")+"\n"
  //   assert ( $lock.attribute_value("title") == "Freeze list as '-' on sample fu1"), "lock title show correct effet if click in icon (freeze, size, fu1)"
  //   # Clone order should NOT have changed (as sort is now '-')
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"

  //   # change order by 'size'
  //   $b.select(:id => 'list_sort_select').click
  //   $b.send_keys :arrow_down
  //   $b.send_keys :enter
  //   $b.update_icon.wait_while(&:present?)
  //   # Clone order should have changed (sort 'size')
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_7" ), "opening; correct id of the first element (clone other)"
    
  //   $lock.click # remove lock
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_7" ), "opening; correct id of the first element (clone other)"
  //   $b.div(:id => "left-container").click # get out of the select list
  // end


  // def test_03_xxx
    
  //   # Change sample (-> diag)
  //   $b.send_keys :arrow_right
  //   $b.update_icon.wait_while(&:present?)
  //   # clone order
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
  //   assert ( $lock.attribute_value("title") == "Freeze list as 'size' on sample diag"), "lock title show correct effet if click in icon (freeze, size, diag)"
    
  // end


  // def test_04_xxx
  //   # Lock again
  //   $lock.click
  //   $b.update_icon.wait_while(&:present?)
  //   assert ( $lock.attribute_value("class") == "icon-lock-1 list_lock_on"), "lock in good state after second click (locked)"
  //   assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title showing 'release ...'size' ... diag'"
  //   # Change sample (-> fu1)
  //   $b.send_keys :arrow_right
  //   $b.update_icon.wait_while(&:present?)
  //   assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title showing 'release ...'size' ... diag'"

  //   # Clone order should be as in case 1
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  // end

  // def test_05_xxx
  //   # Change sort method (size => V/5')
  //   $b.select(:id => 'list_sort_select').click
  //   $b.send_keys :arrow_down
  //   $b.send_keys :arrow_down
  //   $b.send_keys :enter
  //   $b.update_icon.wait_while(&:present?)

  //   # Lock should be open
  //   assert ( $lock.attribute_value("class") == "icon-lock-1 list_lock_on"), "lock in good state after change of sort method (locked)"
  //   assert ( $lock.attribute_value("title") == "Release sort as 'V/5'' on sample fu1"), "lock title showing 'release ...'V/5'' ... diag'"
    
  //   # clone list should be cha
  //   l0 = $listClone.div(index: 0)
  //   assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  // end



})
