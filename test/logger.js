"use strict";

const Logger = require('../dist/Logger').default;

const oLogger = new Logger({service: 'Test', console: true, syslog: true});
const oTimer = oLogger.startTimer('Test');

setTimeout(function() {
    oLogger.dt(oTimer);
    oLogger.removeSyslog();
}, 1000);

oLogger.d('Debug');
oLogger.w('Warn');
oLogger.i('Info');
oLogger.n('Notice');
oLogger.e('Error');
oLogger.c('Critical');
oLogger.a('Alert');
oLogger.em('Emergency');