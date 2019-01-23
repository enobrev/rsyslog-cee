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
oLogger.e('Error', {test: 'Error!', error: new Error('Test Error!')});
oLogger.c('Critical', {test: 'Critical!', error: new Error('Test Error!')});
oLogger.a('Alert', {test: 'Hey!', error: new Error('Test Error!')});
oLogger.em('Emergency', {test: 'OMGWTF!!', error: new Error('Test Error!')});