const _ = require('lodash');
const debug = require('debug')('log4js:apm');
const os = require('os');
const apm = require('elastic-apm-node').start({
    serviceName: 'LOG4JS-NODE-APM',
    secretToken: process.env.ELASTIC_APM_SERVER_TOKEN || '',
    serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200'
});

const defaultVersion = 1;
const defaultExtraDataProvider = loggingEvent => {
    if (loggingEvent.data.length > 1) {
        const secondEvData = loggingEvent.data[1];
        if (_.isPlainObject(secondEvData)) {
            return { fields: secondEvData };
        }
    }
    return {};
};

function ElasticAMP(config, layout, logError) {
    const extraDataProvider = _.isFunction(config.extraDataProvider)
        ? config.extraDataProvider
        : defaultExtraDataProvider;

    function log(loggingEvent) {
        const oriLogObject = {
            '@version': defaultVersion,
            '@timestamp': (new Date(loggingEvent.startTime)).toISOString(),
            'host': os.hostname(),
            'level': loggingEvent.level.levelStr.toUpperCase(),
            'category': loggingEvent.categoryName,
            'message': layout(loggingEvent)
        };
        const extraLogObject = extraDataProvider(loggingEvent) || {};
        const logObject = _.assign(oriLogObject, extraLogObject);
        apm.setTransactionName(loggingEvent.categoryName);
    }


    log.shutdown = cb => { };

    debug('Appender has been set.');
    return log;
}

function configure(config, layouts, logError = console.error) {
    let layout = layouts.dummyLayout;
    if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
    }
    return ElasticAMP(config, layout, logError);
}

module.exports.configure = configure;