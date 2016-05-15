
'use strict';
var AskForDataModule = require('./askForData');

exports.handler = function (event, context) {
	//console.log('event = ' + JSON.stringify(event));
	//console.log('context = ' + JSON.stringify(context));
    var askForData = new AskForDataModule();
    askForData.execute(event, context);
};
