load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSimple < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example1.vidjil")
      $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
    end
  end
  
  def test_00_graph_hidden
#    assert (not $b.clone_in_graph('0').visible?), "Graph lines should not be visible"
    assert (not $b.graph.exists?), "Graph should not exist"
  end

  def test_00_double_scatterplot
    # analysis-example has only one sample, second scatterplot expected
    assert ( $b.scatterplot.visible?), "First scatterplot should be found"
    assert ( $b.scatterplot(2).visible?), "Second scatterplot should be found"
  end

  def test_01_legend_scatterplot
    assert ($b.scatterplot_x_legend(0).text == "TRGV5"), "First legend should be TRGV5"
    assert ($b.scatterplot_y_legend(0).text == "TRGJ1"), "First legend should be TRGJ1"

    assert ($b.scatterplot_x_legend(0, 2).text == "?"), "Legend should be ?, it is " + $b.scatterplot_x_legend(0, 2).text
    assert ($b.scatterplot_x_legend(1, 2).text == "100"), "Legend should be 100, it is " + $b.scatterplot_x_legend(1, 2).text
    assert ($b.scatterplot_x_legend(2, 2).text == "150"), "Legend should be 150, it is " + $b.scatterplot_x_legend(2, 2).text
    assert ($b.scatterplot_y_legend(0, 2).text == "0%"), "First legend sould be 0%"
  end

  def test_02_deactivate_locus
    initial_read_nb = $b.info_selected_locus.text
    $b.locus_topleft('TRG').click
    $b.clone_in_scatterplot('0').wait_while_present
    assert ($b.info_selected_locus.text == "no read"), "When unselected we have no reads"

    # Reactivate
    $b.locus_topleft('TRG').click
    $b.clone_in_scatterplot('0').wait_until_present
    assert ($b.info_selected_locus.text == initial_read_nb), "Read number should be identical to what we had at first"
  end

  def test_03_color_V
    $b.color_by('V/5\'')

    color_sp_legend = $b.scatterplot_x_legend(0).style('color')
    color_clone_sp = $b.clone_in_scatterplot('0').style('color')
    color_clone_list = $b.clone_in_list('0').style('color')

    assert (color_sp_legend == color_clone_sp), "Legend on V and clone should have the same color"
    assert (color_clone_list == color_clone_sp), "Clone should have the same color in list and in scatterplot"
  end

  def test_03_color_J
    $b.color_by('J/3\'')

    color_sp_legend = $b.scatterplot_y_legend(0).style('color')
    color_clone_sp = $b.clone_in_scatterplot('0').style('color')
    color_clone_list = $b.clone_in_list('0').style('color')

    assert (color_sp_legend == color_clone_sp), "Legend on V and clone should have the same color"
    assert (color_clone_list == color_clone_sp), "Clone should have the same color in list and in scatterplot"
  end

  def test_zz_close
    close_everything
  end
end
