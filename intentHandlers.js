
'use strict';

var	AlexaSkill = require('./AlexaSkill'),
	getDataFromSweeper = require('./getDataFromSweeper'),
	textHelper = require('./textHelper'),
	//SQSHelper = require('./SQSHelper'),
	speechText = '';

// customer to gdun mapping:
var CUSTOMERS = {
    'microsoft': '081466849',
    'costco': '103391843',
    'nordstrom': '007942915',
    'pse': '831703157',
    'rei': '009483355',
    'sunguard': '783824670',
	'starbucks': '155366107',
    'intel': '047897855',
    'disney': '932660376',
    'mckesson': '177667227',
    'nbcu': '057156663',
	'gsk': '238980408',
    'providence': '884727413',
    'expedia': '092180517',
    't mobile': '327376653'
};	
	
var registerIntentHandlers = function (intentHandlers) {
	
    intentHandlers.HelloIntent = function (intent, session, response) {
		console.log('entering HelloIntent');
		speechText = 'Hi there';
		tellSpeech(speechText, response);
    };
	
    intentHandlers.OneShotGetDataIntent = function (intent, session, response) {		
        console.log('entering OneShotGetDataIntent');	
		handleOneshotDataRequest(intent, session, response);				
    };
	
    intentHandlers.DialogGetDataIntent = function (intent, session, response) {
		console.log('entering DialogGetDataIntent');
        // Determine if this turn is for customer, for request type, or an error
        // We could be passed slots with values, no slots or slots with no value
        var customerSlot = intent.slots.Customer;
        var dataTypeSlot = intent.slots.DataType;
        if (customerSlot && customerSlot.value) {
            handleCustomerNameDialogRequest(intent, session, response);
        } else if (dataTypeSlot && dataTypeSlot.value) {
            handleDataTypeDialogRequest(intent, session, response);
        } else {
            handleNoSlotDialogRequest(intent, session, response);
        }
    };	

    intentHandlers.SupportedCustomersIntent = function (intent, session, response) {
		console.log('entering SupportedCustomersIntent');
		handleSupportedCustomersRequest(intent, session, response);
    };	
	
    intentHandlers.CountSystemsIntent = function (intent, session, response) {
		console.log('entering CountSystemsIntent');
		countSystems(intent, session, response);
    };	

    intentHandlers['AMAZON.HelpIntent'] = function (intent, session, response) {
            response.ask(textHelper.completeHelp + ' So, how can I help?', 'How can I help?');
    };

    intentHandlers['AMAZON.CancelIntent'] = function (intent, session, response) {
            response.tell('Okay');
    };

    intentHandlers['AMAZON.StopIntent'] = function (intent, session, response) {
            response.tell('Okay');
    };

    intentHandlers['AMAZON.YesIntent'] = function (intent, session, response) {
		console.log('entering YesIntent');
		if (session.attributes.waitMode == true) {
			getFinalResponse(session.attributes.customerInfo, session.attributes.dataType, session, response);
		}
    };	
	
    intentHandlers['AMAZON.NoIntent'] = function (intent, session, response) {
		console.log('entering NoIntent');
        response.tell('Okay, sorry about that.');
    };		
};

/**
 * Handles the dialog step where the user provides a customer name
 */
function handleCustomerNameDialogRequest(intent, session, response) {
	console.log('entering handleCustomerNameDialogRequest function');

    // Determine customer
    var customerInfo = getGdunFromIntent(intent),
        repromptText,
        speechOutput;
		
    if (customerInfo.error) {
        // invalid customer. Move to the dialog by prompting to re-fire DialogGetDataIntent
        repromptText = "Currently, I know information for these customers: " + getAllCustomersText()
            + "Which customer would you like information for?";
        // if we received a value for an unknown customer, repeat it to the user, otherwise we received an empty slot
        speechOutput = customerInfo.customerName ? "I'm sorry, I don't have any data for " + customerInfo.customerName + ". " + repromptText : repromptText;
        response.ask(speechOutput, repromptText);
        return;
    }

    // if we don't have the request type yet, go ask for it. If we have the request type, perform the final request
    if (session.attributes.dataType) {
		session.attributes.customerInfo = customerInfo; // not needed immediately, but set this so we have access to customer name later
        getFinalResponse(customerInfo, session.attributes.dataType, session, response);
    } else {
        // set customerInfo in session and prompt for request type
        session.attributes.customerInfo = customerInfo;
        speechOutput = "What type of information would you like?";
        repromptText = "Would you like inventory, sev ones or service requests for " + customerInfo.customerName + "?";
        response.ask(speechOutput, repromptText);
    }
}

