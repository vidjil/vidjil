load 'browser_test.rb'

class SegmenterTest < BrowserTest

  def set_browser
    # Redefine set_browser as the tested webpage is totally different

    folder_path = File.expand_path(File.dirname(__FILE__))
    folder_path.sub! '/browser/test/functional', ''
    index_path = 'file://' + folder_path + '/browser/segmenter_page.html'

    print "Open browser\n"
    $b = SegmenterBrowser.new

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
end
