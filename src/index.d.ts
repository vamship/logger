/**
 * Interface for logger objects.
 */
export interface ILogger {
    /**
     * Trace logger method.
     */
    trace: (message: Object | string, args?: Object | string) => void;

    /**
     * Debug logger method.
     */
    debug: (message: Object | string, args?: Object | string) => void;

    /**
     * Info logger method.
     */
    info: (message: Object | string, args?: Object | string) => void;

    /**
     * Warn logger method.
     */
    warn: (message: Object | string, args?: Object | string) => void;

    /**
     * Error logger method.
     */
    error: (message: Object | string, args?: Object | string) => void;

    /**
     * Fatal logger method.
     */
    fatal: (message: Object | string, args?: Object | string) => void;

    /**
     * Child method.
     */
    child: (props: {}) => ILogger;
}

/**
 * Disables log mocking.
 */
export declare function disableMock(): void;

/**
 * Enables log mocking.
 */
export declare function enableMock(): void;

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
    destination?: Object | String;

    /**
     * Specifies serializers that can be used to process log data before writing
     * it to the target stream(s). If omitted, no special serializers will be
     * applied.
     */
    serializers?: Array<unknown>;

    /**
     * A list of optional redactions to apply to the output of the logger
     */
    redact?: Array<unknown>;
}

/**
 * Configures global logger settings, including application name and other
 * metadata parameters that will be applied to all log messages. This
 * method must be invoked before any calls to
 * [getLogger()]{@link module:logger.getLogger} in order to
 * ensure that all logger instances are configured correctly.
 *
 * @param name The name to assign to the root logger. This is typically the
 *        application name.
 * @param options A set of logger specific configuration parameters.
 *
 * @return A reference to the current module, allowing for chaining of method
 * calls.
 */
export declare function configure(
    name: string,
    options: ILoggerOptions
): {
    disableMock: () => void;
    enableMock: () => void;
    getLogger: (group: string, props?: Record<string, unknown>) => ILogger;
};

/**
 * Returns a preconfigured logger for the specified module.
 *
 * @param group The name of the log group.
 * @param props A set of key/value pairs that add metadata to the logger.
 */
export declare function getLogger(
    group: string,
    props?: Record<string, unknown>
): ILogger;