/**
 * Handles the dialog step where the user provides the type of request (inventory, sev 1's or service requests)
 */
function handleDataTypeDialogRequest(intent, session, response) {
	console.log('entering handleDataTypeDialogRequest function');

    // Determine request type (inventory, sev 1's, service requests)
    var reqType = getRequestTypeFromIntent(intent);
    if (reqType.error) {
        // Invalid request type. Prompt for request type which will re-fire DialogGetDataIntent
		var repromptText = " What would you like?"
        speechOutput = "I can provide information on ";
		if (session.attributes.customerInfo) {
			speechOutput += session.attributes.customerInfo.customerName;
		}
		speechOutput += " inventory, sev ones, or service requests." + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }
	
	session.attributes.dataType = reqType; // not needed immediately, but set this so we have access to user's request type later

    // if we don't have a customer name yet, go get it. If we have a customer name/gdun, perform the final request
    if (session.attributes.customerInfo) {
        getFinalResponse(session.attributes.customerInfo, reqType, session, response);
    } else {
        // The user provided the request type but no customer name. Set request type in session and prompt for customer name.
        session.attributes.dataType = reqType;
        speechOutput = "For which customer would you like " + reqType.displayDataType  + " information for?";
        repromptText = "For which customer?";
        response.ask(speechOutput, repromptText);
    }
}

/**
 * Handle no slots, or slot(s) with no values
 */
function handleNoSlotDialogRequest(intent, session, response) {
	console.log('entering handleNoSlotDialogRequest function');
	
    if (session.attributes.customerInfo) {
        // get request type re-prompt
        var repromptText = "Please try again. Would you like inventory, sev ones, or service requests?";
        var speechOutput = repromptText;
        response.ask(speechOutput, repromptText);
    } else {
        // get customer name re-prompt
        handleSupportedCustomersRequest(intent, session, response);
    }
}

/**
 * Handles the case where the user asked for information all at once and deals with any missing information
 */
function handleOneshotDataRequest(intent, session, response) {
	console.log('entering handleOneshotDataRequest function');

    // Determine customer
    var customerInfo = getGdunFromIntent(intent),
        repromptText,
        speechOutput;
		
	session.attributes.customerInfo = customerInfo; // not needed immediately, but set this so we have access to customer name later

	console.log('customerInfo = ' + JSON.stringify(customerInfo));
		
    if (customerInfo.error) {
        // invalid customer. Move to the dialog by prompting to fire DialogGetDataIntent
        repromptText = "Currently, I know information for these customers: " + getAllCustomersText()
            + "Which customer would you like information for?";
        // if we received a value for an unknown customer, repeat it to the user, otherwise we received an empty slot
        speechOutput = customerInfo.customerName ? "I'm sorry, I don't have any data for " + customerInfo.customerName + ". " + repromptText : repromptText;
        response.ask(speechOutput, repromptText);
        return;
    }

    // Determine request type (inventory, sev 1's, service requests)
    var reqType = getRequestTypeFromIntent(intent);
	
	console.log('reqType = ' + JSON.stringify(reqType));	
	
    if (reqType.error) {
        // Invalid request type. Set customer in session and prompt for request type which will fire DialogGetDataIntent
        session.attributes.customerInfo = customerInfo;
		repromptText = " What would you like?";	
        speechOutput = "I can provide information on ";
		if (session.attributes.customerInfo) {
			speechOutput += session.attributes.customerInfo.customerName;
		}	
		speechOutput += " inventory, sev ones, or service requests." + repromptText;
	
        response.ask(speechOutput, repromptText);
        return;
    }
	
	session.attributes.dataType = reqType; // not needed immediately, but set this so we have access to user's request type later

    // all slots filled, either from the user or by default values. Move to final request
    getFinalResponse(customerInfo, reqType, session, response);
}

