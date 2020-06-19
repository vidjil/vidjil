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
    # change current sample to start on sample 0 (second in loaded order)
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)

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
    assert (not $b.clone_in_segmenter('3').present? ), ">> The second clone of the cluster is hidden"
  end


  def test_05_switch_onlyOneSample
    cloneId = '4'
    $b.update_icon.wait_while(&:present?)
    # exist will not work as the clone is present, but not visible.
    # So use the number of points of the line [with new smooth line, there is no formula]
    polyline4 = $b.path(:id => "polyline"+cloneId )

    assert ( polyline4.attribute_value("d").split(',').length == 12 ), ">> clone is present in the graph by default"

    ### switch the filter ON, current sample include cloneId
    $b.menu_filter.click
    $b.div(:id => "filter_switch_sample").click
    assert ( $b.clone_in_list(cloneId).exists? ), ">> clone is present in the list"

    assert ( polyline4.attribute_value("d").split(',').length == 12 ), ">> clone is still present in the graph if switched in filter menu (and correct sample)"


    # change current sample, will not include cloneId
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    polyline4 = $b.path(:id => "polyline"+cloneId )
    assert ( polyline4.attribute_value("d").split(',').length == 2 ), ">> clone is NOT present in the graph if switched in filter menu and sample with size at 0 for this clone"

    ## control if name get the '*' if focus on it
    $time0 = $b.graph_x_legend("0")
    $time1 = $b.graph_x_legend("1")

    assert ( $time0.text == "2019-12-17" ), "label of timepoint 0 in graph don't have the '*'"
    assert ( $time1.text == "+10 *" ), "label of timepoint 1 in graph have the '*'"

    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    assert ( $time0.text == "2019-12-17 *" ), "label of timepoint 0 in graph don't have the '*'"
    assert ( $time1.text == "+10" ), "label of timepoint 1 in graph have the '*'"

    # return to sample without clone4
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    ### switch the filter OFF
    $b.menu_filter.click
    $b.div(:id => "filter_switch_sample").click
    $b.update_icon.wait_while(&:present?)
    assert ( $time0.text == "2019-12-17" ), "label of timepoint 0 in graph still don't have the '*'"
    assert ( $time1.text == "+10" ), "label of timepoint 1 in graph don't have the '*' anymore"
    
    polyline4 = $b.path(:id => "polyline"+cloneId )
    assert ( polyline4.attribute_value("d").split(',').length == 12 ), ">> clone is again present in the graph if switched in filter menu (in sample without it)"
  end


  def test_06_cluster_not_ordered
    # cluster of clone in an inverted order (considering size)
    # clone 1 (biggest) should be before the second; even if clone 2 is before in cluster from analysis file
    
    assert ($b.div(:id => 'cluster5').exists? ), '>> cluster5 exist'
    assert (not $b.clone_cluster('5').present?), '>> cluster5 is not display'

    assert (     $b.clone_in_list('5').present? ), ">> clone 5 is present"
    assert ( not $b.clone_in_list('6').present? ), ">> clone 6 is not present as it is clutered into clone 5"
    
    $b.clone_in_list('5').click

    assert ( not $b.clone_in_segmenter('6').present? ), ">> The second clone of the cluster is NOT present in segmenter"

    $b.a(:id => 'list_split_all').click
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_in_segmenter('5').present? ), ">> The first clone of the cluster is present in segmenter"
    assert ( $b.clone_in_segmenter('6').present? ), ">> The second clone of the cluster is present in segmenter"

    # Add test on order of clones in list
    cluster = $b.clone_cluster('5')
    assert (  cluster.div(index: 0).id == "_6" ), ">> first clone in cluster is the 6th"
    assert (  cluster.div(index: 1).id == "_5" ), ">> second clone in cluster is the 5th"

  end



  # Not really a test
  def test_zz_close
    close_everything
  end
end
