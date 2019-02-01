# coding: utf-8
load 'vidjil_browser.rb'
load 'browser_test.rb'

#browser test suite
class TestNormalization < BrowserTest

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


    def test_00_normalization_none
        $b.element(:id => 'settings_menu').click
        assert ($b.form(:id => 'normalize_list').present?), "After clicking normalize_list form should be visible"
        assert ($b.input(:id => 'reset_norm').present?), "Form have the input for reset normalization"
        $b.clone_in_list('25').hover # Just put the mouse somewhere else to close the menu
     end


    def test_01_normalization_expected
        assert ($b.clone_info('25')[:size].text == '0.129%'), "Span show correct size before normalization"

        $b.clone_info('25')[:star].click
        $b.tag_selector_edit_normalisation.set '0.1'
        $b.send_keys :enter
        
        assert ($b.clone_info('25')[:size].text == '10.00%'), "Span show correct normalized size"

        $b.menu_settings.click
        assert ($b.form(:id => 'normalize_list').present?), "After clicking normalize_list form should be visible"
        assert ($b.div(:id => 'normalizetest25').present?), "Form have the input for expected normalization"
        
        $b.input(:id => 'reset_norm').click
        $b.send_keys :escape
        
        assert ($b.clone_info('25')[:size].text == '0.129%'), "Span show correct size after reset normalization"
    end


    def test_02_normalization_external
        assert ($b.clone_info('1')[:size].text == '0.081%'), "Span show correct size after reset normalization"
        
        $b.menu_settings.click
        assert ($b.form(:id => 'normalize_list').present?), "After clicking normalize_list form should be visible"
        assert ($b.div(:id => 'normalize_external').present?), "Form have the input for external normalization"
        assert ($b.div(:id => 'normalizetest25').present?), "Form still have the input for expected normalization"
        
        $b.div(:id => 'normalize_external').click
        
        assert ($b.clone_info('1')[:size].text == '0.122%'), "Span should show correct normalized size (external) (" + $b.clone_info('1')[:size].text+")"
    end


    def test_zz_close
       close_everything
    end


end
