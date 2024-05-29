

Cypress.Commands.add('waitForUpdates', () => { 
  cy.wait(1000)
})



Cypress.Commands.add("text", { prevSubject: true }, (subject, options) => {
  return subject.text();
});

Cypress.Commands.add("getTableLength", (datatable) => {
  return cy.get(datatable).find('tbody').find('tr').then(elm => elm.length)
});


Cypress.Commands.add("getFormLineLength", () => {
  return cy.get("#fieldset_container > .form_line").then(elm => elm.length)
});


Cypress.Commands.add("getExternalData", (id) => {
    return cy.get("#data_"+id)
});




Cypress.Commands.add("test_name_values", (type_name) => {
    cy.get('#visu2_menu').click()
    // By default, 2 samples are present in timeline graph
    cy.log("Test for: " + type_name)
    // In graph label
    cy.get('#time0', { timeout: 10000 }).should("have.text", get_names("0", type_name), "incorrect name show for first sample (graph label)")
    cy.get('#time1', { timeout: 10000 }).should("have.text", get_names("1", type_name), "incorrect name show for second sample (graph label)")
    // In graph list
    cy.get('#visu2_listElem_text_0', { timeout: 10000 }).should("have.text", get_names("0", type_name), "incorrect name show for first sample (graphList text)")
    cy.get('#visu2_listElem_text_1', { timeout: 10000 }).should("have.text", get_names("1", type_name), "incorrect name show for second sample (graphList text)")
});



/// Functions use in test menu
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