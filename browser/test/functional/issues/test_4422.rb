# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4422.vidjil")
    end
  end

  # Test overlaps information
  def after_tests
  end
  
  def test_00_load_first_config_without_analysis
    $b.i(:class => "icon-info").click

    assert ($b.table(:id => "overlap_morisita").exist?), "Morisita overlap table exist"
    assert ($b.table(:id => "overlap_jaccard").exist?), "Jaccard overlap table exist"
  end

  
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
