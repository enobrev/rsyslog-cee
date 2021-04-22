const oMeta = { '--ms': 25.944579999893904,
    '--i': 6,
    '--summary': true,
    '--span':
    { _format: 'SSFSpan.DashedTrace',
        version: 1,
        start_timestamp: '2018-07-13T03:32:48.669Z',
        end_timestamp: '2018-07-13T03:32:48.695Z',
        service: 'Icon',
        indicator: false,
        metrics: '{"_REQUEST":{"range":25.944579999893904,"count":1,"average":25.944579999893904},"FileCache.read._checkDb":{"range":19.47652900032699,"count":1,"average":19.47652900032699},"FileCache.read._checkLocal":{"range":0.3281269986182451,"count":1,"average":0.3281269986182451},"response":{"range":2.482498999685049,"count":1,"average":2.482498999685049}}',
        name: 'Icon By Id',
        tags: undefined,
        context: {} } };

const oMetaWithError = { '--ms': 25.944579999893904,
    '--i': 6,
    '--summary': true,
    '--span':
        { _format: 'SSFSpan.DashedTrace',
            version: 1,
            start_timestamp: '2018-07-13T03:32:48.669Z',
            end_timestamp: '2018-07-13T03:32:48.695Z',
            service: 'Icon',
            indicator: false,
            metrics: '{"_REQUEST":{"range":25.944579999893904,"count":1,"average":25.944579999893904},"FileCache.read._checkDb":{"range":19.47652900032699,"count":1,"average":19.47652900032699},"FileCache.read._checkLocal":{"range":0.3281269986182451,"count":1,"average":0.3281269986182451},"response":{"range":2.482498999685049,"count":1,"average":2.482498999685049}}',
            error: new Error('test'),
            name: 'Icon By Id',
            tags: undefined,
            context: {} } };

const Logger = require('../dist/index').Logger;

const oLogger = new Logger({service: 'Test', console: true, syslog: true, cee: false});
oLogger.d('Icon.Summary', oMeta);
const oLogger2 = new Logger({service: 'Test', console: true, syslog: true, cee: true});
oLogger2.d('Icon.Summary', oMeta);