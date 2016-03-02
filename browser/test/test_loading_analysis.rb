load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSimple < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil", "/doc/analysis-example2.analysis")
      $b.clone_in_scatterplot('0').wait_until_present
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
    assert ($b.clone_in_list('0').visible?)
    assert ($b.clone_in_scatterplot('0').visible?)
    assert ($b.clone_in_graph('0').visible?)

    # Hide the clone by affecting it to a hidden tag
    $b.clone_info('0')[:star].click
    $b.tag_item('4')[:name].click

    assert (not $b.clone_in_list('0').visible?)
    assert (not $b.clone_in_scatterplot('0').visible?)
    assert (not $b.clone_in_graph('0').visible?)

    # Unhide clone
    $b.element(:id => 'fastTag4', :class => 'inactiveTag').click
    assert (not $b.element(:id => 'fastTag4', :class => 'inactiveTag').exists?)
    assert ($b.clone_in_list('0').visible?)
    assert ($b.clone_in_scatterplot('0').visible?)
    assert ($b.clone_in_graph('0').visible?)
  end


  def test_98_select_other
    # Click on first point
    $b.graph_x_legend('1').click
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?)
    assert ($b.graph_x_legend('0', :class => 'graph_time').exists?)

    qpcr = $b.external_data('qPCR')
    assert (qpcr[:name] == 'qPCR' and qpcr[:value] == 0.024), "qPCR external data not as expected"

  end

  def test_zz_close
    close_everything
  end
end
