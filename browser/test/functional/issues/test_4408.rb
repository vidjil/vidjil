# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("")
    end
  end


  def after_tests
  end
  
  def test_00_load_first_config_without_analysis
    # 3 samples; analysis based on these files
    set_browser("/browser/test/data/issues/4407_config_1.vidjil")
    
    # Test line in graph, only show if analysis loading end without error
    polyline = $b.path(:id => "polyline4")
    assert ( polyline.attribute_value("d").split(',').length == 22 ), ">> clone is present in the graph of first sample"
  end  

  def test_01_load_first_config
    # 3 samples; analysis based on these files
    set_browser("/browser/test/data/issues/4407_config_1.vidjil", "/browser/test/data/issues/4407_.analysis")
    
    # Test line in graph, only show if analysis loading end without error
    polyline = $b.path(:id => "polyline4")
    assert ( polyline.attribute_value("d").split(',').length == 22 ), ">> clone is present in the graph of first sample"
  end


  def test_02_load_second_config
    # Only 2 samples, not present in loaded analysis
    set_browser("/browser/test/data/issues/4407_config_2.vidjil", "/browser/test/data/issues/4407_.analysis")
    # Test line in graph, only show if analysis loading end without error
    polyline = $b.path(:id => "polyline4" )
    assert ( polyline.attribute_value("d").split(',').length == 17 ), ">> clone is present in the graph of first sample"
  end
  
  
  # Not really a test
  def test_zz_close
    close_everything
  end
end
