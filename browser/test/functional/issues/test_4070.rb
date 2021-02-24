# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestNullDiversityIssue < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4070_diversity_null.vidjil")
    end
  end

  def test_00_open_sample_info
    $b.info_point.i.click
    info_timepoint = $b.div(id: "info_timepoint")
    # timepoint information panel is open and show correct informations
    assert( info_timepoint.text.include? "Ds_diversity")    
    assert( info_timepoint.text.include? "null")    
  end
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
