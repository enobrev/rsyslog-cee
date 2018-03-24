"use strict";

const Logger = require('../dist/index').Logger;

const oLogger = new Logger({service: 'Test', console: true, syslog: true});
const oTimer = oLogger.startTimer('Test');

setTimeout(function() {
    oLogger.dt(oTimer);
    oLogger.removeSyslog();
}, 1000);

oLogger.d('Debug', {test: 'Debugging'});
oLogger.w('Warn', {test: 'Warning'});
oLogger.i('Info', {test: 'Information'});
oLogger.n('Notice', {test: 'Notification'});
oLogger.e('Error', {test: 'Error!'});
oLogger.c('Critical', {test: 'Critical!'});
oLogger.a('Alert', {test: 'Hey!'});
oLogger.em('Emergency', {test: 'OMGWTF!!'});