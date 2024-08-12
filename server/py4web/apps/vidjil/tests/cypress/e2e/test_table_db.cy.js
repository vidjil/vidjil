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
    return;
  });

  it("02-Launch, open, delete analysis and check logs", function () {
    var id = "";
    var firstname = "fn";
    var lastname = "ln";
    var birthday = "2000-01-01";
    var informations = "cy";
    var group = "public";
    cy.createPatient(id, firstname, lastname, birthday, informations, group).as(
      "patient_id"
    );

    var preprocess = undefined;
    var filename1 = "Demo-X5.fa";
    var filename2 = undefined;
    var samplingdate = "2021-01-01";
    var informations = "cy; #cy";
    cy.addSample(
      preprocess,
      "nfs",
      filename1,
      filename2,
      samplingdate,
      informations
    ).then((sample_id) => {
      cy.log("added sample " + sample_id);

      // Launch process and wiath for result
      cy.launchProcess("2", sample_id);
      cy.waitAnalysisCompleted("2", sample_id);

      cy.goToLogsPage()

      // Log are tested in reverse order as last is shown first
      cy.get('#db_table_container')
        .should("contain", "run requested with config multi+inc+xxx")
      cy.get('#db_table_container')
        .should("contain", "file (" + sample_id + ") //Demo-X5.fa added")
      cy.get('#db_table_container')
        .should("contain", "patient (" + sample_set_id + ") las added")
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
    });
  });

  it("03-Sets and samples creations, associations, deletions", function () {
    // Create, edit patients
    var id = "";
    var firstname = "fn";
    var lastname = "ln";
    var birthday = "2000-01-01";
    var informations = "cy";
    var group = "public";
    cy.createPatient(
      id,
      firstname + "_1",
      lastname + "_1",
      birthday,
      informations + " (1)",
      group
    ).as("patient1");
    const patient1_display_name = lastname + "_1" + " " + firstname + "_1";
    cy.createPatient(
      id,
      firstname + "_2",
      lastname + "_2",
      birthday,
      informations + " (2)",
      group
    );
    cy.createPatient(
      id,
      firstname + "_3",
      lastname + "_3",
      birthday,
      informations + " (3)",
      group
    ).then((uid) => {
      cy.editPatient(
        uid,
        id,
        firstname + "_4",
        lastname + "_4",
        birthday,
        informations + " (4)"
      );
    });

    // Filter patients
    cy.goToPatientPage();
    cy.dbPageFilter(firstname + "_1");
    cy.getTableLength("#db_table_container").should("eq", 1);
    cy.dbPageFilter("patient");
    cy.getTableLength("#db_table_container").should("eq", 8);

    // Create run
    cy.createRun(id, "run link", "2023-01-01", "cy", group);

    // Add samples and multi-samples with association
    var preprocess = undefined;
    var filename1 = "Demo-X5.fa";
    var filename2 = undefined;
    var samplingdate = "2021-01-01";
    var informations = "cy";
    cy.addSample(
      preprocess,
      "nfs",
      filename1,
      filename2,
      samplingdate,
      informations + " (1) #cy",
      firstname + "_1"
    ).as("sample_1");
    var sample_to_add_2 = [
      preprocess,
      "nfs",
      filename1,
      filename2,
      samplingdate,
      informations + " (2)",
      firstname + "_2",
    ];
    var sample_to_add_3 = [
      preprocess,
      "nfs",
      filename1,
      filename2,
      samplingdate,
      informations + " (3)",
      firstname + "_4",
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

    var id = "";
    var firstname = "ft";
    var lastname = "lt";
    var birthday = "2000-01-01";
    var informations = "Cy-tag";
    var group = "public";

    // Some with tag
    cy.createPatient(
      id,
      firstname + "_4",
      lastname + "_4",
      birthday,
      informations + "(4) #t1 #t2",
      group
    );
    cy.createPatient(
      id,
      firstname + "_5",
      lastname + "_5",
      birthday,
      informations + "(5) #t1 #t2",
      group
    );
    cy.createPatient(
      id,
      firstname + "_6",
      lastname + "_6",
      birthday,
      informations + "(6) #t1",
      group
    ).then((patient_id) => {
      cy.intercept({
        method: "POST",
        url: "all*",
      }).as("postAllSampleSets");

      // From inside the patient
      cy.get(".tag-link") // work only if one tag available
        .should("contain", "#t1")
        .click();
      cy.wait(["@postAllSampleSets", "@getActivities"]);
      cy.getTableLength("#db_table_container").should("eq", 3);

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
      cy.getTableLength("#db_table_container").should("eq", 3);
    });
  });

  it("05-Page usage", function () {
    cy.goToUsagePage();

    // 8 patients, 8 runs, 8 sets
    cy.get(".patient_num_sets").should("have.text", "8");
    cy.get(".run_num_sets").should("have.text", "8");
    cy.get(".set_num_sets").should("have.text", "8");

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
    cy.getTableLength("#table_process").should("eq", 45);

    cy.intercept({
      method: "POST",
      url: "jobs*",
    }).as("postJobs");

    // Redifine to reset interceptions
    cy.intercept({
      method: "GET",
      url: "get_active_notifications*",
    }).as("getActivitiesNew");

    cy.get('[data-linkable-name="#test0"]')
      .first()
      .should("contain", "#test0")
      .click();
    cy.wait(["@postJobs", "@getActivitiesNew"]);
    cy.get("#db_filter_input").should("have.value", "#test0");
    cy.getTableLength("#table_process").should("eq", 15);

    cy.get("#db_filter_input").clear();
    cy.get("#db_filter_input").type("{enter}");
    cy.wait(["@postJobs", "@getActivitiesNew"]);
    cy.getTableLength("#table_process").should("eq", 45);
  });
});
