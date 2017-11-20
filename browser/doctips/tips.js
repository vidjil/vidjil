
tips = {

    // #I Introduction (mini-tutorial, à prendre dans l'ordre)
    'I10': 'Select a clone anywhere: its DNA sequence is shown in the bottom view.',
    'I11': 'Select several clones, for instance those sharing a same V and J, and "align" their sequences to inspect their similarity.',
    'I20': 'Manually cluster very similar clones as one.  This action can be undone in the "cluster menu" at the top of the screen.',
    'I21': 'Customize your plot axis by clicking on "plot" (in the top left corner of the plot)',
    'I30': 'The search bar (above the list) filters clones on their DNA sequence, gene names, or CDR3 partial aa sequence. See <a href="http://vidjil.org/doc/user.html#XXXX">here</a>',
    'I31': 'Click on the "focus" button in order to only keep the clones that are relevant to your work. Discard this by clicking on the X near the search bar, above the list.',
    'I40': 'Tag clones depending on your preferences. Tag colors will be applied to all the views when the color mode is "tag".',
    'I41': 'Tagged clones can be hidden by clicking on the corresponding coloured square in the panel above the list.',
    'I50': 'Generate reports of your analyses by clicking on "export report" in the export/import menu.',
    'I90': 'The <a href="http://www.vidjil.org/doc/tutorial/mastering-vidjil.html">tutorial</a> covers many different aspects of using Vidjil. It is available in English and in French.',

    // #S Tips (server/database)
    'S01': 'XXX Create patient, upload a sample XXXX',
    'S02': 'Vidjil loves compressed files (fastq.gz, fasta.gz). They spare disks space and bandwidth !',
    'S10': 'Different run configs are designed to analyze different types of data. Find out more <a href="http://vidjil.org/doc/user.html#Configs">here</a>.',
    'S11': 'From Vidjil, you can analyze your data with the Vidjil built-in algorithm, but also with MiXCR, Decombinator and Xxxxx. Just select the appropriate "config".',
    'S20': 'By saving your analysis all your changes are stored (clone colors, sample reorganisation, clusters, sample information). Just press <span class="key">Ctrl+s</span>, or click « save » in the menu over the patient name.',
    'S30': 'Rename a sample by double-clicking on its name in the top left of the screen.',
    'S31': 'Access all the files produced during the read analysis process by clicking on the “out” link.',
    'S40': 'Uploaded files can serve several times: A sample can be part of a patient, a run, a sample set at the same time.',
    'S50': '"Compare samples"  allows you to compare clones from multiple patients, runs or sets',
    'S80': 'View the clones depending on their similarity by choosing the preset <span class="key">⇧0</span> or <span>⇧1</span> in the plot menu (computing similarity may take time… do you need a coffee?)',
    'S90': 'Have you already seen news at the top of the screen? Click on them to have more information.',

    // #T Tips (client, possibly without a server)
    'T01': 'Do you want to inspect all your V2 clones ? Clicking on a label in the grid will select all clones related to that label',
    'T02': 'Bothered by the sequence panel (bottom view) going up and down? Just click on the pin on the right to keep it calm.',
    'T03': 'A clone with an abundance of <span class="element">+</span> was detected with one or a few reads, but not enough to display a meaningful ratio. A clone with an abundance of <span class="element">-</span> was not detected at all in this sample, guaranteed.',
    //Hover the mouse to see the actual number of reads.
    'T10': 'Vidjil analyzes data on humans, mice, rats and dogs. We can add your other favorite pets, contact us !',
    'T20': 'Normalize data by selecting a clone and apply selected normalization method XXXX',
    'T30': '<span class="key">←</span> and <span class="key">→</span> navigate between samples. Discover other <a href="http://vidjil.org/doc/user.html#Shortcuts">keyboard shortcuts</a>.',
    'T31': '<span class="key">+</span> clusters the selected clones, and <span class="key">Backspace</span> reverts to the previous clustering. Discover other <a href="http://vidjil.org/doc/user.html#Shortcuts">keyboard shortcuts</a>.',
    'T32': '<span class="key">H</span>  switches the display to IGH clones, <span class="key">B</span>  to TRB clones, and so on. Discover other <a href="http://vidjil.org/doc/user.html#Shortcuts">keyboard shortcuts</a>.',
    'T40': 'Drag and drop samples in the graph to reorganize them. This order is saved with "save analysis".',
    'T41': 'Hide samples by dragging them to the three dots on the top right corner of the graph.',
    'T50': 'Clicking on the vertical bar enlarges the right part of the screen.',
    'T60': 'You may sometimes have very few sequences to analyze. The tool  <a href="http://app.vidjil.org/analyze"> analyses very easily up to 10 clones from a small fasta file or paste without uploading any file nor creating a patient or a run.',
    'T70': 'Vidjil has a dark mode. But nobody uses it. Do you?',
    'T80': 'Plot presets can be called with a single keystroke, such as <span class="key">5</span> for the V distribution or <span class="key">0</span> for getting back to the default VJ view.',

    // #O Other software
    'O01': 'Clicking on the triangle next to IMGT/V-QUEST will query their site and import the data into the sequence panel.',
    'O03': 'Vidjil can export your data for you to run other software or tools on. Export fasta XXX, export autre ? XXX', 
    'O04': 'There are wonderful tools to analyze RepSeq data. You can see MiXCR or IMGT/V-QUEST results through XXXX. Contact us if you need links to other software !',
    'O10': 'Vidjil is very flexible, the limits set on the servers may not apply to a local usage. See the  <a href="http://vidjil.org/doc/algo.html">documentation of the command-line algorithm</a>.',
    'O11': 'The built-in Vidjil algorithm can be downloaded and installed on any Linux computer. See <a href="http://vidjil.org/doc/algo.html>its documentation and install instructions</a>.',

    // #B Biological questions
    'B01': 'The plot preset <span class="key">4</a> is like a Genescan, displaying clones according to their length. Be careful, the length can be different from what you are used with PCR primers !',
    'B02': 'Have you ever seen a rainbow Genescan? Select the plot preset <span class="key">4</span> and change the colour mode to "clones". Each clone is coloured randomly.',
    'B03': 'Clones with very low average coverage will display a warning sign instead of the "info" button. If you wonder what this means, have a look at <a href="http://www.vidjil.org/doc/user.html#coverage">our documentation</a>.',
    'B04': 'Clones with large e-values will display a warning sign instead of the "info" button. If you wonder what this means, have a look at <a href="http://www.vidjil.org/doc/user.html#evalue">our documentation</a>.',
    'B05': 'Few reads are analyzed? This could be due to your sequencing protocol (eg. capture) or to your read length. Make sure that your reads are long enough (at least 100bp) and overlap the V(D)J genes. More details <a href="http://www.vidjil.org/doc/user.html#analyzed-reads">here</a>.',
    'B06': 'Analyzing paired-end data? Pre-process your files using PEAR directly within our web application.', // server ?
    'B07': 'Do you have a "xxx" locus appearing in your result? This one just gathers totally unexpected recombinations (between distinct chains, or on different strands), such as PCR dimers. See <a href="http://git.vidjil.org/blob/master/doc/locus.org">here</a>.',

    // #N Network
    'N01': 'Vidjil is regularly used by more than 30 labs in 15 countries. Six hospitals trust us for their routine clinical analyses on leukemia diagnosis.',
    'N02': 'No lymphocyte was harmed in the making of this software, however this software is for research use only and comes with no warranty.',
    'N03': 'We can provide support or collaboration on some datasets. Contact us !',
    'N04': 'All this story started in Lille, a <span style="text-decoration: line-through;">cold and wet</span> lovely place between Paris, Brussels and London. Come visit us to share projects and beers !',
    'N05': 'A question, a bug report, a suggestion ? Use the "get support" link in the "help" menu. It prepares an email for you with your current view',
    'N06': 'What is the Vidjil team working on now ? See the tasks on <a href="XXXXX">our Gitlab page</a>. You can raise new issues there (XXX ?)',

}