/**
 * Gets the customer gdun from the intent, or returns an error
 */
function getGdunFromIntent(intent) {
	console.log('entering getGdunFromIntent function');

    var customerSlot = intent.slots.Customer;
	console.log('intent.slots.Customer = ' + JSON.stringify(intent.slots.Customer));
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!customerSlot || !customerSlot.value) {
            return {
                error: true
            }

    } else {
        // lookup the customer
        var customerName = customerSlot.value;
        if (CUSTOMERS[customerName.toLowerCase()]) {
            return {
                customerName: customerName,
                gdun: CUSTOMERS[customerName.toLowerCase()]
            }
        } else {
            return {
                error: true,
                customerName: customerName
            }
        }
    }
}

/**
 * Gets the request type from the intent or returns an error
 */
function getRequestTypeFromIntent(intent) {
	console.log('entering getRequestTypeFromIntent function');

    var dataTypeSlot = intent.slots.DataType;
	console.log('intent.slots.DataType = ' + JSON.stringify(intent.slots.DataType));
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!dataTypeSlot || !dataTypeSlot.value) {

        return {
            error: true		
        }
		
    } else {
		
		if (dataTypeSlot.value != "inventory" && dataTypeSlot.value != "sev ones" && dataTypeSlot.value != "service requests" ) {

			return {
				error: true, 
				displayDataType: dataTypeSlot.value			
			}
		
		} else {
			
			var dataType = dataTypeSlot.value,
				reqDataTypeParam = '';

			// format the request date like YYYYMMDD
			if (dataType == "inventory") {
				reqDataTypeParam = "installbase/";
			} else if (dataType == "sev ones") {
				reqDataTypeParam = "sev1s/";
			} else if (dataType == "service requests") {
				reqDataTypeParam = "srs/";
			}	

			return {
				displayDataType: dataType,
				requestDataTypeParam: reqDataTypeParam			
			}
        }
    }
}

/**
 * Both the one-shot and dialog based paths lead to this method to issue the request, and
 * respond to the user with the information.
 */
function getFinalResponse(customerInfo, reqType, session, response) {
	console.log('entering getFinalResponse function');

	console.log('customerInfo.gdun = ' + customerInfo.gdun);
	console.log('type of customerInfo.gdun = ' + typeof(customerInfo.gdun));
	console.log('reqType.requestDataTypeParam = ' + reqType.requestDataTypeParam);
	console.log('type of reqType.requestDataTypeParam = ' + typeof(reqType.requestDataTypeParam));
	
	getDataFromSweeper.getData(customerInfo.gdun, reqType.requestDataTypeParam, session, function (result) {
		
		if (result.gotData == false) {
			// we don't have the data yet, so ask the user for more time, their response will fire the OkToWaitIntent
			speechText = 'I\'m pulling that information for you, can you give me a few more seconds?';
			var repromptText = 'I\'m ready to try again, OK?';
			// set a flag so that when the user answers yes or no, we know it is in response to the Wait question
			session.attributes.waitMode = true;
			askSpeech(speechText, repromptText, response);
			
		} else { // successfully pulled JSON inventory info
			session.attributes.MsgReceiptHandle = result.MsgReceiptHandle;
			//console.log('JSON inventory data = ' + JSON.stringify(result.dataPayload));
			console.log('completedSweeperJobs message receipt handle for this data = ' + JSON.stringify(session.attributes.MsgReceiptHandle));

			speechText = 'OK, I\'ve got the data. Here are some things I can tell you about: ';
			speechText += 'The number of symmetrix arrays on the floor and the number of data domains. ';
			speechText += 'Would you like to hear about sims or data domains?';			
			var repromptText = 'Which would you like, sims or data domains?';
			
			console.log('made it to here');

			// provide requested information to the user
			askSpeech(speechText, repromptText, response);

		};		
	});		
}

/**
 * Handles the case where the user asked or for which customers they can ask about
 */
