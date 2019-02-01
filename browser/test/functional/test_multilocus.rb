# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestMultilocus < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example.vidjil")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end
    end
  end


  def after_tests
  end
  
  def test_00_info_segmentation
    assert ($b.div(:id => 'info_segmented').text.include?  '742 377 (94.35%)'), ' Incorrect number of segmented reads'
  end


  def test_00_info_reads
    assert ($b.div(:id => 'info_segmented').title.include? '786 861'), 'Incorrect number of reads'
  end

  def test_00_default_point_name
    assert ($b.div(:id => 'info_point').text.include? 'helloworld'), 'Incorrect point name in info box'
  end

  def test_00_germline
    assert ($b.div(:id => 'info').span(:class => 'systemBoxNameMenu', :index => 0).text.include? 'TRA'), 'missing system TRA'
  end

  def test_00_legend_scatterplot
    assert ($b.scatterplot_x_legend(0).text == 'TRBV1'), "Bad legend for scatterplot"
    assert ($b.scatterplot_x_legend(4).text == '?'), "Bad legend for scatterplot"
    assert ($b.scatterplot_y_legend(0).text == 'TRBJ1-1'), "Bad legend for scatterplot"
    assert ($b.scatterplot_y_legend(9).text == '?'), "Bad legend for scatterplot"
  end

  def test_00_info_point
    assert (not $b.div(:id => 'info_timepoint').present?), "Info timepoint should not be present"
    $b.info_point.i.click
    assert ($b.div(:id => 'info_timepoint').present?), "After clicking info timepoint should be visible"

    table = $b.div(:id => 'info_timepoint').table
    assert (table[1][1].text == '786861'), "Incorrect  number of reads in infopoint"
    assert (table[2][1].text.include? '742377'), "Incorrect  number of reads in infopoint"
    $b.div(:class => 'data-container').span(:class => 'closeButton').click
    assert (not $b.div(:id => 'info_timepoint').present?), "Info timepoint should not be present"
  end

  def test_01_init

      assert ( $b.clone_in_list('25').exists?), ">>fail init : clone 0 missing in list"
      assert ( $b.clone_in_scatterplot('25').exists?), ">>fail init : clone 0 missing in scatterplot"
      #assert ( $b.clone_in_graph('25').exists?), ">>fail init : clone 0 missing in graph"
      assert ( $b.clone_in_list('25').text.include? '0.129%' ) , ">>fail init : wrong clone size "

  end

  def test_02_fold_left_menu
    assert ($b.div(:id => "left-container").present?), ">> fail : left menu should be visible"
    $b.div(:id => "vertical-separator").click
    assert (not $b.div(:id => "left-container").present?), ">> fail : left menu is still visible"
    $b.div(:id => "vertical-separator").click
    assert ($b.div(:id => "left-container").present?), ">> fail : left menu did not reappear"
  end

  def test_03_rename_clone_by_clicking
    clone_name = $b.clone_info('25')[:name]
    assert (clone_name.title == 'TRBV29*01 -1/0/-0 TRBD1*01 -2/0/-5 TRBJ2-5*01'), " >> clone name is not correct : " + clone_name.title
    assert (clone_name.text == 'TRBV29 1//0 D1 2//5 J2-5'), " >> clone short name is not correct : " + clone_name.text
    clone_name.double_click

    $b.clone_name_editor.set 'renamed_click'
    $b.clone_name_saver.click
    assert (clone_name.text == 'renamed_click'), " >> clone name (click) has not changed"

    $b.unselect
  end

  def test_04_rename_clone_by_enter
    sleep 1
    clone_name = $b.clone_info('24')[:name]
    clone_name.double_click

    $b.clone_name_editor.set 'renamed_return'
    $b.send_keys :return
    assert (clone_name.text == 'renamed_return'), " >> clone name (return) has not changed"

    $b.unselect
  end

  def check_when_list_or_scatterplot_focused
    assert ( $b.clone_in_scatterplot('25', :class => 'circle_focus').exists?), ">> fail to focus correct plot after hovering a clone in the list"
    assert ( $b.clone_in_graph('25', :class => "graph_focus").exists?), ">> fail to focus correct graphLine after hovering a clone in the list"

    clone_name = $b.clone_info('25')[:name]
    assert ( $b.infoline.inner_html == clone_name.title), ">> Clone name is not correct in focus div"
  end

  def test_05_focus_in_list
    begin
      $b.unselect
      #test hover a clone in the list
      $b.clone_in_scatterplot('25').wait_until(&:present?)
      $b.clone_in_list('25').hover

      check_when_list_or_scatterplot_focused
    end
  end

  def test_05_focus_in_scatterplot
    begin
      $b.unselect
      $b.clone_in_scatterplot('25').wait_until(&:present?)
      $b.clone_in_scatterplot('25').hover

      check_when_list_or_scatterplot_focused
    end
  end

  def check_when_list_or_scatterplot_clicked
    clone_name = $b.clone_info('25')[:name]
    assert ( $b.infoline.inner_html == clone_name.title), ">> Clone name is not correct in focus div"
    assert ( $b.clone_in_list('25').class_name.include? "list_select" ), ">> Incorrect class name, clone is not selected"
    assert ( $b.clone_in_scatterplot('25', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('25', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('25').exists? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    stats = $b.statsline
    assert (stats.text.include? '1 clone'), ">> Incorrect stats, should have one clone"
    assert (stats.text.include? '962 reads'), ">> Incorrect stats, should have 962 reads"
    assert (stats.text.include? '0.129%'), ">> Incorrect stats, should be at 0.129%"
  end

  def test_08_click_in_list
    #test select a clone in the list
    $b.clone_in_scatterplot('25').wait_until(&:present?)
    $b.clone_info('25')[:name].click()

    check_when_list_or_scatterplot_clicked

    $b.unselect
    assert (not $b.clone_in_list('25').class_name.include? "list_select"), ">> Incorrect class name, clone is not unselected'"
  end

  def test_08_click_in_scatterplot
    $b.clone_in_scatterplot('25').wait_until(&:present?)
    $b.clone_in_scatterplot('25').click

    check_when_list_or_scatterplot_clicked

    $b.unselect
    assert (not $b.clone_in_list('25').class_name.include? "list_select"), ">> Incorrect class name, clone is not unselected'"
  end

  def TODO_test_09_normalize
    $b.clone_info('25')[:star].click
    $b.tag_selector_edit_normalisation.wait_until(&:present?)
    $b.tag_selector_edit_normalisation.set('0.01')
    $b.tag_selector_normalisation_validator.click 
    
    assert ( $b.clone_info('25')[:size].text == '1.000%' ) , ">> fail normalize on : wrong clone size "
    
    $b.menu_settings.click 
    $b.radio(:id => 'reset_norm').click
    assert ( $b.clone_info('25')[:size].text == '0.129%' ) , ">> fail normalize off : wrong clone size "

    $b.unselect
  end

  def test_0a_shortcuts_numpad
    $b.clone_in_scatterplot('25').wait_until(&:present?)
    $b.clone_in_scatterplot('25').click

    assert ($b.preset_selector.selected? "[0] V/J (genes)"), ">> preset selector badly set"
    $b.send_keys :numpad2
    assert ($b.preset_selector.selected? "[2] V/N length"), ">> preset selector not properly changed"
  end

  def test_12_tag
    begin
      $b.clone_info('25')[:star].click
      name = $b.tag_item('0')[:name]
      name.wait_until(&:present?)
      name.click
      name.wait_while(&:present?)

      assert ($b.clone_info('25')[:name].style('color') ==  'rgba(220, 50, 47, 1)' ) , ">> fail tag : clone color hasn't changed"
    end
  end

  def test_13_export_fasta
    $b.clone_in_scatterplot('77').click
    $b.clone_in_scatterplot('25').click(:control)
    $b.clone_in_scatterplot('88').click(:control)
    $b.clone_in_scatterplot('90').click(:control)

    $b.menu_item_export_fasta.click
    assert ( $b.window(:title => "").exists? ) , ">> fail opening fasta export "
    $b.window(:title => "").use do
      assert ($b.text.include? ">TRBV29*01 -1/0/-0 TRBD1*01 -2/0/-5 TRBJ2-5*01"), "header name"
      assert ($b.text.include? "YYGGGYYACGYAYAGCGGYGYTTYYCCTYTYTGYTYTGCYAAAYAACYYYYTGTGYCTYTGTGCYGYGTTYCCCGGYYYAAACYCYCYYCCTYGG\nCYAGGYCYGG"), "sequence"
      assert ($b.text.include? ">ERG-4F 0/TCT/0 ERG-Seq-R"), "header name locus ERG"
      assert (not $b.text.include? ">ERG-4F\n"), "header name of segment should not exist (segment is not present in germline)"
    end
  end

  def test_14_export_sample_report

    assert ($b.scatterplot_x_legend(0).text.include? 'TRB'), "Current system should be TRB"

    # Select a clone
    $b.clone_in_scatterplot('43').click

    $b.menu_item_export('export_sample_report').click

    assert ($b.window(:title => "analysis-example.vidjil – helloworld").exists?), ">> Report didn't show up"

    $b.window(:title => "analysis-example.vidjil – helloworld").use do
      # Check that all loci are there
      assert ($b.element(:id => 'segmentation-report').text.include? "TRA"), "TRA should be present"
      assert ($b.element(:id => 'segmentation-report').text.include? "TRB"), "TRB should be present"
      assert ($b.element(:id => 'segmentation-report').text.include? "TRD"), "TRD should be present"
      assert ($b.element(:id => 'segmentation-report').text.include? "IGH"), "IGH should be present"
      assert (not $b.element(:id => 'segmentation-report').text.include? "TRG"), "TRG should not be present"
      assert (not $b.element(:id => 'segmentation-report').text.include? "IGH+"), "IGH+ should not be present"
      assert ($b.element(:class => 'clone_name').text.include? "TRBV13-1*02 -0/1/-0 TRBD1*01 -6/0/-0 TRBJ1-3*01"), "segmentation should be the one provided in the .vidjil file"

      n_gene = $b.element(:class => 'n_gene', :index => 0)
      # This is true with a 0-based index, which is the case for the vidjil
      # JSON version used
      assert (n_gene.text == 'A'), ("N1 should be A, it is '" + n_gene.text + "'")

      n_gene = $b.element(:class => 'n_gene', :index => 1)
      assert (n_gene.text == ''), ("N2 should be empty, it is '" + n_gene.text + "'")

      assert($b.element(:class => 'j_gene').text == 'YYGYYTYYAATGTYCYYCCYAG')
      assert($b.element(:class => 'v_gene').text == 'YTYTYAYTGGTGCTGGYACCTYAAAYGYYTGYCCTYTGGGYYAGGCYCYYAYACGYAYAYCTYTYCYCTGCTGYATTGGCTYYCCYYAYYYTTTGYCTYTGTGCYGYGTYTGCGGYYTYTGYAAYCGCYYTTTTGYYAGYAGCCGGCY')
    end
    $b.window(:title => "analysis-example.vidjil – helloworld").close

    $b.window(:title => "analysis-example").use

    assert ($b.scatterplot_x_legend(0).text.include? 'TRB'), "Current system should not have changed"

    assert (not $b.element(:class => 'waiting_msg').present?), "The ``generating report'' message should not be present anymore"
  end

  def test_15_smaller_clones
    for i in 0..3
      smaller = $b.list.li(:index => i)

      assert (smaller.text.include?("smaller clones")), "We should have smaller clones at index %d of the list, instead we have %s " % [i, smaller.text]

      assert (smaller.present?), "Smaller clones #%d should be visible, it is not" % [i]
      smaller.hover
      assert (smaller.present?), "Smaller clones #%d should still be visible after hovering it" % [i]

      assert (not $b.clone_in_scatterplot(smaller.id).present?), "Smaller clone %d should not be visible in scatterplot" % [i]
    end
  end

  def test_16_select_unsegmented
    clone_id = '10'
    $b.clone_in_scatterplot(clone_id).click

    assert ($b.clone_in_segmenter(clone_id).exists?), "Clone %s is not in segmenter" % clone_id
  end

  def test_17_select_clustered
    $b.clone_in_scatterplot('1').click
    $b.clone_in_scatterplot('37').click(:control)
    $b.clone_in_scatterplot('90').click(:control)

    $b.merge.click

    assert ($b.clone_in_scatterplot('90').exists?), "Main clone of the cluster should be clone 90"
    assert ($b.clone_in_scatterplot('90', :class => "circle_select").exists?), "Clone should be selected"

    $b.clone_info('90')[:cluster].click

    assert ( $b.clone_in_scatterplot('1', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('1', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('1').exists? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    assert ( $b.clone_in_scatterplot('37', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('37', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('37').exists? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    assert ( $b.clone_in_scatterplot('90', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('90', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('90').exists? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    $b.clone_in_cluster('90', '1')[:delete].click
    $b.clone_in_cluster('90', '37')[:delete].click

    $b.unselect

    assert ($b.clone_in_scatterplot('1').exists?)
    assert ($b.clone_in_scatterplot('37').exists?)
    assert ($b.clone_in_scatterplot('90').exists?)

  end

  def test_18_empty_clone_invisible
    assert ( $b.execute_script("return m.clones[66].reads[0]") == 0), "Clone should have no read"
    assert (not $b.clone_in_scatterplot('66').present?), "Clone should not be visible"
  end

  def TODO_test_14_edit_tag
    begin
      ## rename Tag 0
      $b.clone_info('25')[:star].click

      edit = $b.tag_item('0')[:edit]
      edit.wait_until(&:present?)
      edit.click
      $b.tag_selector_edit_name.set 'renamed_click'
      $b.tag_selector_name_validator.click

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present

      ## rename Tag 1 (on another clone)
      $b.clone_info('24')[:star].click

      edit = $b.tag_item('1')[:edit]
      edit.wait_until(&:present?)
      edit.click
      $b.tag_selector_edit_name.set 'renamed_return'
      $b.send_keys :return

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present

      ## check renames (on again another clone)
      $b.clone_info('23')[:star].click
      edit = $b.tag_item('1')[:edit]
      edit.wait_until(&:present?)

      assert ($b.tag_selector.text.include? 'renamed_click'),  "fail edit tag with mouse : tag name in tag selector hasn't changed"
      assert ($b.tag_selector.text.include? 'renamed_return'), "fail edit tag with keyboard : tag name in tag selector hasn't changed"

      $b.tag_selector_close.click
      $b.tag_selector.wait_while_present
    end
  end

  # Not really a test
  def test_zz_close
    close_everything
  end
end

=begin
    TODO
    save_analysis
    clipboard
    edit tag
    change axis scatterplot
    edit name
    change color method
    change color palette
    change scatterplot/graph size
    
    check x/y clone position on scatterplot
    check clone path 
=end
