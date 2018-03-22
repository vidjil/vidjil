QUnit.module("Tokeniser", {
});

QUnit.test("tokeniser", function(assert) {
    var mock_div = document.createElement('div');
    mock_div.id = "mock_div"
    var mock_target = document.createElement('input');
    var tokeniser = new Tokeniser(mock_div, mock_target);

    var token_value = ":p foobar"

    var token = tokeniser.createToken(token_value);
    assert.equal(token.innerText, "foobar", "check whether the token text is correct");

    tokeniser.tokenise(token_value);

    assert.equal(mock_target.value, token_value, "check whether input field is populated");
    var token_span = $(mock_div).find('span');
    assert.equal(token_span.length, 1, 'check whether the token span was created properly');

    var mock_span;
    for(var i = 0; i < 2; i++) {
        mock_span = document.createElement('span');
        mock_span.className = 'set_token';
        mock_span.innerText = i;
        $(mock_span).data('set-id', i);
        mock_div.appendChild(mock_span);
    }

    var wrong_span = document.createElement('span');
    $(wrong_span).data('set-id', 'barfoo');
    mock_div.appendChild(wrong_span);

    var read = tokeniser.readTokens();
    assert.equal(read, ":p foobar|0|1", "check whether the token spans are read correctly");
});
