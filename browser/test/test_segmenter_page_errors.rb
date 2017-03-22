load 'segmenter_browser.rb'
load 'browser_test.rb'

class TestSegmenterPageErrors < BrowserTest

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

  def test_00_launch_bad_query
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set "blabla"
    
    assert (not $b.element(:class => 'flash_2').present?), "No log message should be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'flash_2').wait_until_present
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

    $b.element(:class => 'imgAjaxLoading').wait_until_present
    $b.clone_in_segmenter('0').wait_until_present
    
    assert ($b.element(:class => 'segmenter').present?), "Segmenter should be present"
    assert ($b.element(:class => 'scatterplot').present?), "Segmenter should be present"
    assert ($b.clone_in_segmenter('0').exists?), "We should have one sequence"
    assert ($b.clone_in_segmenter('0').text.include? 'CGTCTT'), "We should have sequence CGTCTT, %s instead" % $b.clone_in_segmenter('0').text
  end

  def test_zz_close
    close_everything
  end
end
