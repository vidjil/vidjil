load 'segmenter_browser.rb'
load 'segmenter_test.rb'

class TestSegmenterPageErrors < SegmenterTest

  def test_00_launch_bad_query
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set "blabla"
    
    assert (not $b.element(:class => 'flash_2').present?), "No log message should be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'flash_2').wait_until(&:present?)
    assert ($b.element(:class => 'flash_2', :index => 1).text.include? "invalid sequences"), "We should have an error_message"
    
    assert (not $b.element(:class => 'segmenter').present?), "Segmenter should not be present"
    assert (not $b.element(:class => 'scatterplot').present?), "Segmenter should not be present"
  end

  def test_01_launch_unsegmented_seq
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set ">seq1
CGTCTT"
    
    assert (not $b.element(:class => 'segmenter').present?), "Segmenter should not be present yet"
    assert (not $b.element(:class => 'scatterplot').present?), "Segmenter should not be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'imgAjaxLoading').wait_until(&:present?)
    $b.clone_in_segmenter('0').wait_until(&:present?)
    
    assert ($b.element(:class => 'segmenter').present?), "Segmenter should be present"
    assert ($b.element(:class => 'scatterplot').present?), "Segmenter should be present"
    assert ($b.clone_in_segmenter('0').exists?), "We should have one sequence"
    assert ($b.clone_in_segmenter('0').text.include? 'CGTCTT'), "We should have sequence CGTCTT, %s instead" % $b.clone_in_segmenter('0').text
  end

  def test_zz_close
    close_everything
  end
end