function handleSupportedCustomersRequest(intent, session, response) {
	console.log('entering handleSupportedCustomersRequest function');
    // get customer re-prompt
    var repromptText = "Which customer would you like information for?";
    var speechOutput = "Currently, I know information about these customers: " + getAllCustomersText()
        + repromptText;

    response.ask(speechOutput, repromptText);
}

function getAllCustomersText() {
	console.log('entering getAllCustomersText function');
    var customerList = '';
    for (var customer in CUSTOMERS) {
        customerList += customer + ", ";
    }

    return customerList;
}

function tellSpeech(textToSay, response) {
	console.log('entering tellSpeech function');
	console.log('textToSay = ' + textToSay);
	//console.log('response = ' + JSON.stringify(response));
	var speechOutput = {
		speech: '<speak>' + textToSay + '</speak>',
		type: AlexaSkill.speechOutputType.SSML
	};
	response.tell(speechOutput);                 	
};

function askSpeech(textToSay, repromptTextToSay, response) {
	console.log('entering askSpeech function');
	console.log('textToSay = ' + textToSay);
	//console.log('response = ' + JSON.stringify(response));
	var speechOutput = {
		speech: '<speak>' + textToSay + '</speak>',
		type: AlexaSkill.speechOutputType.SSML
	};
	var repromptOutput = {
		speech: '<speak>' + repromptTextToSay + '</speak>',
		type: AlexaSkill.speechOutputType.SSML
    };
	response.ask(speechOutput, repromptOutput);	
};

function countSystems(intent, session, response) {
	console.log('entering countSystems function');
		
	getDataFromSweeper.getData(session.attributes.customerInfo.gdun, session.attributes.dataType.requestDataTypeParam, session, function (result) {
		
		if (result.gotData == false) {
			// we don't have the data yet, so ask the user for more time, their response will fire the OkToWaitIntent
			speechText = 'Hmm, I\'m having further trouble pulling that data, do you want me to try again?';
			var repromptText = 'Would you like me to try again?';
			// set a flag so that when the user answers yes or no, we know it is in response to the Wait question
			session.attributes.waitMode = true;
			askSpeech(speechText, repromptText, response);
			
		} else { // successfully pulled JSON inventory info
			session.attributes.MsgReceiptHandle = result.MsgReceiptHandle;
			//console.log('JSON inventory data = ' + JSON.stringify(result.dataPayload));
			console.log('completedSweeperJobs message receipt handle for this data = ' + JSON.stringify(session.attributes.MsgReceiptHandle));
			
			var system = intent.slots.System.value,
				installBaseData = result.dataPayload,
				productFamily = '';
				
			console.log('system = ' + system);
			console.log('installBaseData = ' + JSON.stringify(installBaseData));
			console.log('installBaseData.rows.length = ' + installBaseData.rows.length);
				
			switch ( system ) {
				case 'Sims':
					productFamily = 'Symmetrix';
					break;
				case 'data domains':
					productFamily = 'Data Domain';
					break;
			}		
			
			var numSystems = getCount(productFamily, installBaseData);  
			
			speechText = 'There are ' + numSystems + ' ' + system + ' installed at ';
			speechText += session.attributes.customerInfo.customerName + '. Would you like to hear some other customer information?';

			var repromptText = 'You can say things like: Get inventory information for Starbucks, or, tell me about any sev ones for Microsoft.';

			// needs to get done, doesn't work yet - delete message with JSON	
			//			SQSHelper.deleteMessage(result.MsgReceiptHandle, function () {
			//				console.log('message delete routine complete');
			//			});	
			
			// reset requestInFlight so the next request will generate a message to Sweeper
			session.attributes.requestInFlight = false;

			// provide requested information to the user
			askSpeech(speechText, repromptText, response);
			
		};		
	});	

	function getCount(productFamily, installBaseData) {
		var count = 0;
		for (var i = 0; i < installBaseData.rows.length; i++) {
			if (installBaseData.rows[i].INSTANCE_PRODUCT_FAMILY == productFamily) {
				count++;
			}
		}
		console.log('system count = ' + count);
		return count;
	}	
};

exports.register = registerIntentHandlers;
