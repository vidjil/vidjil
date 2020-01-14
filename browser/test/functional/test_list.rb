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
    sleep 1
    # tester la presence du lock
    lock = $b.listLock()
    assert ( lock.attribute_value("class") == "icon-lock-1"), "lock start in good state (locked)"

    # tester l'ordre des clones
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
  end


  def test_01_xxx
    # cahnger de sample, verifier que l'ordre est rester le meme
    $b.send_keys :arrow_right
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
  end

  def test_02_xxx
    # Enlever le lock
    lock = $b.listLock()
    lock.click
    assert ( lock.attribute_value("class") == "icon-lock-open"), "lock in good state after click (unlocked)"
    # verifier que l'ordre a déjà changer (automatique sort)
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_4" ), "opening; correct id of the first element"
    
  end


  def test_03_xxx
    
    # changer de sample
    $b.send_keys :arrow_right
    sleep 0.1
    # verifier que l'ordre est redevenu celui du cas 1
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  end


  def test_04_xxx
    # verouiller de nouveau
    lock = $b.listLock()
    lock.click
    assert ( lock.attribute_value("class") == "icon-lock-1"), "lock in good state after second click (locked)"
    # changer de sample
    $b.send_keys :arrow_right
    sleep 0.1
    # verifier que l'ordre est rester le cas 1
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  end

  def test_05_xxx
  #   # tester de changer la valeur de la methode (size => V/5')
    $b.select(:id => 'list_sort_select').click
    $b.send_keys :arrow_down
    $b.send_keys :arrow_down
    $b.send_keys :enter
    sleep 0.1

    lock = $b.listLock()
    # verifier que le lock est bien levé
    assert ( lock.attribute_value("class") == "icon-lock-open"), "lock in good state after change of sort method (unlocked)"
    # voir qu'il y a bien une reorganisation de la liste
    
    listClone = $b.list()  
    l0 = listClone.div(index: 0)
    assert ( l0.id == "listElem_0" ), "opening; correct id of the first element"
    
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
