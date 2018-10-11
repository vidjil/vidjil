
function Notification(m) {
    this.m = m;
}



Notification.prototype = {

    parse_notification: function (result) {
        var messages;

        try {
	    messages = JSON.parse(result);
	    var header_messages = [];
	    var login_messages = [];
	    for (var i = 0; i < messages.length; ++i) {
                if (messages[i].notification.message_type == 'header') {
		    header_messages.push(messages[i]);
                } else if (messages[i].notification.message_type == 'login') {
		    login_messages.push(messages[i]);
		}
	    }

	    //TODO see if we can remove this hard coupling to classes
	    var hm = $('#header_messages');
	    this.integrateMessages(hm, header_messages);

	    var lm = $('#login_messages');
	    this.integrateMessages(lm, login_messages);

        } catch (err) {
	    console.log("Notification Error: " + err);
        }
    },

    integrateMessages: function(elem, messages, classNames) {
	var message, preformat;
	// empty container because prototype is destined to be called periodically
	elem.empty();

	//set default classes if they are undefined
	classNames = classNames === undefined ? {'urgent': 'urgent_message', 'info': 'info_message'} : classNames;

	if (messages.length > 0) {
	    for (var i=0; i < messages.length; ++i) {

                display_title = ""
                if (messages[i].notification.message_type == 'login')
                {
                    display_title += messages[i].notification.creation_datetime.split(' ')[0] + ' : '
                }
                display_title += messages[i].notification.title

		message = document.createElement('div');
		message.className = classNames[messages[i].notification.priority] + " notification";
		$(message).attr('onclick', "db.call('notification/index', {'id': '" + messages[i].notification.id + "'})");

                // message is sanitized by the server so we unescape the string to include links and formatting
		$(message).append(document.createTextNode(unescape(display_title)));
		elem.append(message);
	    }
	    elem.fadeIn();
	} else {
	    // No messages to display so hide message container
	    elem.fadeOut();
	}
    }
}
