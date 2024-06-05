var localhost = true
console.log( Cypress.env('workdir') )
var url = "./"+ Cypress.env('workdir')+"/browser/segmenter_page.html"
console.log( url )


describe('Aligner', function () {
    beforeEach(function () {
        cy.setBrowser(url)
    })

  
  it('Aligner page submit',  function() {
    cy.update_icon(2000)
    cy.get('#form_sequences').type( ">seq1 \n" +
                                    "CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC\n" +
                                    "\n" +
                                    ">seq2 \n" +
                                    "GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT",
                                    {delay:0.1})
    
    cy.submitSegmenterNetwork()

    // aligner
    cy.get('#scatter_container_circle0', { timeout: 10000 }).should('exist')
    cy.get('#scatter_container_circle1').should('exist')

    // scatterplot
    cy.get('#seq0').should('exist')
    cy.get('#seq0').contains('TRGV5 5/7/5 J1')
    cy.get('#seq1').should('exist')
    cy.get('#seq1').contains('IGHV3-13 1/20/5 D2-15 1/10/5 J5*02')
    
    return
  })

  it('Aligner page export fasta',  function() {
    cy.update_icon(2000)
    cy.get('#form_sequences').type( ">seq1 \n" +
                                    "CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC\n" +
                                    "\n" +
                                    ">seq2 \n" +
                                    "GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT",
                                    {delay:0.1})
    
    cy.submitSegmenterNetwork()
    cy.get('#scatter_container_circle0', { timeout: 10000 }).should('exist')

    cy.newTabDisabler("#form")
    cy.get('#btn_exportfasta').click();

    cy.get('body').contains(">TRGV5*01 5/GGGCCAG/5 TRGJ1*01    200 nt, 1 read")
    cy.get('body').contains(">IGHV3-13*01 1/TGAGGCGGAGAGATCGGGGG/5 IGHD2-15*01 1/AACGGTAAGT/5 IGHJ5*02    374 nt, 1 read ")
    
    return
  })

  it('Aligner page error bad query',  function() {
    cy.update_icon(2000)
    cy.get('#form_sequences').type( "blabla")
    

    cy.submitSegmenterNetwork()

    cy.get('.flash_container', { timeout: 10000 }).contains('invalid sequences')

    return
  })

  it('Aligner page error unseg',  function() {
    cy.update_icon(2000)
    cy.get('#form_sequences').type( ">seq1 \n"+
                                    "CGTCTT",
                                    {delay:0})
    
    cy.submitSegmenterNetwork()

    cy.get('#seq0', { timeout: 10000 }).should('exist')
    cy.get('#seq0').contains('seq1')
    cy.get('#seq0').contains('CGTCTT')
    cy.get('#seq1').should('not.exist')

    return
  })


})
