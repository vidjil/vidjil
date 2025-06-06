/// <reference types="cypress" />

describe("Manipulate configs", function () {
  it("01-config", function () {
    cy.createConfig(
      "c",
      ["3", "Analysis with/for other software"],
      undefined,
      "x",
      "f",
      "i"
    ).then((config_id) => {
      cy.createPatient("", "airr", "t", "", "Cy", "public");
      cy.addSample(
        undefined,
        "nfs",
        "Demo-X5.airr",
        undefined,
        "2000-01-01",
        "AIRR"
      ).then((sample_id) => {
        cy.log(
          "added sample " +
            sample_id +
            " and start process for config " +
            config_id
        );
        cy.launchProcess("" + config_id, sample_id);
        cy.waitAnalysisCompleted(config_id, sample_id);
      });
    });
  });

  it("02-preprocess_config", function () {
    // Create a preprocess
    var pre_process_name_1 = "d1";
    var pre_process_name_2 = "d2";
    var pre_process_command = "d";
    var pre_process_info = "Cy";
    cy.createPreprocess(
      pre_process_name_1,
      pre_process_command,
      pre_process_info
    ).then((preprocess_id) => {
      // Edit a preprocess
      cy.editPreprocess(
        preprocess_id,
        pre_process_name_2,
        pre_process_command,
        pre_process_info + "; edit"
      );

      // Change permissions for group public (id=3)
      cy.permissionPreprocess(preprocess_id, 3, true);
      cy.permissionPreprocess(preprocess_id, 3, false);

      // Delete preprocess
      cy.deletePreprocess(preprocess_id, pre_process_name_2);
    });
  });

  it("03-clipboard-config", function () {
    cy.goToConfigsPage();

    if ((Cypress.browser.name === "chromium") && (parseInt(Cypress.browser.version.split(".")[0]) >= 81)) {
      cy.wrap(Cypress.automation('remote:debugger:protocol', {
        command: 'Browser.grantPermissions',
        params: {
          permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
          origin: window.location.origin,
        },
      }))
      cy.get('#copyPathClipboard_2 > .icon-newspaper')
        .click()
        .then(() => {
          // check that the path is copied to clipboard
          cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
              expect(text).to.contain("'program': 'vidjil',");
              expect(text).to.contain("'classification': '1',");
              expect(text).to.contain("'name': 'multi+inc+xxx',");
              expect(text).to.contain("'command': '-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ',");
              expect(text).to.contain("'fuse_command': '-t 100',");
              expect(text).to.contain("'info': 'multi-locus, with some incomplete/unusual/unexpected recombinations'");
            });
          });

          // check flash message is displayed
          cy.get(".flash_1").should("be.visible").contains("Copied");
        });

        cy.get('#new_config_btn')
          .click()

        cy.get('#db_content > button')
          .click()

        cy.get('#config_name').should('have.value',"multi+inc+xxx");
        cy.get('#config_classification').should('have.value',"1");
        cy.get('#config_program').should('have.value',"vidjil");
        cy.get('#config_command').should('have.value',"-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -d -w 50 ");
        cy.get('#config_fuse_command').should('have.value',"-t 100");
        cy.get('#config_info').should('have.value',"multi-locus, with some incomplete/unusual/unexpected recombinations");

    }

  });


  it("03-clipboard-config-preprocess", function () {
    cy.goToPreprocessPage();

    if ((Cypress.browser.name === "chromium") && (parseInt(Cypress.browser.version.split(".")[0]) >= 81)) {
      cy.wrap(Cypress.automation('remote:debugger:protocol', {
        command: 'Browser.grantPermissions',
        params: {
          permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
          origin: window.location.origin,
        },
      }))

      cy.get('#preprocess_copyPathClipboard_1 > .icon-newspaper')
        .click()
        .then(() => {
          // check that the path is copied to clipboard

          cy.window().then((win) => {
            win.navigator.clipboard.readText().then((text) => {
              expect(text).to.contain("'name': 'd1',");
              expect(text).to.contain("'command': 'd',");
              expect(text).to.contain("'info': 'Cy'");
            });
          });

          // check flash message is displayed
          cy.get(".flash_1").should("be.visible").contains("Copied");
        });

        cy.get('#new_preprocess_btn')
          .click()

        cy.get('#fillPreprocessConfigFormFromClipboard')
          .click()

        cy.get('#pre_process_name').should('have.value',"d1");
        cy.get('#pre_process_command').should('have.value',"d");
        cy.get('#pre_process_info').should('have.value',"Cy");

    }

  });


});
