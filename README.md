This is a fork of winston-rsyslog-cee, but it sends directly to syslog instead of using winston.

# Install

`npm install rsyslog-cee`

`yarn add rsyslog-cee`

# Options

```javascript
    // import {Logger} from 'winston-rsyslog-cee'; OR
    const Logger = require('winston-rsyslog-cee').Logger;

    const oLogger = new Logger(
        {
            service: 'Whatever', // The App Name for Syslog
            console: true,       // Output logs to console
            syslog:  true        // Output logs to syslog
        }
    );

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
```

