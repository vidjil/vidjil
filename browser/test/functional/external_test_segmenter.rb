load 'segmenter_browser.rb'
load 'segmenter_test.rb'

class TestExternalSegmenterPage < SegmenterTest

  def test_00_launch_query
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set ">seq1
CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC

>seq2
GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT"

    assert (not $b.element(:class => 'segmenter').present?), "Segmenter should not be present yet"
    assert (not $b.element(:class => 'scatterplot').present?), "Segmenter should not be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'imgAjaxLoading').wait_until(&:present?)
    $b.clone_in_scatterplot('0').wait_until(&:present?)
    
    assert ($b.element(:class => 'segmenter').present?), "Segmenter should be present"
    assert ($b.element(:class => 'scatterplot').present?), "Segmenter should be present"
  end

  def test_05_imgt_post
    begin
      $b.div(:id => "align-imgt" ).click
      Watir::Wait.until(timeout: 10) { $b.span(:class => "identityBad").exists? }
      clone_info = $b.clone_info_segmenter('0')
      clone_info[:identity].element(:text => "NaN%").wait_while(&:present?)
      productive_title = clone_info[:axis].element(:class => 'productivity').title
      assert (productive_title.include? 'productivity'), "IMGT should tell us the productivity of the sequence"

      clone_segmenter = $b.clone_in_segmenter('0')
      Watir::Wait.until(timeout: 10) { $b.execute_script("return typeof model.clone(0).seg.imgt['N-REGION end']") != "undefined" }
      $b.div(:id => "align-imgt" ).hover
      # $b.a(:id => "aligner_checkbox_IMGT_VDJ" ).click #checkbox already checked by default
      $b.div(:id => "align-imgt" ).click
      $b.update_icon.wait_while(&:present?)
      highlight_V = clone_segmenter.div(:class => 'seq_layer_IMGT_V')
      assert (highlight_V.style('width').to_i >= 100), "V should have a reasonable width, found to be %s" % highlight_V.style('width')

      assert ((clone_info[:identity].text =~ /^[0-9\.]+%$/) == 0 ), "We should have identity rate (found: %s)" % clone_info[:identity].text
    end
  end

  def test_zz_close
    close_everything
  end
end
