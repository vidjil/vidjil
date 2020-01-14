load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestLoadingAnalysis < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil", "/doc/analysis-example2.analysis")
      $b.clone_in_scatterplot('0').wait_until(&:present?)
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end

  def test_00_name
    assert ($b.graph_x_legend('0').text == 'diag')
    assert ($b.graph_x_legend('1').text == 'fu1')

    # It should be selected
    assert ($b.graph_x_legend('0', :class => 'graph_time2').exists?)
  end

  def test_00_order
    # fu1 should be before diag
    assert ($b.graph_x_legend('0').attribute_value('x') > $b.graph_x_legend('1').attribute_value('x'))
  end

  def test_00_custom_clone
    assert ($b.clone_info('0')[:name].text == 'Main ALL clone')

    $b.select_tag('0').click
    $b.update_icon.wait_while(&:present?)

    assert (not $b.clone_in_list('0').present?)
    assert (not $b.clone_in_scatterplot('0').present?)
    assert (not $b.clone_in_graph('0').present?)

    $b.select_tag('0').click
    $b.update_icon.wait_while(&:present?)
  end

  def test_01_data_loaded
    qpcr = $b.external_data('qPCR')
    assert (qpcr[:name] == 'qPCR' and qpcr[:value] == 0.83), "qPCR external data not as expected"

    spike = $b.external_data('spikeZ')
    assert (spike[:name] == 'spikeZ' and spike[:value] == 0.01), "spikeZ external data not as expected"
  end

  def test_02_tag_names
    # Open tag selector
    $b.clone_info('1')[:star].click

    assert($b.tag_item('0')[:name].text == 'main clone')
    assert($b.tag_item('3')[:name].text == 'spike')
    assert($b.tag_item('5')[:name].text == 'custom tag')
  end

  def test_03_hidden_tags
    # Test that the two tags are hidden
    assert ($b.select_tag('4', :class => 'inactiveTag').exists?)
    assert ($b.select_tag('5', :class => 'inactiveTag').exists?)
  end

  def test_04_hide_clone
    assert ($b.clone_in_list('0').present?)
    assert ($b.clone_in_scatterplot('0').present?)
    assert ($b.clone_in_graph('0').present?)

    # Hide the clone by affecting it to a hidden tag
    $b.clone_info('0')[:star].click
    $b.tag_item('4')[:name].click
    $b.update_icon.wait_while(&:present?)

    $b.clone_in_list('0').wait_while(&:present?)
    assert (not $b.clone_in_list('0').present?)
    $b.clone_in_scatterplot('0').wait_while(&:present?)
    assert (not $b.clone_in_scatterplot('0').present?)
    $b.clone_in_graph('0').wait_while(&:present?)
    assert (not $b.clone_in_graph('0').present?)

    # Unhide clone
    $b.element(:id => 'fastTag4', :class => 'inactiveTag').click
    $b.update_icon.wait_while(&:present?)
    assert (not $b.element(:id => 'fastTag4', :class => 'inactiveTag').exists?)
    assert ($b.clone_in_list('0').present?)
    assert ($b.clone_in_scatterplot('0').present?)
    assert ($b.clone_in_graph('0').present?)
  end

  def test_05_check_cluster
    clustered = $b.clone_info('1')
    assert (clustered[:name].text == 'clone2'), "First clone of cluster should be clone2"
    assert ($b.clone_in_scatterplot('1').present?)
    assert (not $b.clone_in_scatterplot('2').present?)

    clustered[:cluster].click
    $b.update_icon.wait_while(&:present?)

    assert ($b.clone_in_scatterplot('1').present?), "First clone should still be present"
    $b.clone_in_scatterplot('2').wait_until(&:present?)

    first_in_cluster = $b.clone_in_cluster('1', '1')
    second_in_cluster = $b.clone_in_cluster('1', '2')

    assert (first_in_cluster[:name].text == 'clone2')
    assert (second_in_cluster[:name].text == 'clone3')

    # Close the cluster
    clustered[:cluster].click
end

  def test_06_remove_cluster
    clustered = $b.clone_info('1')
    clustered[:cluster].click
    $b.until { $b.clone_in_cluster('1', '2')[:delete].present? }
    $b.clone_in_cluster('1', '2')[:delete].click
    $b.update_icon.wait_while(&:present?)

    assert (not $b.clone_cluster('1').present?)
    
    assert ($b.clone_in_scatterplot('1').present?)
    assert ($b.clone_in_scatterplot('2').present?)

    clone3 = $b.clone_info('2')
    assert (clone3[:name].text == "clone3")
    assert (clone3[:system].text == "G")
  end

  def test_07_create_cluster
    $b.clone_in_scatterplot('1').click
    $b.clone_in_scatterplot('2').click(:control)

    $b.merge.click
    $b.update_icon.wait_while(&:present?)

    clustered = $b.clone_info('1')
    assert (clustered[:name].text == 'clone2')
    assert ($b.clone_in_scatterplot('1').present?)
    $b.until{ not $b.clone_in_scatterplot('2').present? }
  end

  def test_08_select_cluster
    $b.clone_in_scatterplot('1').click
    $b.update_icon.wait_while(&:present?)

    clustered = $b.clone_info('1')
    assert ($b.clone_in_scatterplot('1', :class => "circle_select").exists?)
    assert ($b.clone_in_graph('1', :class=> "graph_select").exists?)
    assert ($b.clone_in_segmenter('1').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    assert ( not $b.clone_in_scatterplot('2', :class => "circle_select").exists?)
    assert ( not $b.clone_in_graph('2', :class=> "graph_select").exists?)
    assert ( not $b.clone_in_segmenter('2').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    clustered[:cluster].click

    assert ($b.clone_in_scatterplot('1', :class => "circle_select").exists?)
    assert ($b.clone_in_graph('1', :class=> "graph_select").exists?)
    assert ($b.clone_in_segmenter('1').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    $b.until { $b.clone_in_scatterplot('2', :class => "circle_select").exists? }
    assert ( $b.clone_in_graph('2', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('2').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    clustered[:cluster].click
    $b.update_icon.wait_while(&:present?)
    $b.unselect
  end

  def test_09_select_other
    # Click on first point
    $b.graph_x_legend('1').click
    $b.update_icon.wait_while(&:present?)
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?)
    assert ($b.graph_x_legend('0', :class => 'graph_time').exists?)

    qpcr = $b.external_data('qPCR')
    assert (qpcr[:name] == 'qPCR' and qpcr[:value] == 0.024), "qPCR external data not as expected"

  end

  def test_10_clone_segedited_from_analysis
    # Click on first point
    $b.clone_in_scatterplot('3').click
    sleep 1
    # If cdr3 checked, the sequence will be split in mutiple dom element with highlight or not
    check = $b.checkbox(:id => "vdj_input_check")
    if check.set? # by default, in chromium based browser, the checkbox is set to true
      check.click
    end
    assert ( not check.set? ), "CDR3 checkbox is not checked"
    assert ( $b.clone_in_segmenter('3').exists? ), ">> clone 3 is correctly present in the segmenter, without infinite loop"
    assert ( $b.span(:id => 'sequence-clone-3').text.include? 'GGGGGCCCCCGGGGGCCCCCGGGGGCCCCCGGGGGCCCCCAAAAATTTTTAAAAATTTTTAAAAATTTTT'), "sequence of analysis loaded replace sequence of vidjil file"
  end

  def test_zz_close
    close_everything
  end
end
