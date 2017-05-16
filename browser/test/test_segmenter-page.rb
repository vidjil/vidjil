load 'segmenter_browser.rb'
load 'browser_test.rb'

class TestSegmenterPage < BrowserTest

  def set_browser
    # Redefine set_browser as the tested webpage is totally different

    folder_path = Dir.pwd
    folder_path.sub! '/browser/test', ''
    index_path = 'file://' + folder_path + '/browser/segmenter_page.html'

    print "Open browser\n"
    #$b = VidjilBrowser.new :safari
    $b = SegmenterBrowser.new :firefox
    #$b = VidjilBrowser.new :chrome

    print "Resize\n"
    $b.window.resize_to(1500, 800)

    print "Testing segmenter page at " + index_path + "\n"
    $b.goto index_path

    # check that the segmenter loaded correctly
    if not $b.textarea(:id => 'form_sequences').present?
      print "Loading of segmenter page failed. Do not execute remaining tests."
      exit
    end

    print "Segmenter page loaded, launching tests.\n"
    
  end
  
  def setup
    super
    if not defined? $b
      set_browser
    end
  end

  def test_00_launch_query
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set ">seq1
CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC

>seq2
GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT"

    assert (not $b.element(:class => 'segmenter').present?), "Segmenter should not be present yet"
    assert (not $b.element(:class => 'scatterplot').present?), "Segmenter should not be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'imgAjaxLoading').wait_until_present
    $b.clone_in_scatterplot('0').wait_until_present
    
    assert ($b.element(:class => 'segmenter').present?), "Segmenter should be present"
    assert ($b.element(:class => 'scatterplot').present?), "Segmenter should be present"
  end

  def test_01_segmenter
    assert ($b.clone_in_segmenter('0').visible?), "Clone 0 should be in segmenter"
    assert ($b.clone_in_segmenter('1').visible?), "Clone 1 should be in segmenter"
    assert (not $b.clone_in_segmenter('2').exists?), "Clone 2 should not exist"
  end

  def test_02_scatterplot
    assert ($b.clone_in_scatterplot('0').visible?), "Clone 0 should be in scatterplot"
    assert ($b.clone_in_scatterplot('1').visible?), "Clone 1 should be in scatterplot"
    assert (not $b.clone_in_scatterplot('2').visible?), "Clone 2 should not be visible"
  end

  def test_03_change_color
    $b.clone_in_segmenter('0').hover
    $b.clone_info_segmenter('0')[:star].click
    tagColor = $b.tag_item('3')[:color].style('background-color')
    check_segmenter_on_the_right
    $b.tag_item('3')[:name].click
    $b.clone_in_segmenter('1').hover # Change clone to hover: on hover color doesn't change

    assert ($b.clone_info_segmenter('0')[:name].style('color') == tagColor), "Clone has not changed color in segmenter"

    # Must remove rgb from the start of the fill style, and the closing parentheses at the end,
    # as tagColor is a rgba color with four components, and not just a rgb as the fill color.
    assert (tagColor.index($b.clone_in_scatterplot('0').style('fill')[4..-2]) > 0), "Clone has not changed color in scatterplot"

    # Check that scatterplot is still on the right
    check_segmenter_on_the_right
  end

  def test_04_segmenter_highlights
    for i in ['0', '1']
      for gene in ['V', 'J']
        span = $b.clone_in_segmenter(i).span(:class => gene)
        assert (span.visible?), "#{gene} span should be visible"
      end
    end
  end

  def test_05_imgt_post
    begin
      $b.span(:id => "toIMGTSeg" ).click
      $b.segmenter_checkbox_imgt_vdj.wait_until_present
      Watir::Wait.until(timeout=10) { $b.span(:class => "identityBad").exists? }

      clone_info = $b.clone_info_segmenter('0')
      productive_html = clone_info[:axis].element(:class => 'productivity-IMGT').title
      assert (productive_html.include? 'productivity'), "IMGT should tell us the productivity of the sequence"

      clone_segmenter = $b.clone_in_segmenter('0')
      $b.segmenter_checkbox_imgt_vdj.click
      highlights = clone_segmenter.spans(:class => 'highlight_border')
      assert (highlights.size >= 2 && highlights.size <= 3), "We should have the V(D)J genes highlighted, we had %d highlights" % highlights.size
      for h in highlights
        assert (h.style('width').to_i >= 100), "Highlights should have a reasonable width, found to be %s" % h.style('width')
      end

      clone_info[:identity].element(:text => "NaN%").wait_while_present
      assert ((clone_info[:identity].text =~ /^[0-9\.]+%$/) == 0 ), "We should have identity rate (found: %s)" % clone_info[:identity].text
    end
  end

  def test_06_scatterplot_change_preset
    $b.scatterplot_select_preset(/CDR3 length/)
                                       
    assert ($b.scatterplot_x_label.text =~ /CDR3 length/), "X scatterplot label should now be CDR3 length (was %s)" % $b.scatterplot_x_label.text
    sleep 1 # Waiting for the transition to finish
    assert ($b.clone_in_scatterplot('1').tag_name == 'rect'), "Clone should be a rectangle now (was %s)" % $b.clone_in_scatterplot('1').tag_name
  end

  def test_07_export_fasta
    $b.element(:id => 'btn_exportfasta').click
    
    assert ( $b.window(:title => "").exists? ) , ">> fail opening fasta export "
    $b.window(:title => "").use do
      assert ($b.text.index(/TRGV5.*200 nt/) > 0), "header name"
      assert ($b.text.index(/IGHV3-13.*374 nt/) > 0), "header name"
      assert ($b.text.include? "CCTGG\nGGGGCCA\nGATT"), "sequence"
    end
  end
  
  def check_segmenter_on_the_right
    
    right_coord_of_textarea = $b.sequences_area.wd.location.x \
                              + $b.sequences_area.wd.size.width
    left_coord_of_scatterplot = $b.scatterplot.wd.location.x

    assert (right_coord_of_textarea < left_coord_of_scatterplot), "Textarea should be left of scatterplot"
  end
  
  def test_zz_close
    close_everything
  end
end
