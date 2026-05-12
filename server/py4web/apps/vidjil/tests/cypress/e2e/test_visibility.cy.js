/// <reference types="cypress" />
// Should we keep these tests ? 
describe('Visibility of panels', function () {
  it('01-visibility of panels', function () {
    // Test visibility of some panel and z-index
    cy.goToPatientPage()
    cy.get('.db_div').should("be.visible")
    cy.newSet('patient')
    cy.get('.db_div').should("be.visible")
    cy.get('#patient_clipboard > .icon-newspaper').click()
    cy.get('.popup_container').should("be.visible")

    cy.get('.popup_container > .closeButton > .icon-cancel').click()
    cy.get('.popup_container').should("not.be.visible")
    cy.get('.db_div > .closeButton > .icon-cancel').click()
    cy.get('.db_div').should("not.be.visible")

    cy.get('#file_menu').should("not.be.visible")
    cy.get('#import_data_anchor').click({ force: true })
    cy.get('#file_menu').should("be.visible")

    cy.openAnalysis("browser/test/data/demo_lil_l3_0.vidjil", undefined, 90000)
    cy.get('#file_menu').should("not.be.visible")

    cy.get('.info-container').should("not.be.visible")
    cy.openCloneInfo('1')
    cy.get('.info-container').should("be.visible")

    cy.openDBPage()
    cy.get('.db_div').should("be.visible")
    cy.get('.info-container').should("not.be.visible")
  })

  it('02-title in db table (#4494)', function () {
    cy.goToPatientPage()

    cy.get('#sample_set_open_22_config_id_-1 > :nth-child(3) > .set_token')
      .should("have.attr", "title")
      .and("equal", "2 patient (22)")

    cy.get('#sample_set_open_22_config_id_-1 > :nth-child(5) > span')
      .should("have.attr", "title")
      .and("equal", "set association test #set_assoc_2")

    cy.get('#result_sample_set_13_config_1')
      .should("have.attr", "title")
      .and("equal", "Display results for config default + extract reads")

    cy.openSet(22) // patient 

    cy.get('#sequence_file_48')
      .should("have.attr", "title").and("equal", "test_file.fasta")

    cy.get('[title="#set_assoc_2"]') // if getter work

    cy.goToConfigsPage()
    cy.get('#config_classification_7')
      .should("have.attr", "title").and("equal", "Human V(D)J recombinations")
    cy.get('#config_command_7')
      .should("have.attr", "title").and("equal", "-c clones -z 100 -r 1 -g germline/homo-sapiens.g -e 1 -2 -w 90 -y all --no-airr")
    cy.get('#config_fuse_command_7')
      .should("have.attr", "title").and("equal", "-t 100 -d lenSeqAverage --overlaps")
    cy.get('#config_info_7')
      .should("have.attr", "title").and("equal", "incomplete germlines + larger window (90bp), thus 20bp more on each side. This configuration is advised for studies on IGH clonality")

    cy.goToPreprocessPage()
    cy.get('#preprocess_name_4')
      .should("have.attr", "title").and("equal", "test pre-process 2")
    cy.get('#preprocess_command_4')
      .should("have.attr", "title").and("equal", "dummy &file1& &file2& > &result&")
    cy.get('#preprocess_info_4')
      .should("have.attr", "title").and("equal", "test 2")
  })


  it('03-name of custom fuse (issue #5205), direct button', function () {
    cy.goToPatientPage()

    const fname = "fname"
    const lname = "lname"
    const runname = "run_name"
    const preprocess = undefined;
    const filename1 = "Demo-X5-no-clone.vidjil";
    const filename2 = undefined;
    const samplingDate = "2021-01-01";
    const sampleInformation1 = "info of sample1";
    const conf_import_vidjil = "import_vidjil_1";

    cy.createConfig(
      conf_import_vidjil,
      ["3", "Analysis with/for other software"],
      undefined,
      "x",
      "f",
      "i"
    ).then((configId) => {
      cy.log(`Create config "${conf_import_vidjil} with id ${configId}`)
      configId = configId.toString()

      cy.createPatient("", fname, lname, "", "c", "public")
        .then((patientId) => {

          cy.addSample(
            preprocess,
            "nfs",
            filename1,
            filename2,
            samplingDate,
            sampleInformation1
          ).then((sampleId) => {
            cy.log("added sample " + sampleId);

            // Launch process and wait for result, as vidjil import, should be instant
            cy.launchProcess(configId, sampleId);
            cy.waitAnalysisCompleted(configId, sampleId);

            cy.get(`#open_sample_result_${sampleId} > .icon-export`)
              .click()

            cy.get(`a#open_sample_result_${sampleId}`)
              .invoke('attr', 'href')
              .then((href) => {
                const urlParams = new URLSearchParams(href.split('?')[1]);
                const result_id = urlParams.get('custom');
                cy.log('Result Id :', result_id); // Affiche "100"

                // f"set {name}; sequence file: {filename} ({sequence_file_id}); result file: {id}";
                cy.get('#top_info') // as anon_ids is called, we used pateintId in sample set name
                  .should("contain", `${filename1.split(".vidjil")[0]}`)
                  // .should("contain", `(${conf_import_vidjil}`) // config name
                  .should("not.contain", `${lname} ${fname} (${patientId})`)

                cy.get('#patient_info_text')
                  .should("contain", `${filename1}`)
                  .should("contain", `(${conf_import_vidjil}`) // config name
                  .should("contain", `${lname} ${fname} (${patientId})`)
              })

          })
        })


      cy.createRun("", runname, "2025-01-01", "info", "public")
        .then((runId) => {

          cy.addSample(
            preprocess,
            "nfs",
            filename1,
            filename2,
            samplingDate,
            sampleInformation1
          ).then((sampleId) => {
            cy.log("added sample " + sampleId);

            // Launch process and wait for result, as vidjil import, should be instant
            cy.launchProcess(configId, sampleId);
            cy.waitAnalysisCompleted(configId, sampleId);

            cy.get(`#open_sample_result_${sampleId} > .icon-export`)
              .click()

            cy.get(`a#open_sample_result_${sampleId}`)
              .invoke('attr', 'href')
              .then((href) => {
                const urlParams = new URLSearchParams(href.split('?')[1]);
                const result_id = urlParams.get('custom');
                cy.log('Result Id :', result_id); // Affiche "100"

                // f"set {name}; sequence file: {filename} ({sequence_file_id}); result file: {id}";
                cy.get('#top_info') // as anon_ids is not called, we don't used pateintId in sample set name
                  .should("contain", `${filename1.split(".vidjil")[0]}`)
                  // .should("contain", `(${conf_import_vidjil}`) // config name
                  .should("not.contain", `${runname} (${runId})`)

                cy.get('#patient_info_text')
                  .should("contain", `${filename1.split(".vidjil")[0]}`)
                  .should("contain", `(${conf_import_vidjil})`) // config name
                  .should("contain", `${runname}`)
              })

          })
        })
    })
  })


  it('04-name of custom fuse (issue #5205), multiple sample, compare view', function () {
    cy.goToPatientPage()

    const fname = "fname"
    const lname = "lname"
    const runname = "run_name"
    const preprocess = undefined;
    const filename1 = "Demo-X5-no-clone.vidjil";
    const filename2 = undefined;
    const samplingDate = "2021-01-01";
    const sampleInformation = "c #cy";

    const sampleInformation1 = "info of sample1";
    const sampleInformation2 = "info of sample2";

    const conf_import_vidjil = "import_vidjil_2";

    cy.createConfig(
      conf_import_vidjil,
      ["3", "Analysis with/for other software"],
      undefined,
      "x",
      "f",
      "i"
    ).then((configId) => {
      cy.log(`Create config "${conf_import_vidjil} with id ${configId}`)
      configId = configId.toString()

      cy.createPatient("", fname, lname, "", "c", "public")
        .then((patientId) => {

          cy.addSample(
            preprocess,
            "nfs",
            filename1,
            filename2,
            samplingDate,
            sampleInformation1
          ).then((sampleId1) => {
            cy.log("added sample 1: " + 1);


            // Add a second sample
            cy.addSample(
              preprocess,
              "nfs",
              filename1,
              filename2,
              samplingDate,
              sampleInformation2
            ).then((sampleId2) => {
              cy.log("added sample 2: " + sampleId2);

              // Launch process and wait for result, as vidjil import, should be instant
              cy.launchProcess(configId, sampleId1);
              cy.get(`#launch_all_unanalyzed_samples_${configId} > .icon-cog-2`)
                .click()

              cy.waitAnalysisCompleted(configId, sampleId1);
              cy.waitAnalysisCompleted(configId, sampleId2);

              cy.get(`[onclick="db.call('sample_set/custom', {'id': '${patientId}', 'filter': ''} )"]`)
                .click()

              cy.get('#db_fixed_header > thead > tr > .column_20 > .checkbox_all')
                .click()

              cy.get(`[onclick="myUrl.loadCustomUrl(db, {'sample_set_id':${patientId} })"]`)
                .click({ force: true })

              cy.get('#top_info')
                .should("contain", `Compare 2 samples from set ${lname} ${fname} (${patientId})`)

              cy.get('#patient_info_text')
                .should("contain", `Custom: Compare 2 samples from set ${lname} ${fname} (${patientId})`)

              cy.get('#time0')
                .click()
                .should("contain", `${filename1} (${conf_import_vidjil})`)

              cy.get('#time1')
                .click()
                .should("contain", `${filename1} (${conf_import_vidjil})`)

            })
          })
        })
    })
  })


  it('05-sort collumns - users table', function () {

    // User page
    cy.goToUsersPage()
    /**
     * User 1 => administrator; last logged 
     * User 2 => testing; never logged
     * User 3 => testing; logged at previous cypress test script
     */
    
    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "2")
    cy.getRowIdFromTable("#db_table_container", 2, "3")

    cy.get('[data-sort="lastName"] > .icon-arrow-combo').should("exist")
    cy.get('[data-sort="last_login"] > .icon-arrow-combo').should("exist")
    
    cy.get('[data-sort="last_login"]')
      .click().click() // dbclick to invert
    cy.get('[data-sort="last_login"] > .icon-sort-alt-down')
      .should("exist")
    cy.get('[data-sort="lastName"] > .icon-arrow-combo').should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "3")
    cy.getRowIdFromTable("#db_table_container", 2, "2")

    cy.get('[data-sort="firstName"]')
      .click()
    cy.get('[data-sort="firstName"] > .icon-sort-alt-up')
      .should("exist")
    cy.get('[data-sort="last_login"] > .icon-arrow-combo')
      .should("exist", "previous sort have unsorted icon again")

    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "6")
    cy.getRowIdFromTable("#db_table_container", 2, "2")
    cy.getRowIdFromTable("#db_table_container", 3, "4")
    cy.getRowIdFromTable("#db_table_container", 4, "3")

    cy.get('[data-sort="firstName"]')
      .click()
    cy.get('[data-sort="firstName"] > .icon-sort-alt-down')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "3")
    cy.getRowIdFromTable("#db_table_container", 1, "5")
    cy.getRowIdFromTable("#db_table_container", 2, "2")
    cy.getRowIdFromTable("#db_table_container", 3, "4")
    cy.getRowIdFromTable("#db_table_container", 4, "6")


    cy.get('[data-sort="groups"]')
      .click()
    cy.get('[data-sort="groups"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "2")
    cy.getRowIdFromTable("#db_table_container", 2, "3")

  })


  it('06-sort collumns - process', function () {

    // User page
    cy.goToConfigsPage()
    /**
     * 7	Human V(D)J recombinations	Clonality
     * 1	Human V(D)J recombinations	default + extract reads
     * 3	Human V(D)J recombinations	multi+inc
     * 2	Human V(D)J recombinations	multi+inc+xxx
     * 6	Other recombinations	IGH
     * 4	Other recombinations	multi
     * 5	Other recombinations	TRG
     * 8	Analysis with/for other software	Export all clones (AIRR)
     */
    
    // => Start sorted as classification is (and not text value)
    // Human V(D)J recombinations < Other recombinations < Analysis with/for other software
    cy.getRowIdFromTable("#db_table_container", 0, "7")
    cy.getRowIdFromTable("#db_table_container", 4, "6")
    cy.getRowIdFromTable("#db_table_container", 7, "8")

    cy.get('[data-sort="classification"] > .icon-arrow-combo').should("exist")
    cy.get('[data-sort="name"] > .icon-arrow-combo').should("exist")

    cy.get('[data-sort="classification"]')
      .click()
    cy.get('[data-sort="classification"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "8")
    cy.getRowIdFromTable("#db_table_container", 1, "7")
    cy.getRowIdFromTable("#db_table_container", 5, "6")

    cy.get('[data-sort="classification"]')
      .click()
    cy.get('[data-sort="classification"] > .icon-sort-alt-down')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "6")
    cy.getRowIdFromTable("#db_table_container", 1, "4")
    cy.getRowIdFromTable("#db_table_container", 3, "7")
    cy.getRowIdFromTable("#db_table_container", 7, "8")

    cy.get('[data-sort="name"]')
      .click()
    cy.get('[data-sort="name"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "7")
    cy.getRowIdFromTable("#db_table_container", 1, "1")
    cy.getRowIdFromTable("#db_table_container", 2, "8")
    cy.getRowIdFromTable("#db_table_container", 3, "6")
    cy.getRowIdFromTable("#db_table_container", 4, "4")

    cy.get('[data-sort="num"]')
      .click()
    cy.get('[data-sort="num"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "2")
    cy.getRowIdFromTable("#db_table_container", 2, "3")
    cy.getRowIdFromTable("#db_table_container", 3, "4")
    cy.getRowIdFromTable("#db_table_container", 4, "5")

  })

  it('07-sort collumns - preprocess', function () {

    // User page
    cy.goToPreprocessPage()
    /**
     * 4	"test pre-process 2"
     * 3	"test pre-process 1"
     * 2	"test pre-process 0"
     * 1	"public pre-process"
     * 5	"pre-process perm"
     */
    
    // => Start sorted on name
    cy.getRowIdFromTable("#db_table_container", 0, "4")
    cy.getRowIdFromTable("#db_table_container", 1, "3")
    cy.getRowIdFromTable("#db_table_container", 2, "2")
    cy.getRowIdFromTable("#db_table_container", 3, "1")
    cy.getRowIdFromTable("#db_table_container", 4, "5")

    cy.get('[data-sort="num"] > .icon-arrow-combo').should("exist")
    cy.get('[data-sort="name"] > .icon-arrow-combo').should("exist")

 
    cy.get('[data-sort="name"]')
      .click()
    cy.get('[data-sort="name"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "5")
    cy.getRowIdFromTable("#db_table_container", 1, "1")
    cy.getRowIdFromTable("#db_table_container", 2, "2")
    cy.getRowIdFromTable("#db_table_container", 3, "3")
    cy.getRowIdFromTable("#db_table_container", 4, "4")

    cy.get('[data-sort="num"]')
      .click()
    cy.get('[data-sort="num"] > .icon-sort-alt-up')
      .should("exist")

    cy.getRowIdFromTable("#db_table_container", 0, "1")
    cy.getRowIdFromTable("#db_table_container", 1, "2")
    cy.getRowIdFromTable("#db_table_container", 2, "3")
    cy.getRowIdFromTable("#db_table_container", 3, "4")
    cy.getRowIdFromTable("#db_table_container", 4, "5")

  })
})
