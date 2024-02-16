import { DestinationStream, redactOptions, LogFn } from 'pino';

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
     * Silent logger method.
     */
    silent: LogFn;

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
    child: (
        props: Record<string, string | number | boolean | unknown>,
    ) => ILogger;
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
