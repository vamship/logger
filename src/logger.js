'use strict';

const _pino = require('pino');
const { argValidator: _argValidator } = require('@vamship/arg-utils');

const EMPTY_FUNC = () => {};
const LOG_LEVELS = [
    'silent',
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
];
const MOCK_LOGGER = LOG_LEVELS.reduce((result, level) => {
    result[level] = EMPTY_FUNC;
    return result;
}, {});
MOCK_LOGGER.child = () => MOCK_LOGGER;
MOCK_LOGGER.__isMock = true;

let _isInitialized = false;
let _isMockEnabled = false;
let _logger = null;

/**
 * Utility module that provides a very lightweight abstraction over a logger
 * component. This allows a consistent initialization and usage pattern for
 * loggers irrespective of the underlying logger implementation.
 *
 * This module also provides useful functionality for muting and unmuting logs.
 *
 * @module logger
 */
module.exports = {
    /**
     * Re enables logging by undoing the actions performed by
     * [enableMock()]{@link module:logger.enableMock}. Invoking this method will
     * only impact newly created logger instances, and will have no impact on
     * logger objects that have been created in the past.
     *
     * This method is primarily intended for debugging/testing purposes.
     */
    disableMock: function () {
        _isMockEnabled = false;
    },

    /**
     * Forces the logger provider to generate mock loggers that do not
     * perform any real logging.
     *
     * This method is primarily intended for debugging/testing purposes where
     * log messages may have to be suppressed.
     */
    enableMock: function () {
        _isMockEnabled = true;
    },

    /**
     * Configures global logger settings, including application name and other
     * metadata parameters that will be applied to all log messages. This
     * method must be invoked before any calls to
     * [getLogger()]{@link module:logger.getLogger} in order to
     * ensure that all logger instances are configured correctly.
     *
     * @param {String} name The name to assign to the root logger. This is
     *        typically the application name.
     * @param {Object} [options] A set of logger specific configuration
     *        parameters.
     * @param {String} [options.level='info'] The log level filter assigned to
     *        the logger object.
     * @param {Boolean} [options.extreme=true] When enabled, optimizes the
     *        logger for speed by buffering messages and writing them in larger
     *        chunks. See [this link]{@link https://github.com/pinojs/pino/blob/master/docs/extreme.md}
     *        for more information.
     * @param {String|Object} [options.destination='process.stdout'] Determines
     *        the destination to which log output will be written. If omitted,
     *        the destination will be defaulted to 'process.stdout'.
     *        This can be specified either as a string (file name), or a
     *        writable object. The following strings have special meaning:
     *        'process.stdout': The output will be written to STDOUT
     *        'process.stderr': The output will be written to STDERR
     * @param {Object} [options.serializers={}] Specifies serializers that can
     *        be used to process log data before writing it to the target
     *        stream(s). If omitted, no special serializers will be applied.
     * @param {Object} [options.redact=[]] A list of optional redactions to
     *        apply to the output of the logger.
     *
     *
     * @return {module:logger} A reference to the current module, allowing for
     *         chaining of method calls.
     */
    configure: function (name, options) {
        _argValidator.checkString(name, 1, 'Invalid name (arg #1)');

        options = Object.assign({}, options);
        if (!_argValidator.checkEnum(options.level, LOG_LEVELS)) {
            options.level = 'info';
        }
        if (!_argValidator.checkBoolean(options.extreme)) {
            options.sync = false;
        }
        if (!_argValidator.checkObject(options.serializers)) {
            options.serializers = {};
        }
        if (!_argValidator.checkArray(options.redact)) {
            options.redact = [];
        }

        if (_isInitialized) {
            // Already initialized. Do nothing.
            return module.exports;
        }

        const destMapper = options.extreme ? _pino.extreme : _pino.destination;

        let destination = undefined;

        if (_argValidator.checkObject(options.destination)) {
            destination = options.destination;
        } else if (options.destination === 'process.stdout') {
            destination = destMapper(1);
        } else if (options.destination === 'process.stderr') {
            destination = destMapper(2);
        } else if (_argValidator.checkString(options.destination)) {
            destination = destMapper(options.destination);
        } else {
            destination = destMapper(1);
        }

        _logger = _pino(
            {
                name,
                level: options.level,
                serializers: options.serializers,
                redact: options.redact,
            },
            destination
        );

        _isInitialized = true;

        return module.exports;
    },

    /**
     * Returns a preconfigured logger for the specified module.
     *
     * @param {String} group The name of the logger group. This typically
     *        identifies the module for which the logger will be returned.
     * @param {Object} [props={}] Optional properties to be added to the logger
     *        metadata. Each of these properties will be included with all log
     *        statements.
     * @return {Object} A logger object that can be used for logging. If the
     *         logger is not already configured using the
     *         [configure()]{@link module:logger.configure()} method, this
     *         object will be a mock object that supports the logging methods,
     *         but does not actually perform any logging.
     */
    getLogger: function (group, props) {
        _argValidator.checkString(group, 1, 'Invalid group (arg #1)');
        if (!_isInitialized || _isMockEnabled) {
            // Already initialized. Return mock logger.
            return MOCK_LOGGER;
        }
        const loggerProps = Object.assign({}, props, {
            group,
        });

        const child = _logger.child(loggerProps);
        return child;
    },
};
