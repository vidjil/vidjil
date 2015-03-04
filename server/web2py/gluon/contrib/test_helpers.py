def form_postvars(tablename, fields, request, action="create", 
        record_id=None):
    """
    Creates the appropriate request vars for forms
    """

    vars = {}
    for field_name in fields:
        vars[field_name] = fields[field_name]
    if action == "create":
        vars["_formname"] = tablename + "_" + action
    elif action == "update":
        vars["_formname"] = tablename + "_" + str(record_id)
        vars["id"] = record_id
    elif action == "delete":
        vars["_formname"] = tablename + "_" + str(record_id)
        vars["id"] = record_id
        vars["delete_this_record"] = True
    elif action:
        vars["_formname"] = action

    request['vars'].update(vars)
    request['post_vars'].update(vars)