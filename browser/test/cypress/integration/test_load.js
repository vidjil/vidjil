/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )

// those tests are opening different .vidjil files with or without .analysis and check the expected data have been loaded
describe('Load', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

    it('loading-vidjil-file-noclones',  function() {
      cy.openAnalysis("demo/Demo-X5-no-clone.vidjil")

      //check number of segmented reads
      cy.get('#info_segmented').contains("14 (100.00%)")

      //check number of clones (0)
      cy.get('#list_clones').children().should('have.length', 0)

      cy.wait(1000)
    })

    it('loading-vidjil-file-single-sample',  function() {
      cy.openAnalysis("doc/analysis-example1.vidjil")

      //check number of segmented reads
      cy.get('#info_segmented').contains("335 662 (76.78%)")

      //check number of clones (2)
      cy.get('#list_clones').children().should('have.length', 2)

      // single sample -> both visu should be scatterplot
      cy.get("#visu2").should('have.class', 'scatterplot')
      cy.get("#visu").should('have.class', 'scatterplot')

      //check default axis are loaded
      cy.get('#visu2_axis_container').children().contains("Reads length")
      cy.get('#visu2_axis_container').children().next().contains("Size")

      cy.get('#visu_axis_container').children().contains("V/5' gene")
      cy.get('#visu_axis_container').children().next().contains("J/3' gene")

      cy.wait(10000)

    })

    it('loading-vidjil-file-multi-samples+analysis',  function() {
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

    it('loading-vidjil_analysis_order_1',  function() {
      // load_first_config_without_analysis; 3 samples; analysis based on these files
      cy.openAnalysis("/data/issues/4407_config_1.vidjil")

      // Test line in graph, only show if analysis loading end without error
      cy.get("#polyline4")
        .invoke('attr', 'd')
        .then((value) => {
          assert(value.split(",").length == 22, "clone is present in the graph of first sample")
        })

      // load_first_config; 3 samples; analysis based on these files
      cy.openAnalysis("/data/issues/4407_config_1.vidjil", "/data/issues/4407_.analysis")
      // Test line in graph, only show if analysis loading end without error
      cy.get("#polyline4")
        .invoke('attr', 'd')
        .then((value) => {
          assert(value.split(",").length == 22, "clone is present in the graph of first sample")
        })

      // load_second_config, not present in loaded analysis
      cy.openAnalysis("/data/issues/4407_config_2.vidjil", "/data/issues/4407_.analysis")
      // Test line in graph, only show if analysis loading end without error
      cy.get("#polyline4")
        .invoke('attr', 'd')
        .then((value) => {
          // Only 2 samples
          assert(value.split(",").length == 17, "clone is present in the graph of first sample")
        })
    })


  it('loading-vidjil_analysis_order_hidden_sample',  function() {
      // Issue 4541; Vidijl file with 3 samples, only 6 clones keeped

      // load_analysis_simple_reorder
      cy.openAnalysis("/data/issues/issues_4541/4541.vidjil", "/data/issues/issues_4541/4541_00_stock.analysis")
      cy.get('#visu2_title').should("have.text", "2 / 3" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("not.exist")
      cy.get('#time2').should("exist")
        .should("have.text", 'file2_name')

      // Samples here haven't stock_order field (old one)
      // load_analysis_hidden_sample
      cy.openAnalysis("/data/issues/issues_4541/4541.vidjil", "/data/issues/issues_4541/4541_01.analysis")
      cy.get('#visu2_title').should("have.text", "2 / 3" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("not.exist")
      cy.get('#time2').should("exist")
        .should("have.text", 'file2_name')

      // load_analysis_one_more_sample
      cy.openAnalysis("/data/issues/issues_4541/4541_02.vidjil", "/data/issues/issues_4541/4541_01.analysis")
      cy.get('#visu2_title').should("have.text", "3 / 4" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("not.exist")
      cy.get('#time2').should("exist")
        .should("have.text", 'file2_name')
      cy.get('#time3').should("exist")
        .should("have.text", 'file3_name')

      // load_analysis_deleted_sample
      cy.openAnalysis("/data/issues/issues_4541/4541_03_deleted_sample.vidjil", "/data/issues/issues_4541/4541_00_stock.analysis")
      cy.get('#visu2_title').should("have.text", "1 / 2" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("not.exist")

      // load_analysis_all_new_samples
      cy.openAnalysis("/data/issues/issues_4541/4541.vidjil", "/data/issues/issues_4541/4541_04_all_new_samples.analysis")
      cy.get('#visu2_title').should("have.text", "3 / 3" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("exist")
        .should("have.text", 'file1_name')
      cy.get('#time2').should("exist")
        .should("have.text", 'file2_name')

      // load_analysis_duplicate_in_order
      cy.openAnalysis("/data/issues/issues_4541/4541.vidjil", "/data/issues/issues_4541/4541_05_duplicate_in_order.analysis")
      cy.get('#visu2_title').should("have.text", "2 / 3" )// Ratio show is correct at init
      cy.get('#time0').should("exist")
        .should("have.text", 'file0_name')
      cy.get('#time1').should("not.exist")
      cy.get('#time2').should("exist")
        .should("have.text", 'file2_name')

      // load_analysis_duplicate_in_order
      cy.openAnalysis("/data/issues/issues_4541/4541_06.fused", "/data/issues/issues_4541/4541_06.analysis")
      cy.get('#visu2_title').should("have.text", "4 / 5" )// Ratio show is correct at init
      cy.get('#time4').should("exist")
        .should("have.text", 'Rechute')
      cy.get('#time1').should("exist")
        .should("have.text", 'Fu-1')
      cy.get('#time2').should("not.exist")
      cy.get('#time0').should("exist")
        .should("have.text", 'file_diag_1')
      cy.get('#time3').should("exist")
        .should("have.text", 'file_fu_3')
  })


  it('loading-vidjil_empty_distributions',  function() {
    // load_data_without_mrd
    cy.openAnalysis("/tools/tests/data/fused_multiple.vidjil")
    cy.get('#listElem_1 > #clone_infoBox_1 > .icon-info').click()

    cy.get("#modal_line_mrd_family").should("not.exist") //modal line mrd_family NOT exist for clone without mrd
    cy.get("#modal_line_mrd_pearson").should("not.exist") //modal line mrd_pearson NOT exist for clone without mrd
    cy.get("#modal_line_mrd_prevalent").should("not.exist") //modal line mrd_prevalent NOT exist for clone without mrd
    cy.get("#modal_line_mrd_prevalent_on_spike").should("not.exist") //modal line mrd_prevalent_on_spike NOT exist for clone without mrd
    cy.get('.info-container > .closeButton > .icon-cancel').click()

    // load_data_with_mrd
    cy.openAnalysis("/data/issues/issue_mrd.vidjil")
    cy.get('#listElem_1 > #clone_infoBox_1 > .icon-info').click()

    cy.get("#modal_line_mrd_family").should("exist") //modal line mrd_family exist for clone with mrd
    cy.get("#modal_line_mrd_pearson").should("exist") //modal line mrd_pearson exist for clone with mrd
    cy.get("#modal_line_mrd_prevalent").should("exist") //modal line mrd_prevalent exist for clone with mrd
    cy.get("#modal_line_mrd_prevalent_on_spike").should("exist") //modal line mrd_prevalent_on_spike exist for clone with mrd

    // Test text values
    cy.get("#modal_line_value_mrd_family_0").should("have.text", "UNI") //modal line mrd_family content is correct
    cy.get("#modal_line_value_mrd_pearson_0").should("have.text", "0.96") //modal line mrd_pearson content is correct
    cy.get("#modal_line_value_mrd_prevalent_0").should("have.text", "KIGK") //modal line mrd_prevalent content is correct (K locus + IGK)
    cy.get("#modal_line_value_mrd_prevalent_on_spike_0").should("have.text", "64.89233726998077") //modal line mrd_prevalent_on_spike content is correct
    cy.get('.info-container > .closeButton > .icon-cancel').click()

    cy.get('#listElem_0 > #clone_infoBox_0 > .icon-info').click()
    cy.get("#modal_line_mrd_family").should("not.exist") //modal line mrd_family NOT exist for clone without mrd
    cy.get("#modal_line_mrd_pearson").should("not.exist") //modal line mrd_pearson NOT exist for clone without mrd
    cy.get("#modal_line_mrd_prevalent").should("not.exist") //modal line mrd_prevalent NOT exist for clone without mrd
    cy.get("#modal_line_mrd_prevalent_on_spike").should("not.exist") //modal line mrd_prevalent_on_spike NOT exist for clone without mrd
    cy.get('.info-container > .closeButton > .icon-cancel').click()
  })


  it('loading-vidjil_empty_distributions',  function() {
    cy.openAnalysis("/data/issues/4632.vidjil")
    // ### Issue 4632; issue with empty distributions field (case in mixcr)
    cy.getCloneInList('0').should("exist")
  })

   it('close previous opened modal at reset',  function() {
      cy.openAnalysis("doc/analysis-example1.vidjil")

      // Open some modal panels
      cy.get('#listElem_0 > #clone_infoBox_0 > .icon-info').click()
      cy.get('.info-container > .closeButton > .icon-cancel')
        .should('be.visible')
      cy.get('#tag_icon_0').click()
      cy.get('.tagSelector > .closeButton > .icon-cancel')
        .should('be.visible')

      // Reload analysis and control that popup are closed
      cy.openAnalysis("doc/analysis-example1.vidjil")
      cy.get('.info-container > .closeButton > .icon-cancel')
        .should('not.be.visible')
      cy.get('.tagSelector > .closeButton > .icon-cancel')
        .should('not.be.visible')

    })
})
