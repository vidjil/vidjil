# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestGraph < BrowserTest

 def setup
    super
    if not defined? $b
      set_browser("/browser/test/data/issues/4495.vidjil", "/browser/test/data/issues/4495.analysis")
      if $b.div(id: 'tip-container').present?
        $b.div(:id => 'tip-container').div(:class => 'tip_1').element(:class => 'icon-cancel').click
      end

      # Make upload menu appear to test the application with this menu too
      $b.execute_script("$('#upload_summary')[0].style.display='block';")
    end
  end


  def after_tests
  end

  ### Issue 4495; Erreurs lors d'un cluster by V; cluster_clone undefined
  def test_00_clusterByV

    $b.element(:id => "cluster_menu").hover
    $b.element(:id => "clusterBy_5").wait_until(&:present?)
    $b.element(:id => "clusterBy_5").click

    $b.update_icon.wait_while(&:present?)

    assert ( $b.clone_info("1")[:name].text == "IGHV3-9"), "after cluster by V, clone 1 is only maned by his seg5 value"
  end


  # Not really a test
  def test_zz_close
    close_everything
  end
end
