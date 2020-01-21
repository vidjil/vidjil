# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestCluster < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil", "/doc/analysis-example2.analysis")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end


  def after_tests
  end
  
  def test_00_list_clones
    assert ($b.div(:id => 'cluster1').exists? ), '>> cluster1 exist'
    assert (not $b.clone_cluster('1').present?), '>> cluster1 is not display'
  end


  def test_01_cluster_show
    $b.clone_info('1')[:cluster].click
    assert ($b.clone_cluster('1').present?), '>> cluster1 is display'
  end


  def test_02_cluster_hide
    $b.clone_info('1')[:cluster].click
    $b.clone_cluster('1').wait_while(&:present?)
    assert (not $b.clone_cluster('1').present?), '>> cluster1 is not display'
  end


  def test_03_cluster_show_all
    $b.clone_in_list('1').click
    $b.a(:id => 'list_split_all').click
    assert ( $b.clone_in_segmenter('1').exists? ), ">> selected clone (clone2) is present into the segmenter"
    assert ( $b.clone_in_segmenter('2').exists? ), ">> The second clone of the cluster (clone3) of selected clone is also show"
  end


  def test_04_cluster_hide_all
    $b.a(:id => 'list_unsplit_all').click
    $b.clone_in_segmenter('3').wait_while(&:present?)
    assert (not $b.clone_in_segmenter('3').exists? ), ">> The second clone of the clustr is hidden"
  end



  # Not really a test
  def test_zz_close
    close_everything
  end
end
