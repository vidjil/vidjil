/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test sandbox', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })
    after(function () {
        cy.clearCookies()
    })


    it('01-list_clones',  function() {

        cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis")
        cy.update_icon()
        cy.get('#time0').click()

        cy.get('#cluster1')
            .should("exist")
            .should('not.be.visible');


        // it('02-cluster_show',  function() {

        cy.openClusterClone('1')

        cy.get('#cluster1')
          .should('be.visible');


        // it('03-cluster_hide',  function() {

        cy.closeClusterClone('1')

        cy.get('#cluster1')
          .should('not.be.visible');


        // it('04-cluster_show_all',  function() {
        cy.getCloneInList(1).click()
        cy.get('#list_split_all > .icon-plus').click()

        cy.getCloneInSegmenter(1).should("be.visible")
        cy.getCloneInSegmenter(2).should("be.visible")


        // it('05-cluster_hide_all',  function() {
        cy.get('#list_unsplit_all > .icon-minus')
            .click()
        cy.update_icon()

        cy.getCloneInSegmenter(2).should("not.be.visible") 


        // it('06-switch_onlyOneSample',  function() {
        cy.get('#polyline4').should('have.class','graph_line');

        cy.get('#filter_switch_sample').click({force: true})
        // switch the filter ON, current sample include cloneId
        cy.getCloneInList(4).should("be.visible")

        cy.get('#polyline4').should('have.class','graph_line');

        cy.getCloneInList(0).click() // close filter menu
        cy.get('#time1').click()
        cy.get('#polyline4').should('have.class','graph_inactive');


        // change current sample, will not include cloneId

        // control if name get the '*' if focus on it
        cy.get('#time0').should("have.text", "2019-12-17")
        cy.get('#time1').should("have.text", "+10 *")

        cy.get('#time0').click()
        cy.get('#time0').should("have.text", "2019-12-17 *")
        cy.get('#time1').should("have.text", "+10")

        // switch the filter OFF
        cy.get('#filter_switch_sample').click({force: true})
        cy.selectClone('0').click() // close filter menu
        cy.get('#time0').should("have.text", "2019-12-17")
        cy.get('#time1').should("have.text", "+10")

        cy.get('#polyline4').should('have.class','graph_line');

        
        // it('07-cluster_not_ordered',  function() {

        cy.get('#cluster5')
            .should("exist")
            .should('not.be.visible');

        cy.getCloneInList(5).should('be.visible');
        cy.getCloneInList(6).should('not.be.visible');


        cy.getCloneInList(5).click()

        // assert ( not $b.clone_in_segmenter('6').present? ), 
        // ">> The second clone of the cluster is NOT present in segmenter"
        cy.get('#seq6 > .sequence-holder > .seq-fixed > .nameBox')
            .should("not.exist") 

        cy.get('#list_split_all > .icon-plus').click()
        cy.getCloneInSegmenter(5) .should("be.visible")
        cy.getCloneInSegmenter(6) .should("be.visible")
        

        //   # Add test on order of clones in list
        cy.get('#cluster5')
          .children().should('have.length', 2)
          .then($li => {
                assert.equal($li[0].id, "_6", ">> first clone in cluster is the 6th")
                assert.equal($li[1].id, "_5", ">> second clone in cluster is the 5th")
            })
    })


})
