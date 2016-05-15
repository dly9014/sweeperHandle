
'use strict';
var AlexaSkill = require('./AlexaSkill'),
    eventHandlers = require('./eventHandlers'),
    intentHandlers = require('./intentHandlers');

var APP_ID = undefined;//replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * AskForDataModule is a child of AlexaSkill.
 */
var AskForDataModule = function () {
    AlexaSkill.call(this, APP_ID);
};


// Extend AlexaSkill
AskForDataModule.prototype = Object.create(AlexaSkill.prototype);
AskForDataModule.prototype.constructor = AskForDataModule;

eventHandlers.register(AskForDataModule.prototype.eventHandlers);
intentHandlers.register(AskForDataModule.prototype.intentHandlers);

module.exports = AskForDataModule;

