
'use strict';
//var storage = require('./storage'),
    //textHelper = require('./textHelper');

var registerEventHandlers = function (eventHandlers) {
    eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    };

    eventHandlers.onLaunch = function (launchRequest, session, response) {	
		handleWelcomeRequest(response);		
    };
	
	function handleWelcomeRequest(response) {
		var whichCustomerPrompt = "Which customer would you like information for?",
			speechOutput = {
				speech: "<speak>Hi there. I can provide quick customer info on the go. "
					+ whichCustomerPrompt
					+ "</speak>",
				type: AlexaSkill.speechOutputType.SSML
			},
			repromptOutput = {
				speech: "I can lead you through providing a customer name and "
					+ "what type of data you are looking for, "
					+ "or you can simply talk to E M C ask a question like, "
					+ "Get inventory information for Starbucks, or, tell me about any sev ones for Microsoft. "
					+ "For a list of supported customers, ask what customers are supported. "
					+ whichCustomerPrompt,
				type: AlexaSkill.speechOutputType.PLAIN_TEXT
			};

		response.ask(speechOutput, repromptOutput);
	}	
	
};
exports.register = registerEventHandlers;
