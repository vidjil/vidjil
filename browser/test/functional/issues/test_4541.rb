# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

 def setup
    super
    if not defined? $b
      # set_browser("/browser/test/data/bug_stock_order/4541.vidjil")
    end
  end


  def after_tests
  end

  ########################
  ### DESCRIPTION FILE ###
  ########################
  # Vidijl file with 3 samples, only 6 clones keeped
  # Analysis 


  ### Issue 4541; 
  def test_00_load_analysis_simple_reorder
    set_browser("/browser/test/data/bug_stock_order/4541.vidjil", "/browser/test/data/bug_stock_order/4541_00_stock.analysis")
    assert ( $b.span(:id => "visu2_title").text == "2 / 3" ), "Ratio show is correct at init"
    assert (    $b.graph_x_legend('0').text == 'file0_name')
    assert (not $b.graph_x_legend('1').present?)
    assert (    $b.graph_x_legend('2').text == 'file2_name')
  end


  # Samples here haven't stock_order field (old one)
  def test_01_load_analysis_hidden_sample
    set_browser("/browser/test/data/bug_stock_order/4541.vidjil", "/browser/test/data/bug_stock_order/4541_01.analysis")
    assert ( $b.span(:id => "visu2_title").text == "2 / 3" ), "Ratio show is correct at init"
    assert (    $b.graph_x_legend('0').text == 'file0_name')
    assert (not $b.graph_x_legend('1').present?)
    assert (    $b.graph_x_legend('2').text == 'file2_name')
  end


  def test_02_load_analysis_one_more_sample
    set_browser("/browser/test/data/bug_stock_order/4541_02.vidjil", "/browser/test/data/bug_stock_order/4541_01.analysis")
    assert ( $b.span(:id => "visu2_title").text == "3 / 4" ), "Ratio show is correct at init"
    assert (    $b.graph_x_legend('0').text == 'file0_name')
    assert (not $b.graph_x_legend('1').present?)
    assert (    $b.graph_x_legend('2').text == 'file2_name')
    assert (    $b.graph_x_legend('3').text == 'file3_name')
  end


  def test_03_load_analysis_deleted_sample
    set_browser("/browser/test/data/bug_stock_order/4541_03_deleted_sample.vidjil", "/browser/test/data/bug_stock_order/4541_00_stock.analysis")
    assert ( $b.span(:id => "visu2_title").text == "1 / 2" ), "Ratio show is correct at init"
    assert (    $b.graph_x_legend('0').text == 'file0_name')
    assert (not $b.graph_x_legend('1').present?)
  end


  def test_04_load_analysis_all_new_samples
    set_browser("/browser/test/data/bug_stock_order/4541.vidjil", "/browser/test/data/bug_stock_order/4541_04_all_new_samples.analysis")
    assert ( $b.span(:id => "visu2_title").text == "3 / 3" ), "Ratio show is correct at init"
    assert ( $b.graph_x_legend('0').text == 'file0_name')
    assert ( $b.graph_x_legend('1').text == 'file1_name')
    assert ( $b.graph_x_legend('2').text == 'file2_name')
  end

  def test_05_load_analysis_duplicate_in_order
    set_browser("/browser/test/data/bug_stock_order/4541.vidjil", "/browser/test/data/bug_stock_order/4541_05_duplicate_in_order.analysis")
    assert ( $b.span(:id => "visu2_title").text == "2 / 3" ), "Ratio show is correct at init"
    assert (    $b.graph_x_legend('0').text == 'file0_name')
    assert (not $b.graph_x_legend('1').present?)
    assert (    $b.graph_x_legend('2').text == 'file2_name')
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
