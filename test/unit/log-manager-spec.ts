import { expect, use as _useWithChai } from 'chai';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';
import 'mocha';
import process from 'process';

_useWithChai(_sinonChai);
_useWithChai(_chaiAsPromised);

import { stub } from 'sinon';
import _esmock from 'esmock';

import {
    testValues as _testValues,
    ObjectMock,
    MockImportHelper,
} from '@vamship/test-utils';
import { ILogger, ILoggerOptions } from '../../src/types/index.js';

import { LogManager } from '../../src/log-manager.js';

import { ArgError } from '@vamship/error-types';

describe('logger', function () {
    const LOG_LEVELS = [
        'silent',
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
    ];

    type LoggerMap = Record<string, () => void>;

    type ImportResult = {
        testTarget: typeof LogManager;
        loggerMock: ObjectMock<ILogger>;
        destinationObject: Record<string, unknown>;
    };

    async function _import(): Promise<ImportResult> {
        const destinationObject = {};
        const loggerMock: ObjectMock<ILogger> = new ObjectMock<ILogger>()
            .addMock('child', () => loggerMock.instance)
            .addMock('destination', () => destinationObject);

        // Convenient way to typecast and mess with the prototype chain
        // eslint-disable-next-line tsel/no-explicit-any
        ((mock: any) => {
            mock.ctor.destination = mock.instance.destination;
            // eslint-disable-next-line tsel/no-explicit-any
        })(loggerMock as any);

        LOG_LEVELS.reduce(
            (result, level) => result.addMock(level, stub()),
            loggerMock,
        );

        const importHelper = new MockImportHelper<LogManager>(
            'project://src/log-manager.js',
            {
                pino: 'pino',
            },
            import.meta.resolve('../../../working'),
        );

        importHelper.setMock('pino', { default: loggerMock.ctor });

        const targetModule = await _esmock(
            importHelper.importPath,
            importHelper.getLibs(),
            importHelper.getGlobals(),
        );

        return {
            testTarget: targetModule.LogManager,
            loggerMock,
            destinationObject,
        };
    }

    function _verifyLoggerInstance(logger: ILogger, isMock = false): void {
        const loggerMap = logger as unknown as LoggerMap;

        LOG_LEVELS.forEach((level) => {
            const method = loggerMap[level] as () => void;

            expect(method).to.be.a('function', `level=[${level}]`);
            expect(method()).to.be.undefined;
        });

        expect(logger.child).to.be.a('function', 'child');

        if (isMock) {
            // eslint-disable-next-line tsel/no-explicit-any
            expect((logger as any).__isMock).to.be.true;
        } else {
            // eslint-disable-next-line tsel/no-explicit-any
            expect((logger as any).__isMock).to.be.undefined;
        }
    }

    describe('ctor()', function () {
        it('should expose the necessary fields and methods', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();

            // Duck type checking because esmock messes with the prototype chain
            expect(manager.configure).to.be.a('function');
            expect(manager.enableMock).to.be.a('function');
            expect(manager.disableMock).to.be.a('function');
        });
    });

    describe('configure()', function () {
        _testValues.allButString('').forEach((name) => {
            it(`should throw an error if invoked without a valid name (value=${name})`, async function () {
                const { testTarget: TargetClass } = await _import();
                const manager = new TargetClass();
                const message = 'Invalid name (arg #1)';

                const wrapper = () => manager.configure(name as string);
                expect(wrapper).to.throw(ArgError, message);
            });
        });

        it('should return a reference to the logger module when invoked', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();

            const name = _testValues.getString('appName');
            const ret = manager.configure(name);

            expect(ret).to.equal(manager);
        });

        it('should initialize the logger object with the correct parameters', async function () {
            const {
                testTarget: TargetClass,
                loggerMock,
                destinationObject,
            } = await _import();
            const manager = new TargetClass();

            const name = _testValues.getString('appName');
            const level = 'debug';
            const extreme = false;
            const destination = _testValues.getString('destination');
            const serializers = {
                mySerializer: () => {
                    return 'test';
                },
            };
            const redact = new Array(5)
                .fill(0)
                .map((item, index) => _testValues.getString(`redact_${index}`));
            const destinationMethod = loggerMock.mocks.destination;

            const options = {
                level,
                extreme,
                destination,
                serializers,
                redact,
            };

            expect(destinationMethod.stub).to.not.have.been.called;
            expect(loggerMock.ctor).to.not.have.been.called;

            manager.configure(name, options);

            expect(destinationMethod.stub).to.have.been.calledOnce;
            expect(destinationMethod.stub).to.have.been.calledWithExactly({
                dest: destination,
                sync: !extreme,
            });

            expect(loggerMock.ctor).to.have.been.calledOnce;
            expect(loggerMock.ctor.args[0][0]).to.deep.equal({
                name,
                level,
                serializers,
                redact,
            });
            expect(loggerMock.ctor.args[0][1]).to.equal(destinationObject);
        });

        _testValues.allButObject().forEach((options) => {
            it(`should initialize the logger with defaults if the options object is not specified (value=${options})`, async function () {
                const {
                    testTarget: TargetClass,
                    loggerMock,
                    destinationObject,
                } = await _import();
                const manager = new TargetClass();
                const destinationMethod = loggerMock.mocks.destination;

                const name = _testValues.getString('appName');

                expect(destinationMethod.stub).to.not.have.been.called;
                expect(loggerMock.ctor).to.not.have.been.called;

                manager.configure(name, options as ILoggerOptions);

                expect(destinationMethod.stub).to.have.been.calledOnce;
                expect(destinationMethod.stub).to.have.been.calledWithExactly({
                    fd: process.stdout.fd,
                    sync: true,
                });

                expect(loggerMock.ctor).to.have.been.calledOnce;
                expect(loggerMock.ctor.args[0][0]).to.deep.equal({
                    name,
                    level: 'info',
                    redact: [],
                    serializers: {},
                });
                expect(loggerMock.ctor.args[0][1]).to.equal(destinationObject);
            });
        });

        _testValues.allButString('foo', 'bar', '').forEach((level) => {
            it(`should use the default log level if a valid log level is not specified (value=${level})`, async function () {
                const { testTarget: TargetClass, loggerMock } = await _import();
                const manager = new TargetClass();

                const name = _testValues.getString('appName');
                const options = { level: level as string };

                manager.configure(name, options);

                const actualOptions = loggerMock.ctor
                    .args[0][0] as ILoggerOptions;
                expect(actualOptions.level).to.equal('info');
            });
        });

        it('should pass object destinations to the constructor without modification', async function () {
            const destination = {};
            const { testTarget: TargetClass, loggerMock } = await _import();
            const manager = new TargetClass();

            const name = _testValues.getString('appName');
            const options = { destination, extreme: false };
            const destinationMethod = loggerMock.mocks.destination;

            expect(destinationMethod.stub).to.not.have.been.called;

            manager.configure(name, options as ILoggerOptions);

            expect(destinationMethod.stub).to.not.have.been.called;
            expect(loggerMock.ctor.args[0][1]).to.equal(destination);
        });

        describe('[extreme mode]', function () {
            [true, false].forEach((extreme) => {
                it(`should apply the extreme flag to the destination if defined in the options (value=${extreme})`, async function () {
                    const { testTarget: TargetClass, loggerMock } =
                        await _import();
                    const manager = new TargetClass();

                    const destinationMethod = loggerMock.mocks.destination;

                    const name = _testValues.getString('appName');

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, { extreme });

                    expect(destinationMethod.stub).to.have.been.calledOnce;
                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stdout.fd,
                        sync: !extreme,
                    });
                });
            });

            [true, false].forEach((extreme) => {
                it(`should not apply the extreme flag to the destination a destination object is specified (value=${extreme})`, async function () {
                    const { testTarget: TargetClass, loggerMock } =
                        await _import();
                    const manager = new TargetClass();
                    const destinationMethod = loggerMock.mocks.destination;
                    const name = _testValues.getString('appName');
                    // eslint-disable-next-line tsel/no-explicit-any
                    const destination = {} as any;

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, { extreme, destination });

                    expect(destinationMethod.stub).to.not.have.been.called;

                    expect(loggerMock.ctor.args[0][1]).to.equal(destination);
                });
            });

            [true, false].forEach((extreme) => {
                it(`should use the stdout file descriptor if the destination is "process.stdoout" (value=${extreme})`, async function () {
                    const {
                        testTarget: TargetClass,
                        loggerMock,
                        destinationObject,
                    } = await _import();
                    const manager = new TargetClass();
                    const destinationMethod = loggerMock.mocks.destination;

                    const name = _testValues.getString('appName');
                    const destination = 'process.stdout';
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stdout.fd,
                        sync: !extreme,
                    });
                    expect(loggerMock.ctor.args[0][1]).to.equal(
                        destinationObject,
                    );
                });
            });

            [true, false].forEach((extreme) => {
                it(`should use the stderr file descriptor if the destination is "process.stderr" (value=${extreme})`, async function () {
                    const {
                        testTarget: TargetClass,
                        loggerMock,
                        destinationObject,
                    } = await _import();
                    const manager = new TargetClass();
                    const destinationMethod = loggerMock.mocks.destination;

                    const name = _testValues.getString('appName');
                    const destination = 'process.stderr';
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        fd: process.stderr.fd,
                        sync: !extreme,
                    });

                    expect(loggerMock.ctor.args[0][1]).to.equal(
                        destinationObject,
                    );
                });
            });

            [true, false].forEach((extreme) => {
                it(`should treat the destination as a file path if it not one of the standard values (value=${extreme})`, async function () {
                    const {
                        testTarget: TargetClass,
                        loggerMock,
                        destinationObject,
                    } = await _import();
                    const manager = new TargetClass();
                    const destinationMethod = loggerMock.mocks.destination;

                    const name = _testValues.getString('appName');
                    const destination = _testValues.getString('destination');
                    const options = { destination, extreme };

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, options);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(destinationMethod.stub.args[0]).to.have.length(1);
                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
                        dest: destination,
                        sync: !extreme,
                    });

                    expect(loggerMock.ctor.args[0][1]).to.equal(
                        destinationObject,
                    );
                });
            });

            _testValues.allButBoolean().forEach((extreme) => {
                it(`should default extreme = true if a valid boolean value is not specified (value=${extreme})`, async function () {
                    const {
                        testTarget: TargetClass,
                        loggerMock,
                        destinationObject,
                    } = await _import();
                    const manager = new TargetClass();

                    const name = _testValues.getString('appName');
                    const destination = _testValues.getString('destination');
                    const options = { destination, extreme };

                    const destinationMethod = loggerMock.mocks.destination;

                    expect(destinationMethod.stub).to.not.have.been.called;

                    manager.configure(name, options as ILoggerOptions);

                    expect(destinationMethod.stub).to.have.been.calledOnce;

                    expect(
                        destinationMethod.stub,
                    ).to.have.been.calledWithExactly({
                        dest: destination,
                        sync: true,
                    });

                    //Reset call counts
                    destinationMethod.reset();

                    expect(loggerMock.ctor.args[0][1]).to.equal(
                        destinationObject,
                    );
                });
            });

            _testValues.allButObject().forEach((serializers) => {
                it(`should use the default value for serializers if a valid value is not specified (value=${serializers})`, async function () {
                    const { testTarget: TargetClass, loggerMock } =
                        await _import();
                    const manager = new TargetClass();
                    const name = _testValues.getString('appName');
                    const options = { serializers };

                    manager.configure(name, options as ILoggerOptions);

                    const args = loggerMock.ctor.args[0][0] as {
                        serializers: Record<string, unknown>;
                    };
                    expect(args.serializers).to.deep.equal({});
                });
            });

            _testValues.allButArray().forEach((redact) => {
                it(`should use the default value for redact if a valid value is not specified (value=${redact})`, async function () {
                    const { testTarget: TargetClass, loggerMock } =
                        await _import();
                    const manager = new TargetClass();
                    const name = _testValues.getString('appName');
                    const options = { redact } as ILoggerOptions;

                    manager.configure(name, options);

                    const args = loggerMock.ctor.args[0][0] as {
                        redact: unknown[];
                    };
                    expect(args.redact).to.deep.equal([]);
                });
            });

            it('should have no impact if invoked multiple times', async function () {
                const { testTarget: TargetClass, loggerMock } = await _import();
                const manager = new TargetClass();
                const name = _testValues.getString('appName');

                manager.configure(name);

                loggerMock.ctor.resetHistory();
                for (let index = 0; index < 10; index++) {
                    manager.configure(_testValues.getString('appName'));

                    expect(loggerMock.ctor).to.not.have.been.called;
                }
            });
        });
    });

    describe('getLogger()', function () {
        _testValues.allButString('').forEach((group) => {
            it(`should throw an error if invoked without a logger group name (value=${group})`, async function () {
                const { testTarget: TargetClass } = await _import();
                const manager = new TargetClass();
                const message = 'Invalid group (arg #1)';
                const name = _testValues.getString('appName');

                manager.configure(name);

                const wrapper = () => {
                    return manager.getLogger(group as string);
                };

                expect(wrapper).to.throw(ArgError, message);
            });
        });

        it('should return a dummy logger if the logger has not been configured', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const logger = manager.getLogger(appName);

            expect(logger).to.be.an('object');

            _verifyLoggerInstance(logger, true);

            expect(logger.child({ group: 'foo' })).to.equal(logger);
        });

        it('should return a logger object if the logger has been configured', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');

            manager.configure(appName);

            const logger = manager.getLogger(group);

            expect(logger).to.be.an('object');

            _verifyLoggerInstance(logger);
        });

        it('should create a child logger with the specified logger group name', async function () {
            const { testTarget: TargetClass, loggerMock } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const childMethod = loggerMock.mocks.child;

            manager.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;

            manager.getLogger(group);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0];

            expect(args).to.deep.equal({
                group,
            });
        });

        it('should add any additional properties specified to the logger instance', async function () {
            const { testTarget: TargetClass, loggerMock } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const props = {
                foo: 'bar',
                abc: 123,
                obj: {
                    add: 'me',
                },
                level: 'trace',
            };
            const childMethod = loggerMock.mocks.child;

            manager.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;

            manager.getLogger(group, props);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0];

            const expectedArgs = {
                group,
                ...props,
            };
            expect(args).to.deep.equal(expectedArgs);
        });

        it('should ensure that the group property is not overridden by additional properties', async function () {
            const { testTarget: TargetClass, loggerMock } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');
            const loggerProps = {
                group: 'this should not override the logger name',
            };

            const childMethod = loggerMock.mocks.child;

            manager.configure(appName);

            expect(childMethod.stub).to.not.have.been.called;

            manager.getLogger(group, loggerProps);

            expect(childMethod.stub).to.have.been.calledOnce;
            const args = childMethod.stub.args[0][0] as { group: string };

            expect(args.group).to.equal(group);
        });
    });

    describe('enableMock()', function () {
        it('should return a dummy logger when invoked, even if after logger initialization', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');

            manager.configure(appName);
            manager.enableMock();

            const logger = manager.getLogger(group);

            expect(logger).to.be.an('object');

            _verifyLoggerInstance(logger, true);
        });
    });

    describe('disableMock()', function () {
        it('should disable mocking and return the configured logger object when invoked', async function () {
            const { testTarget: TargetClass } = await _import();
            const manager = new TargetClass();
            const appName = _testValues.getString('appName');
            const group = _testValues.getString('group');

            manager.configure(appName);
            manager.enableMock();

            let logger = manager.getLogger(group);
            expect(logger).to.be.an('object');

            _verifyLoggerInstance(logger, true);

            manager.disableMock();

            logger = manager.getLogger(group);
            expect(logger).to.be.an('object');

            _verifyLoggerInstance(logger);
        });
    });
});
