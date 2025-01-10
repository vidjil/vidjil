/// <reference types="cypress" />

describe("Manipulate patient, sample and launch analysis", function () {
  it("01-Open db; access to various page of the bd", function () {
    cy.isDbPageVisible().should("equal", true);

    // Try to access to all page of the db (except patient/run/set)
    // Each call to function goTo use a should test to make automatic verification
    cy.goToUsagePage();
    cy.goToProcessPage();
    cy.goToNewsPage();
    cy.goToPreprocessPage();
    cy.goToConfigsPage();
    cy.goToGroupsPage();
    cy.goToUsersPage();
    cy.goToAdminPage();
  });

  it("02-Launch, open, delete analysis and check logs", function () {
    cy.createPatient("", "fn", "ln", "", "c", "public").as(
      "patient_id"
    );

    var preprocess = undefined;
    var filename1 = "Demo-X5.fa";
    var filename2 = undefined;
    var sampling_date = "2021-01-01";
    var sample_information = "c #cy";
    cy.addSample(
      preprocess,
      "nfs",
      filename1,
      filename2,
      sampling_date,
      sample_information
    ).then((sample_id) => {
      cy.log("added sample " + sample_id);

      // Launch process and wait for result
      cy.launchProcess("2", sample_id);
      cy.waitAnalysisCompleted("2", sample_id);

      // Open result
      cy.openSampleResult(sample_id);
      // Check number of clones found
      cy.get("#list_clones").children().should("have.length", 26);

      // Delete process
      cy.get("@patient_id").then((patient_id) => {
        cy.openDBPage();
        cy.openSet(patient_id);
        cy.deleteProcess("2", sample_id);
      });

      // Check logs
      cy.goToLogsPage()
      // Log are tested in reverse order as last is shown first
      cy.get('#db_table_container')
      .should("contain", "process deleted")
      cy.get('#db_table_container')
        .should("contain", "run requested with config multi+inc+xxx")
      cy.get('#db_table_container')
        .should("contain", "file (" + sample_id + ") //Demo-X5.fa added")
      cy.get("@patient_id").then((patient_id) => {
        cy.get('#db_table_container')
          .should("contain", "patient (" + patient_id + ") ln added")
      });
    });
  });

  it("03-Sets and samples creations, associations, deletions", function () {
    // Create, edit patients
    var id = "";
    var first_name = "fn";
    var last_name = "ln";
    var birthday = "";
    var patient_information = "cy";
    var group = "public";
    cy.createPatient(
      id,
      first_name + "1",
      last_name + "1",
      birthday,
      patient_information + "1",
      group
    ).as("patient1");
    const patient1_display_name = last_name + "1" + " " + first_name + "1";
    cy.createPatient(
      id,
      first_name + "2",
      last_name + "2",
      birthday,
      patient_information + "2",
      group
    );
    cy.createPatient(
      id,
      first_name + "3",
      last_name + "3",
      birthday,
      patient_information + "3",
      group
    ).then((uid) => {
      cy.editPatient(
        uid,
        id,
        first_name + "4",
        last_name + "4",
        birthday,
        patient_information + "4"
      );
    });

    // Filter patients
    cy.goToPatientPage();
    cy.dbPageFilter(first_name + "1");
    cy.getTableLength("#db_table_container").should("eq", 1);
    cy.dbPageFilter("patient");
    cy.getTableLength("#db_table_container").should("eq", 8);

    // Create run
    cy.createRun(id, "run", "2023-01-01", "cy", group);

    // Add samples and multi-samples with association
    var preprocess = undefined;
    var filename1 = "Demo-X5.fa";
    var filename2 = undefined;
    var sampling_date = "2024-01-01";
    var sample_information = "cy";
    cy.addSample(
      preprocess,
      "nfs",
      filename1,
      filename2,
      sampling_date,
      sample_information + "1 #cy",
      first_name + "1"
    ).as("sample_1");
    var sample_to_add_2 = [
      preprocess,
      "nfs",
      filename1,
      filename2,
      sampling_date,
      patient_information + "2",
      first_name + "2",
    ];
    var sample_to_add_3 = [
      preprocess,
      "nfs",
      filename1,
      filename2,
      sampling_date,
      patient_information + "3",
      first_name + "4",
    ];
    cy.multiSamplesAdd([sample_to_add_2, sample_to_add_3]);

    cy.get("@sample_1").then((sample_id1) => {
      // Jump
      cy.get(
        `#row_sequence_file_${sample_id1} > :nth-child(5) > .patient_token`
      )
        .should("exist")
        .click({ force: true });
      cy.wait("@getActivities");

      cy.get(".set_token").should("contain", patient1_display_name);

      // Delete association between sets
      cy.removeCommonSet(sample_id1, "patient", "run link");
    });

    // Delete set
    cy.goToPatientPage();
    cy.get("@patient1").then((patient_id1) => {
      cy.deleteSet("patient", patient_id1, patient1_display_name);
    });
  });

  it("04-Sets and samples with tags", function () {
    cy.goToPatientPage();

    // Add a patient with some with tags
    const id = "";
    const first_name = "ft";
    const last_name = "lt";
    const birthday = "";
    const patient_information = "C";
    const group = "public";
    let initialFilterNumber_return;
    cy.createPatient(
      id,
      first_name + "4",
      last_name + "4",
      birthday,
      patient_information + "4 #t1 #t2",
      group
    ).then((patient_id) => {
      // Get initial number
      cy.goToPatientPage();
      cy.get(
        `#sample_set_open_${patient_id}_config_id_-1 > :nth-child(4) > span > a`
      )
        .should("exist")
        .should("have.attr", "data-linkable-name", "#t1")
        .should("contain", "#t1")
        .first()
        .click({ force: true });
      cy.wait(["@postAllSampleSets", "@getActivities"]);
      initialFilterNumber_return = cy.getTableLength("#db_table_container");
    });

    cy.createPatient(
      id,
      first_name + "5",
      last_name + "5",
      birthday,
      patient_information + "5 #t1 #t2",
      group
    );
    cy.createPatient(
      id,
      first_name + "6",
      last_name + "6",
      birthday,
      patient_information + "6 #t1",
      group
    ).then((patient_id) => {
      initialFilterNumber_return.then((initialFilterNumber) => {
        // From inside the patient
        cy.get(".tag-link") // works only if one tag available
          .should("contain", "#t1")
          .click();
        cy.wait(["@postAllSampleSets", "@getActivities"]);
        cy.getTableLength("#db_table_container").should(
          "eq",
          initialFilterNumber + 2
        );

        // From the patients page
        cy.goToPatientPage();
        cy.get(
          `#sample_set_open_${patient_id}_config_id_-1 > :nth-child(4) > span > a`
        )
          .should("exist")
          .should("have.attr", "data-linkable-name", "#t1")
          .should("contain", "#t1")
          .click({ force: true });
        cy.wait(["@postAllSampleSets", "@getActivities"]);
        cy.getTableLength("#db_table_container").should(
          "eq",
          initialFilterNumber + 2
        );
      });
    });
  });

  it("05-Page usage", function () {
    // Get initial numbers
    cy.goToUsagePage();
    cy.get("#public_info")
      .find(".patient_num_sets")
      .then(($title) => cy.log("text : " + $title.text()));
    let initialPatientPublicNumber;
    let initialRunPublicNumber;
    let initialSetPublicNumber;
    cy.get("#public_info")
      .find(".patient_num_sets")
      .then(
        ($number) => (initialPatientPublicNumber = parseInt($number.text()))
      );
    cy.get("#public_info")
      .find(".run_num_sets")
      .then(($number) => (initialRunPublicNumber = parseInt($number.text())));
    cy.get("#public_info")
      .find(".set_num_sets")
      .then(($number) => (initialSetPublicNumber = parseInt($number.text())));

    // Add a user
    cy.createPatient("", "ft", "lt", "", "C", "public");
    cy.goToUsagePage();
    cy.then(() => {
      cy.get("#public_info")
        .find(".patient_num_sets")
        .should("have.text", initialPatientPublicNumber + 1);
      cy.get("#public_info")
        .find(".run_num_sets")
        .should("have.text", initialRunPublicNumber);
      cy.get("#public_info")
        .find(".set_num_sets")
        .should("have.text", initialSetPublicNumber);
    });

    // Add a run
    cy.createRun("", "r", "2024-01-01", "cy", "public");
    cy.goToUsagePage();
    cy.then(() => {
      cy.get("#public_info")
        .find(".patient_num_sets")
        .should("have.text", initialPatientPublicNumber + 1);
      cy.get("#public_info")
        .find(".run_num_sets")
        .should("have.text", initialRunPublicNumber + 1);
      cy.get("#public_info")
        .find(".set_num_sets")
        .should("have.text", initialSetPublicNumber);
    });

    cy.intercept({
      method: "POST",
      url: "index*",
    }).as("postIndexMyAccount");

    // Click on a tag
    cy.get(
      '#public_info > .set_data.margined-bottom > [data-linkable-name="#test0"]'
    )
      .should("contain", "test0")
      .click();
    cy.wait(["@postIndexMyAccount", "@getActivities"]);

    // 5 patients, 5 runs, 5 sets
    cy.get(".patient_num_sets").should("have.text", "5");
    cy.get(".run_num_sets").should("have.text", "5");
    cy.get(".set_num_sets").should("have.text", "5");

    // Click on another tag
    cy.get(
      '#public_info > .set_data.margined-bottom > [data-linkable-name="#set_assoc_1"]'
    )
      .should("contain", "set_assoc_1")
      .click();
    cy.wait(["@postIndexMyAccount", "@getActivities"]);

    // 1 patient, 1 run, 1 set
    cy.get(".patient_num_sets").should("have.text", "1");
    cy.get(".run_num_sets").should("have.text", "1");
    cy.get(".set_num_sets").should("have.text", "1");
  });

  it("06-Page process", function () {
    cy.goToProcessPage();
    var initialProcessNumberReturn = cy.getTableLength("#table_process");

    cy.intercept({
      method: "POST",
      url: "jobs*",
    }).as("postJobs");

    cy.get('[data-linkable-name="#test0"]')
      .first()
      .should("contain", "#test0")
      .click();
    cy.wait(["@postJobs", "@getActivities"]);
    cy.get("#db_filter_input").should("have.value", "#test0");
    cy.getTableLength("#table_process").should("eq", 15);

    cy.get("#db_filter_input").clear();
    cy.get("#db_filter_input").type("{enter}");
    cy.wait(["@postJobs", "@getActivities"]);
    initialProcessNumberReturn.then((initialProcessNumber) =>
      cy.getTableLength("#table_process").should("eq", initialProcessNumber)
    );
  });
});
