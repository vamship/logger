import _pino, { DestinationStream, redactOptions, LogFn } from 'pino';
import { argValidator as _argValidator } from '@vamship/arg-utils';
import process from 'process';

/**
 * Interface for serializer functions that can be used to serialize objects in
 * logged data into something more readable.
 *
 * @param value The value to serialize.
 * @return The serialized value.
 */
/* eslint-disable-next-line tsel/no-explicit-any */
export type ObjectSerializer = (value: any) => any;

/**
 * Interface for logger objects.
 */
export interface ILogger {
    /**
     * Trace logger method.
     */
    trace: LogFn;

    /**
     * Debug logger method.
     */
    debug: LogFn;

    /**
     * Info logger method.
     */
    info: LogFn;

    /**
     * Warn logger method.
     */
    warn: LogFn;

    /**
     * Error logger method.
     */
    error: LogFn;

    /**
     * Fatal logger method.
     */
    fatal: LogFn;

    /**
     * Child method.
     */
    child: (props: Record<string, unknown>) => ILogger;
}

/**
 * Configuration properties for the logger.
 */
export interface ILoggerOptions {
    /**
     * The log level filter assigned to the logger object. Defaults to 'info'.
     */
    level?: string;

    /**
     * When enabled, optimizes the logger for speed by buffering messages and
     * writing them in larger chunks. See
     * [this link]{@link https://github.com/pinojs/pino/blob/master/docs/extreme.md}
     * for more information. Defaults to true.
     */
    extreme?: boolean;

    /**
     * Determines the destination to which log output will be written. If
     * omitted, the destination will be defaulted to 'process.stdout'.  This can
     * be specified either as a string (file name), or a writable object. The
     * following strings have special meaning:
     * - 'process.stdout': The output will be written to STDOUT
     * - 'process.stderr': The output will be written to STDERR
     * Defaults to process.stdout
     */
    destination?: DestinationStream | string;

    /**
     * Specifies serializers that can be used to serialize log data before
     * writing it to the target stream(s). If omitted, no special serializers
     * will be applied.
     */
    serializers?: Record<string, ObjectSerializer>;

    /**
     * A list of optional redactions to apply to the output of the logger
     */
    redact?: string[] | redactOptions | undefined;
}

type MockLogger = ILogger & { __isMock: boolean };

const EMPTY_FUNC: LogFn = () => undefined;
const LOG_LEVELS = [
    'silent',
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
];

const MOCK_LOGGER: MockLogger = {
    trace: EMPTY_FUNC,
    debug: EMPTY_FUNC,
    info: EMPTY_FUNC,
    warn: EMPTY_FUNC,
    error: EMPTY_FUNC,
    fatal: EMPTY_FUNC,
    child: () => MOCK_LOGGER,
    __isMock: true,
};

/**
 * Utility class that provides the ability to obtain a logger component. This
 * allows a consistent initialization and usage pattern for loggers irrespective
 * of the underlying logger implementation.
 *
 * The manager can be used to mute and unmute loggers.
 */
export class LogManager {
    private _logger: ILogger;
    private _isMockEnabled: boolean;

    /**
     * Initializes a new instance of the LogManager class.
     */
    constructor() {
        this._isMockEnabled = true;
        this._logger = MOCK_LOGGER;
    }

    private _getDestination(options: ILoggerOptions): DestinationStream {
        if (_argValidator.checkObject(options.destination)) {
            return options.destination as DestinationStream;
        }

        if (options.destination === 'process.stdout') {
            return _pino.destination({
                fd: process.stdout.fd,
                sync: !options.extreme,
            });
        }

        if (options.destination === 'process.stderr') {
            return _pino.destination({
                fd: process.stderr.fd,
                sync: !options.extreme,
            });
        }

        if (_argValidator.checkString(options.destination as string)) {
            return _pino.destination({
                dest: options.destination,
                sync: !options.extreme,
            });
        }
        return _pino.destination({
            fd: process.stdout.fd,
            sync: !options.extreme,
        });
    }

    /**
     * Initializes and configures global settings for the log manager, including
     * application name and other metadata parameters that will be applied to
     * all log messages. This method must be invoked before a useful logger is
     * returned by the {@link LogManager.getLogger()|getLogger()} method.
     *
     * @param name The name to assign to the root logger. This is typically the
     * application name.
     *
     * @param [options] A set of logger specific configuration parameters.
     */
    configure(name: string, options: ILoggerOptions) {
        _argValidator.checkString(name, 1, 'Invalid name (arg #1)');

        this._isMockEnabled = false;

        options = {
            ...options,
        };
        if (!_argValidator.checkEnum(options.level, LOG_LEVELS)) {
            options.level = 'info';
        }

        if (!_argValidator.checkBoolean(options.extreme)) {
            options.extreme = false;
        }

        if (!_argValidator.checkObject(options.serializers)) {
            options.serializers = {};
        } else {
            options.serializers = {
                ...options.serializers,
            };
        }

        if (!_argValidator.checkArray(options.redact as string[] | undefined)) {
            options.redact = [];
        }

        const destination = this._getDestination(options);

        this._logger = _pino(
            {
                name,
                level: options.level,
                serializers: options.serializers,
                redact: options.redact,
            },
            destination,
        );
    }

    /**
     * Re enables logging by undoing the actions performed by
     * {@link LogManager.enableMock()|enableMock()}. Invoking this method will
     * only impact newly created logger instances, and will have no impact on
     * logger objects that have been created in the past.
     *
     * This method is primarily intended for debugging/testing purposes.
     */
    public disableMock(): void {
        this._isMockEnabled = false;
    }

    /**
     * Forces the logger provider to generate mock loggers that do not
     * perform any real logging.
     *
     * This method is primarily intended for debugging/testing purposes where
     * log messages may have to be suppressed.
     */
    public enableMock(): void {
        this._isMockEnabled = true;
    }

    /**
     * Returns a preconfigured child logger for the specified module.
     *
     * @param group The name of the logger group. This typically identifies the
     * module for which the logger will be returned.
     * @param [props={}] Optional properties to be added to the logger metadata.
     * Each of these properties will be included with all log statements.
     *
     * @return {Object} A logger object that can be used for logging. If the
     *         logger is not already configured using the
     */
    public getLogger(group: string, props: Record<string, unknown>): ILogger {
        _argValidator.checkString(group, 1, 'Invalid group (arg #1)');
        if (this._isMockEnabled) {
            return MOCK_LOGGER;
        }

        const child = this._logger.child({
            ...props,
            group,
        });
        return child;
    }
}

export default new LogManager();
