QUnit.module("Tokeniser", {
});

QUnit.test("tokeniser", function(assert) {
    var tokeniser = new Tokeniser();

    var mock_input = document.createElement('input');
    mock_input.value = "foobar";
    $(mock_input).data('set-id', ":p foobar");

    var token = tokeniser.createToken($(mock_input));
    assert.equal(token.innerText, "foobar", "check whether the token text is correct");

    var mock_div = document.createElement('div');

    tokeniser.tokenise(mock_input, mock_div);
    assert.equal(mock_input.value, "", "check that input value is reset");
    assert.equal($(mock_input).data('set-id'), undefined, "check that input data set-id is reset");


    var mock_div_2 = document.createElement('div');
    var mock_span;
    for(var i = 0; i < 2; i++) {
        mock_span = document.createElement('span');
        mock_span.className = 'set_token';
        mock_span.innerText = i;
        $(mock_span).data('set-id', i);
        mock_div_2.appendChild(mock_span);
    }

    var wrong_span = document.createElement('span');
    $(wrong_span).data('set-id', 'barfoo');
    mock_div_2.appendChild(wrong_span);

    var read = tokeniser.readTokens(mock_div_2);
    assert.equal(read, "0,1", "check whether the token spans are read correctly");
});
