# coding: utf-8
require 'watir-webdriver'

class VidjilBrowser < Watir::Browser

  # Return the text field that allows to edit a clone name
  def clone_name_editor
    return text_field(:id => 'new_name')
  end

  # Buttons that allows to save a name change
  def clone_name_saver
    return a(:id => 'btnSave')
  end

  # Return the clone in the list
  def clone_in_list(id, extra={})
    return list.li(extra.merge(:id => id))
  end

  # Return the info on the clone in the list (one item of a list)
  # A hash with keys cluster, system, name, info, star and size defined with
  # the corresponding elements in the list.
  def clone_info(id, extra={})
    clone = clone_in_list(id, extra)
    return {cluster: clone.element(:class => 'clusterBox'), system: clone.element(:class => "systemBox"),
            name: clone.element(:class => 'nameBox'), info: clone.element(:class => 'infoBox'),
            star: clone.element(:class => 'starBox'), size: clone.element(:class => 'sizeBox')}
  end

  # Return the clone cluster for clone ID
  def clone_cluster(id, extra = {})
    return clone_in_list(id, extra).element(:id => 'cluster'+id)
  end

  # Return the n-th clone in a cluster for clone ID
  # n: a str (starting at 1)
  def clone_in_cluster(id, n, extra = {})
    cluster = clone_cluster(id, extra).element(:id => '_'+n)
    return {object: cluster,
            name: cluster.element(:class => 'nameBox'), size: cluster.element(:class => 'sizeBox'),
            info: cluster.element(:class => 'infoBox'), delete: cluster.element(:class => 'delBox')}
  end

  # Return a hash with information on the sequence in the segmenter
  # A hash with keys name, star and size defined with
  # the corresponding elements in the segmenter.
  def clone_info_segmenter(id, extra={})
    item = clone_in_segmenter(id, extra)
    return {name: item.element(:class => 'nameBox'), star: item.element(:class => 'starBox'),
            size: item.element(:class => 'sizeBox')}
  end


  # Return the clone on the scatterplot
  # Beware the id must be a string
  def clone_in_scatterplot(id, extra={})
    return element(extra.merge(:id => "circle"+id))
  end

  # Return the clone in the graph
  # Beware the id must be a string
  def clone_in_graph(id, extra={})
    return element(extra.merge(:id => "polyline"+id))
  end

  # Return the item of clone id in segmenter (may not exist…)
  # Beware the id must be a string
  def clone_in_segmenter(id, extra={})
    return element(extra.merge(:id => 'seq'+id))
  end

  # Change the coloration
  def color_by(dimension)
    menu_color.select_list.select dimension
  end

  # Return an associative array (keys name, and value) for the following external data
  def external_data(id)
    item = element(:id => 'data_'+id)
    return {name: item.element(:class => 'data_name').text,
            value: item.element(:class => 'data_value').text.to_f}
  end

  # Return the div of the graph component
  def graph(extra = {})
    return element(extra.merge(:class => 'graph', :id => 'visu2'))
  end

  # Return the x legend of the graph (id is a string from 0 to the number of samples - 1)
  def graph_x_legend(id, extra = {})
    return graph.element(extra.merge(:id => 'time'+id))
  end

  # Information on the currently displayed point
  def info_point
    return element(:id => 'info_point')
  end

  def info_segmented
    return element(:id => 'info_segmented').span(:index => 1)
  end

  def info_selected_locus
    return element(:id => 'info_selected_locus').span(:index => 1)
  end

  # Return the div containing the information (status bar)
  def infoline
    return div(:id => 'bot-container').div(:class => 'focus')
  end

  # Return the span of the locus
  def locus_topleft(locus)
       return span(:class => 'systemBoxNameMenu', :class => locus)
  end

  def menu_patient
    return div(:id => 'db_menu')
  end

  def menu_import_export
    return div(:id => 'demo_file_menu')
  end

  def menu_cluster
    return div(:id => 'cluster_menu')
  end

  def menu_analysis
    return div(:id => 'analysis_menu')
  end

  def menu_color
    return div(:id => 'color_menu')
  end

  def menu_filter
    return div(:id => 'filter_menu')
  end
  
  def menu_settings
    return div(:id => 'settings_menu')
  end

  def menu_item_export_fasta
    menu = menu_import_export
    menu.click
    return menu.a(:id => 'export_fasta')
  end

  def merge
    return element(:id => 'merge')
  end

  def select_tag(id, extra={})
    return element(extra.merge(:id => 'fastTag'+id))
  end

  # Return the element corresponding to the x axis of the scatterplot
  def scatterplot_x
    return scatterplot('x')
  end

  # Return the element corresponding to the legend of the x axis of the scatterplot
  def scatterplot_x_legend(index)
    return scatterplot_legend('x', index)
  end

  # Return the element corresponding to the x axis of the scatterplot
  def scatterplot_y
    return scatterplot('y')
  end

  # Return the element corresponding to the legend of the y axis of the scatterplot
  def scatterplot_y_legend(index)
    return scatterplot_legend('y', index)
  end

  # Return the span containing elements of the sequence in the scatterplot
  def sequence(id)
    return element(:id => 'm'+id)
  end

  # Return the V sequence of the clone id
  def sequence_V(id)
    return sequence(id).element(:class => 'V')
  end

  # Return the N1 sequence of the clone id
  def sequence_N1(id)
    return sequence(id).element(:class => 'N', :index => 0)
  end

  # Return the N2 sequence of the clone id
  def sequence_N2(id)
    return sequence(id).element(:class => 'N', :index => 1)
  end

  # Return the D sequence of the clone id
  def sequence_D(id)
    return sequence(id).element(:class => 'D')
  end

  # Return the J sequence of the clone id
  def sequence_J(id)
    return sequence(id).element(:class => 'J')
  end

  # Return the div containing stats information on selected clone(s)
  def statsline
    div(:id => 'bot-container').div(:class => 'stats')
  end

  # Return an item from a tag selector split in a hash.
  # The hash contains the following keys:
  def tag_item(id)
    ts = tag_selector
    return {color: ts.span(:class => 'tagColor'+id),
            name: ts.span(:class => 'tagName'+id),
            edit: ts.li(:index => id.to_i).span(:class => 'edit_button')}
  end
  
  # Return the select containing the preset selector in the graph
  def preset_selector
    return select_list(:class => 'axis_select_preset_select')
  end

  # Return the div containing the tag selector
  def tag_selector
    return div(:class => 'tagSelector')
  end

  # Return the close button for tag selector
  def tag_selector_close
    return tag_selector.span(:class => 'closeButton')
  end

  # Return the field for editing tag name in the tag selector
  def tag_selector_edit_name
    return tag_selector.text_field(:id => 'new_tag_name')
  end

  # Return the field for editing tag name in the tag selector
  def tag_selector_edit_normalisation
    return tag_selector.text_field(:id => 'normalized_size')
  end

  # Return the button that validates the changes in the tag selector
  def tag_selector_name_validator
    return tag_selector.a(:id => 'btnSaveTag')
  end

  # Return the button that validates the changes in the tag selector
  def tag_selector_normalisation_validator
    return tag_selector.button(:text => 'ok')
  end

  # Unselect everything, both on clones, and move away from menus (as if we click on the back)
  def unselect
    $b.execute_script('m.unselectAll()')
    $b.execute_script('showSelector("x")')
  end
  
  # Return the div of the list of clones
  def list
    return div(:id => 'list_clones')
  end
  
  private
  
  def scatterplot(axis)
    return element(:id => 'visu_axis_'+axis+'_container')
  end

  def scatterplot_legend(axis, index)
    return scatterplot(axis).element(:class => 'sp_legend', :index => index)
  end


end
