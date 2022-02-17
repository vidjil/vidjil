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


    it('00-loading-analysis',  function() {
        cy.openAnalysis("doc/analysis-example2.vidjil", "doc/analysis-example2.analysis", 10000)
        cy.get('body').trigger('keyright');

        // def test_001_name
        // # change current sample to start on sample 0 (second in loaded order)
        cy.get('#time0').click()
        cy.get('#time0').should("have.text", "2019-12-17")
        cy.get('#time1').should("have.text", "+10")

        cy.get('#time0').should("have.class", "graph_time2")


        //   def test_002_order
        cy.get('#time0').should('have.attr', "x")
          .then( (X0) => {
            cy.get('#time1').should('have.attr', "x")
            .then( (X1) => {
              assert.isTrue(X0 > X1)
            })
          })


        //   def test_01_data_loaded
        cy.getExternalData('qPCR').get(".data_name").first()
          .should("have.text",  "qPCR")
        cy.getExternalData('qPCR').get(".data_value").first()
          .should("have.text",  "0.830")

        cy.getExternalData("spikeZ > .data_name").first()
          .should("have.text",  "spikeZ")
        cy.getExternalData("spikeZ > .data_value").first()
          .should("have.text",  "0.0100")


        //   def test_05_check_cluster
        cy.getClusterInList('1')
        cy.getCloneInList('1').should("have.text", "clone2")
        cy.getCloneInScatterplot('1').should("be.visible")
        cy.getCloneInScatterplot('2').should("not.be.visible")

        cy.get('#clusterBox_1 > .icon-plus').click()
        cy.getCloneInScatterplot('1').should("be.visible")
        cy.getCloneInScatterplot('2').should("be.visible")

        cy.get('#cluster1')
        .children().should('have.length', 2)
          // .then($li => {
          //       cy.log( $li[0].id )
          //       cy.get("#"+$li[0].id).first().should("have.text", "clone2")
          //       // assert.equal($li[1].text, "clone3")
          //   })

        //   def test_06_remove_cluster
        cy.get('#delBox_list_2 > .icon-cancel').click()


        cy.getCloneInList(3).should("be.visible")
        cy.getClusterInList(1).should("not.be.visible")


        cy.getCloneInScatterplot('1').should("be.visible")
        cy.getCloneInScatterplot('2').should("be.visible")
        

        cy.getCloneInList(2).should("contain", "clone3")
        cy.getCloneInList(2).parent().should("contain", "G")


        //   def test_07_create_cluster
        cy.selectClone('1')
        cy.selectClone('2', true)
        cy.get('#cluster').click()
        cy.getCloneInList(1).should("contain", "clone2")
        cy.getCloneInScatterplot(1).should("be.visible")


        //   def test_08_select_cluster

        cy.selectClone('1')
        cy.getCloneInScatterplot('1').should("have.class", "circle_select")

        cy.getCloneInScatterplot('1').should('have.class','circle_select');
        cy.get('#polyline1').should('have.class','graph_select');

        cy.getCloneInScatterplot('2').should('not.have.class','circle_select');
        cy.get('#polyline2').should('not.have.class','graph_select');

        cy.openClusterClone("1")
        cy.getCloneInScatterplot('1').should('have.class','circle_select');
        cy.get('#polyline2').should('have.class','graph_select');
        cy.getCloneInSegmenter("2").should("be.visible")

        cy.closeClusterClone("1")


        //   def test_09_select_other
        cy.get('#time1').click()
        cy.get('#time1').should("have.class", "graph_time2")
        cy.get('#time0').should("have.class", "graph_time")

        cy.getExternalData('qPCR').get(".data_name").first()
        .should("have.text",  "qPCR")
        cy.getExternalData('qPCR').get(".data_value").first()
        .should("have.text",  "0.0240")


        // def test_10_clone_segedited_from_analysis
        cy.getCloneInScatterplot("3").click()

        // If cdr3 checked, the sequence will be split in mutiple dom element with highlight or not
        cy.get("#align-segment-info")
        cy.get('#aligner_checkbox_CDR3')
        cy.getCloneInSegmenter("3").should("contain", "GGGGGCCCCCGGGGGCCCCCGGGGGCCCCCGGGGGCCCCCAAAAATTTTTAAAAATTTTTAAAAATTTTT")

    })
})
