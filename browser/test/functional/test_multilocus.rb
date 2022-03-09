# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestMultilocus < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example.vidjil")

      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
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
    $b.update_icon.wait_while(&:present?)
    assert (clone_name.text == 'renamed_click'), " >> clone name (click) has not changed"

    $b.unselect
  end

  def test_04_rename_clone_by_enter
    sleep 1
    clone_name = $b.clone_info('24')[:name]
    clone_name.double_click

    $b.clone_name_editor.set 'renamed_return'
    $b.send_keys :return
    $b.update_icon.wait_while(&:present?)
    assert (clone_name.text == 'renamed_return'), " >> clone name (return) has not changed"

    $b.unselect
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

  def test_08_click_in_list
    #test select a clone in the list
    $b.clone_in_scatterplot('25').wait_until(&:present?)
    $b.clone_info('25')[:name].click()

    check_when_list_or_scatterplot_clicked

    $b.unselect
    $b.update_icon.wait_while(&:present?)
    assert (not $b.clone_in_list('25').class_name.include? "list_select"), ">> Incorrect class name, clone is not unselected'"
  end


  def test_09_normalize
    $b.clone_info('25')[:star].click
    $b.tag_selector_edit_normalisation.wait_until(&:present?)
    $b.tag_selector_edit_normalisation.set('0.01')
    $b.tag_selector_normalisation_validator.click 
    $b.update_icon.wait_while(&:present?)

    assert ( $b.clone_info('25')[:size].text == '1.000%' ) , ">> fail normalize on : wrong clone size "
    
    $b.menu_settings.click 
    $b.update_icon.wait_while(&:present?)
    $b.radio(:id => 'reset_norm').click
    $b.update_icon.wait_while(&:present?)
    assert ( $b.clone_info('25')[:size].text == '0.129%' ) , ">> fail normalize off : wrong clone size "

    $b.unselect
  end

  def test_12_tag
    begin
      $b.clone_info('25')[:star].click
      name = $b.tag_item('0')[:name]
      name.wait_until(&:present?)
      name.click
      $b.until { not $b.tag_item('0')[:name].present? }

      # Move the mouse elsewhere
      $b.clone_in_scatterplot('77').hover

      $b.until {$b.clone_info('25')[:name].style('color') ==  'rgba(220, 50, 47, 1)' }
    end
  end

  def test_15_smaller_clones
    for i in 0..3
      smaller = $b.list.li(:index => i)

      assert (smaller.text.include?("smaller clonotypes")), "We should have smaller clonotypes at index %d of the list, instead we have %s " % [i, smaller.text]

      assert (smaller.present?), "Smaller clonotypes #%d should be visible, it is not" % [i]
      smaller.hover
      assert (smaller.present?), "Smaller clonotypes #%d should still be visible after hovering it" % [i]

      assert (not $b.clone_in_scatterplot(smaller.id).present?), "Smaller clone %d should not be visible in scatterplot" % [i]
    end
  end

  def test_16_select_unsegmented
    clone_list = ["1", "32", "24", "68"]
    # clone with seg & sequence (1)
    $b.clone_in_scatterplot(clone_list[0]).click
    $b.update_icon.wait_while(&:present?)
    assert ($b.clone_in_segmenter(clone_list[0]).present?), "Clone %s (seg+/seq+) is in segmenter" % clone_list[0]
    
    # clone with seg & not sequence (32)
    $b.clone_in_scatterplot(clone_list[1]).click
    $b.update_icon.wait_while(&:present?)
    assert (not $b.clone_in_segmenter(clone_list[1]).present?), "Clone %s (seg+/seq-) is NOT in segmenter" % clone_list[1]

    # clone without seg & sequence (24)
    $b.clone_in_scatterplot(clone_list[2]).click
    $b.update_icon.wait_while(&:present?)
    assert (not $b.clone_in_segmenter(clone_list[2]).present?), "Clone %s (seg-/seq-) is NOT in segmenter" % clone_list[2]

    # clone without seg & sequence (68)
    $b.clone_in_scatterplot(clone_list[3]).click
    $b.update_icon.wait_while(&:present?)
    assert ($b.clone_in_segmenter(clone_list[3]).present?), "Clone %s (seg-/seq+) is in segmenter" % clone_list[3]
  end

  def test_17_select_clustered
    $b.clone_in_scatterplot('1').click
    $b.clone_in_scatterplot('37').click(:control)
    $b.clone_in_scatterplot('90').click(:control)

    $b.merge.click
    $b.update_icon.wait_while(&:present?)
    assert ($b.clone_in_scatterplot('90').exists?), "Main clone of the cluster should be clone 90"
    assert ($b.clone_in_scatterplot('90', :class => "circle_select").exists?), "Clone should be selected"

    $b.clone_info('90')[:cluster].click
    $b.update_icon.wait_while(&:present?)
    $b.until { $b.clone_in_scatterplot('1', :class => "circle_select").exists?}
    assert ( $b.clone_in_graph('1', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('1').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    assert ( $b.clone_in_scatterplot('37', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('37', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('37').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"
    assert ( $b.clone_in_scatterplot('90', :class => "circle_select").exists?)
    assert ( $b.clone_in_graph('90', :class=> "graph_select").exists?)
    assert ( $b.clone_in_segmenter('90').present? ), ">> fail to add clone to segmenter by clicking on the list or scatterplot"

    $b.clone_in_cluster('90', '1')[:delete].click
    $b.clone_in_cluster('90', '37')[:delete].click

    $b.unselect
    $b.update_icon.wait_while(&:present?)
    assert ($b.clone_in_scatterplot('1').exists?)
    assert ($b.clone_in_scatterplot('37').exists?)
    assert ($b.clone_in_scatterplot('90').exists?)

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


  def test_19_edit_tag
    begin
      $b.clone_in_scatterplot('77').click
      $b.clone_in_scatterplot('25').click(:control)
      $b.clone_in_scatterplot('88').click(:control)
      $b.clone_in_scatterplot('90').click(:control)
      
      ## Test tag selection for one clone
      $b.clone_info('25')[:star].click
      $b.element(:id => 'tagElem_0').click

      # Move the mouse elsewhere
      $b.clone_in_scatterplot('72').hover

      $b.until {$b.clone_info('25')[:name].style('color') ==  'rgba(220, 50, 47, 1)' } # clone 25 should have changed color
      assert ( not $b.clone_info('88')[:name].style('color') ==  'rgba(220, 50, 47, 1)' ) , "clone 88 (second of the selection) haven't chaged color "


      ## Test tag selection for multiple clone
      $b.element(:id => "tag_icon__multiple").click
      $b.element(:id => 'tagElem_6').click
      $b.update_icon.wait_while(&:present?)
      assert ($b.clone_info('25')[:name].style('color') ==  'rgba(211, 54, 130, 1)' ) , "clone 25 have also changed color"
      assert ($b.clone_info('77')[:name].style('color') ==  'rgba(211, 54, 130, 1)' ) , "clone 77 have also changed color"
      assert ($b.clone_info('88')[:name].style('color') ==  'rgba(211, 54, 130, 1)' ) , "clone 88 have also changed color"
    end
  end

  def test_20_menu_palette
    original_color = $b.body.style('background-color')
    dark = $b.menu_item('palette_dark')
    dark.click

    assert ($b.body.style('background-color') != original_color)
    assert ($b.body.style('background-color').include? "51, 51, 51"), "Background should be dark"

    $b.menu_item('palette_light').click

    assert ($b.body.style('background-color') == original_color)
  end

  def test_21_menu_manual
    $b.menu_item('help_manual').click

    assert ($b.window(:title => /user manual/)), "User manual is opened"
    $b.window(:title => /user manual/).use do
      assert ($b.h1(:text => /user manual/).present?), "Make sure the page is loaded"
    end
  end

  def test_22_menu_tutorial
    $b.menu_item('help_tutorial').click

    assert ($b.window(:title => /Mastering the Vidjil web application/)), "Tutorial is opened"
  end

  # Not really a test
  def test_zz_close
    close_everything
  end
end
