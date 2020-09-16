# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestList < BrowserTest

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

    # declare variables
    $lock      = $b.listLock()
    $listClone = $b.list()

    # tester la presence du lock
    assert ( $lock.attribute_value("class") == "icon-lock-1 list_lock_on"), "lock start in good state (locked)"
    assert ( $lock.attribute_value("title") == "Release sort as '-' on sample diag"), "lock title start by showing 'release xxx'"
    # print $lock.attribute_value("title")   #     Release sort as '-' on sample diag

    # change order by 'size'
    $b.select(:id => 'list_sort_select').click
    $b.send_keys :arrow_down
    $b.send_keys :enter
    $b.update_icon.wait_while(&:present?)

    assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title start by showing 'release xxx'"

    # tester l'ordre des clones
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    $b.div(:id => "left-container").click # get out of the select list
  end


  def test_01_xxx
    # Change sample (-> fu1); order should still the same
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    # list should show '-' as sort option
    # todo !!!
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title still showsame message"
  end

  def test_02_xxx
    # Lock off
    $lock.click
    assert ( $lock.attribute_value("class") == "icon-lock-open list_lock_off"), "lock in good state after click (unlocked)"
    # print "\n"+$lock.attribute_value("title")+"\n"
    assert ( $lock.attribute_value("title") == "Freeze list as '-' on sample fu1"), "lock title show correct effet if click in icon (freeze, size, fu1)"
    # Clone order should NOT have changed (as sort is now '-')
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"

    # change order by 'size'
    $b.select(:id => 'list_sort_select').click
    $b.send_keys :arrow_down
    $b.send_keys :enter
    $b.update_icon.wait_while(&:present?)
    # Clone order should have changed (sort 'size')
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_7" ), "opening; correct id of the first element (clone other)"
    
    $lock.click # remove lock
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_7" ), "opening; correct id of the first element (clone other)"
    $b.div(:id => "left-container").click # get out of the select list
  end


  def test_03_xxx
    
    # Change sample (-> diag)
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    # clone order
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    assert ( $lock.attribute_value("title") == "Freeze list as 'size' on sample diag"), "lock title show correct effet if click in icon (freeze, size, diag)"
    
  end


  def test_04_xxx
    # Lock again
    $lock.click
    $b.update_icon.wait_while(&:present?)
    assert ( $lock.attribute_value("class") == "icon-lock-1 list_lock_on"), "lock in good state after second click (locked)"
    assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title showing 'release ...'size' ... diag'"
    # Change sample (-> fu1)
    $b.send_keys :arrow_right
    $b.update_icon.wait_while(&:present?)
    assert ( $lock.attribute_value("title") == "Release sort as 'size' on sample diag"), "lock title showing 'release ...'size' ... diag'"

    # Clone order should be as in case 1
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  end

  def test_05_xxx
    # Change sort method (size => V/5')
    $b.select(:id => 'list_sort_select').click
    $b.send_keys :arrow_down
    $b.send_keys :arrow_down
    $b.send_keys :enter
    $b.update_icon.wait_while(&:present?)

    # Lock should be open
    assert ( $lock.attribute_value("class") == "icon-lock-1 list_lock_on"), "lock in good state after change of sort method (locked)"
    assert ( $lock.attribute_value("title") == "Release sort as 'V/5'' on sample fu1"), "lock title showing 'release ...'V/5'' ... diag'"
    
    # clone list should be cha
    l0 = $listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
