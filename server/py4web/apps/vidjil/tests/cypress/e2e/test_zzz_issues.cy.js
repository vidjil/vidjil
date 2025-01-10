/// <reference types="cypress" />
// Should we keep these tests ? Should we always run them ?
describe("Test specific bugs", function () {
  it("2577_jstree_avoid_folder_selection", function () {
    // Test behavior of jstree for file or folder
    var filename1 = "/";
    var filename2 = "Demo-X5.fa";

    cy.createPatient("", "f", "l", "", "i");

    // Open adding sample page
    cy.get("#add_sample_button").should("contain", " + add samples").click();
    cy.wait("@getActivities");

    cy.get("#upload_sample_form > :nth-child(1)")
      .should("contain", "Add samples")
      .click();
    cy.wait("@getActivities");

    cy.get("#jstree_field_1_0").click();
    cy.get(".jstree-anchor").contains(filename1).click({ force: true });
    cy.get("#jstree_button").should("have.class", "disabledClass");

    // Open the root folder
    cy.get(".jstree-ocl").click();

    // Control that file selection able submit button
    cy.get(".jstree-anchor").contains(filename2).click({ force: true });

    cy.get("#jstree_button").should("not.have.class", "disabledClass");

    ///////////////////////////
    // Control search action

    // init state
    cy.get(".jstree-anchor")
      .contains(filename2)
      .should("not.have.class", "jstree-search");

    // put a search value
    cy.get("#jstree_search_input").type("demo");

    cy.get("#jstree_search_form > button").click();

    // Now it is highlighted by search action
    cy.get(".jstree-anchor")
      .contains(filename2)
      .should("have.class", "jstree-search");
  });

  it("5178 - bad render when request error occurred", function () {
    // Before fixing, request return error has HTML and are badly interpreted and break DOM page
    cy.goToPatientPage();
    cy.get("#result_sample_set_13_config_1").click();
    cy.get(".popup_msg").should(
      "contain",
      "An error occurred (Internal Server Error; code 500)"
    );
  });

  it("5070 + 5213 + 5069", function () {
    // Create an analysis, tag some clones, save it on the server, and reopen it. Check if tag is present

    if (
      Cypress.browser.name === "firefox" &&
      Cypress.browser.version.split(".")[0] == "78"
    ) {
      // Skip old version of firefox (~62) that don't work on cypress for this test
      this.skip;
    }

    const config_id = "2";

    cy.createPatient("", "fn", "ln", "", "c", "public").as("sample_set_id")
    cy.addSample(
      undefined,
      "nfs",
      "Demo-X5.fa",
      undefined,
      "2021-01-01",
      "c"
    ).then((sample_id) => {
      // Launch process and wait for result
      cy.launchProcess(config_id, sample_id);
      cy.waitAnalysisCompleted(config_id, sample_id);
      cy.get("@sample_set_id").then((sample_set_id) => {
        cy.openAnalysisFromSetPage(sample_set_id, config_id)
        
        // 5070 - get_reads
        cy.openCloneInfo(1);
        cy.get(":nth-child(2) > .icon-down").click();

        const downloadsFolder = Cypress.config("downloadsFolder");
        cy.log(Cypress.config("downloadsFolder"));
        const downloadedFilename =
          downloadsFolder + "/reads_1__file_id_" + sample_id + ".fa";
        cy.log(downloadedFilename);

        // TODO; fix this part to check file content
        // Don't work on gitlab, but work locally...
        //cy.readFile(downloadedFilename, { timeout: 20000 })
        //  .should('contain', '>IGKV3-7*04 1/GTGGA/11 KDE')
  
        // 5213 - open analysis without bug
        // Tag clone and save analysis
        cy.selectCloneMulti([4, 5, 6]);
        cy.get("#tag_icon__multiple").click();
        cy.get(".tagName_custom_2").click();
        cy.clone_rename("4", "un clone");
        cy.save_analysis();
  
        // Re-open analysis
        cy.goToPatientPage()
        cy.openSet(sample_set_id)
        cy.openAnalysisFromSetPage(sample_set_id, config_id)

        // Check renaming of clone
        cy.get('#listElem_4 > .nameBox')
          .should("contain", "un clone")
        // check that clone have a tag color
        cy.selectClone(1) // Made a selection between load of analysis and assertion control

        // Commented because it fail on some browser version. Seem to be independent of this issue as other clonotype are well colored
        //cy.getCloneInList(4).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)', {timeout: 12000})

        cy.getCloneInList(5).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)')
        cy.getCloneInList(6).scrollIntoView().should('have.css', 'color', 'rgb(55, 145, 73)')

        // 5069_download_link_of_result
        // Test Link
        cy.goToPatientPage()
        cy.openSet(sample_set_id)
        let config_regexp = new RegExp("config=" + config_id)
        let sample_set_regexp = new RegExp("sample_set_id=" + sample_set_id)
        cy.get('.db_fixed_footer > tr > :nth-child(13) > a')
          .should("have.attr", "href")
          .and("match", /get_data\?/)
          .and("match", config_regexp)
          .and("match", sample_set_regexp)

        cy.get('.db_fixed_footer > tr > :nth-child(14) > a')
          .should("have.attr", "href")
          .and("match", /get_analysis\?/)
          .and("match", config_regexp)
          .and("match", sample_set_regexp)
      })
    })
  });

  it("5388 - Precise patient search", function () {
    cy.goToPatientPage();
    cy.get("#db_filter_input")
      .type("first_name Last_name_test 2000-01-02")
      .type("{enter}");
    cy.wait(["@postAllSampleSets", "@getActivities"]);

    // patient don't exist for the moment, no empty db table, no tbody present
    cy.get("#db_table_container").find("tbody").should("not.exist");

    cy.createPatient(
      "",
      "first_name",
      "Last_name_test",
      "2000-01-02",
      "C",
      "public"
    );

    // patient now exists, so a line in table is present, so tbody exist
    cy.goToPatientPage();
    cy.get("#db_filter_input")
      .type("first_name Last_name_test 2000-01-02")
      .type("{enter}");
    cy.wait(["@postAllSampleSets", "@getActivities"]);
    cy.get("#db_table_container").find("tbody").should("exist");

    // Bad birth date, so should be empty
    cy.goToPatientPage();
    cy.get("#db_filter_input")
      .type("first_name Last_name_test 2001-01-01")
      .type("{enter}");
    cy.wait(["@postAllSampleSets", "@getActivities"]);
    cy.get("#db_table_container").find("tbody").should("not.exist");
  });
});
