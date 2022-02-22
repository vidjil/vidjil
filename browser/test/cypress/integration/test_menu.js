/// <reference types="cypress" />

var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/index.html"
console.log( url )




function get_names(pos, type){
    // names in various format
    if (pos == "0"){
        if (type == "name") {return 'T8045-BC081-Diag'}
        else if (type == "short_name" || type == "local_storage") {return 'T8045-BC'}
        else if (type == "sampling_date") { return '2019-12-17' }
        else if (type == "delta_date") { return '2019-12-17' }
    } else if (pos == "1"){
        if (type == "name") { return 'T8045-BC082-fu1' }
        else if (type == "short_name" || type == "local_storage") { return 'T8045-BC' }
        else if (type == "sampling_date") { return '2019-12-27' }
        else if (type == "delta_date") { return '+10' }
    }
}


function test_name_values(type_name){
    cy.get('#visu2_menu').click()
    // By default, 2 samples are present in timeline graph
    cy.log("Test for: " + type_name)
    // In graph label
    cy.get('#time0').should("have.text", get_names("0", type_name), "incorrect name show for first sample (graph label)")
    cy.get('#time1').should("have.text", get_names("1", type_name), "incorrect name show for second sample (graph label)")
    // In graph list
    cy.get('#visu2_listElem_text_0').should("have.text", get_names("0", type_name), "incorrect name show for first sample (graphList text)")
    cy.get('#visu2_listElem_text_1').should("have.text", get_names("1", type_name), "incorrect name show for second sample (graphList text)")
}


// This script allow to make some action in a sandbox to quicly change made on the client when you code
describe('Test sandbox', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })


  it('00-normalization_none',  function() {
    // test_00_normalization_none
    cy.openAnalysis("/doc/analysis-example.vidjil")
    
    cy.open_menu_settings()

    cy.get('#normalize_list').should("be.visible") // "After clicking normalize_list form should be visible"
    cy.get('#reset_norm').should("be.visible")     // "Form have the input for reset normalization"
  
    // test_01_normalization_expected
    cy.getCloneSize("25").should("have.text", '0.129%') // Span show correct size before normalization"
    cy.get('#tag_icon_25').click()

    cy.get('#norm_button').type('0.1{enter}')
    cy.getCloneSize("25").should("have.text", '10.00%') //Span show correct normalized size

    cy.open_menu_settings()
    cy.get('#normalize_list').should("be.visible") // "After clicking normalize_list form should be visible"
    cy.get('#reset_norm').should("be.visible") 

    cy.get('#reset_norm').click()
    cy.pressKey("escape")
    cy.close_menu()
    cy.getCloneSize("25").should("have.text", '0.129%') // Span show correct size after reset normalization


    // test_02_normalization_external
    cy.getCloneSize("1").should("have.text", '0.081%') // Span show correct size after reset normalization
    cy.open_menu_settings()
        
    cy.get('#normalize_list').should("be.visible") // After clicking normalize_list form should be visible
    cy.get('#normalize_external').should("be.visible")// Form have the input for external normalization
    cy.get('#normalizetest25').should("be.visible")// Form still have the input for expected normalization
        
    cy.get('#normalize_external').click()
    cy.getCloneSize("1").should("have.text", '0.122%') // Span should show correct normalized size (external) (" + $b.clone_info('1')[:size].text+")"

  })




  it('01-sample_name',  function() {
    cy.openAnalysis("/doc/analysis-example2.vidjil")

    // def test_01_names_sample
    var type_name = "sampling_date"
    cy.change_name_key(type_name)
    test_name_values(type_name)

    // def test_02_names_short
    type_name = "short_name"
    cy.change_name_key(type_name)
    test_name_values(type_name)

    // def test_03_names
    type_name = "name"
    cy.change_name_key(type_name)
    test_name_values(type_name)

    // def test_04_delta_date
    type_name = "delta_date"
    cy.change_name_key(type_name)
    test_name_values(type_name)

  })

})
