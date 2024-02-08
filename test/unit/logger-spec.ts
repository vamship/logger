import { expect, use as _useWithChai } from 'chai';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';
import 'mocha';

_useWithChai(_sinonChai);
_useWithChai(_chaiAsPromised);

import { stub } from 'sinon';
import _esmock from 'esmock';

import {
    testValues as _testValues,
    ObjectMock,
    MockImportHelper,
} from '@vamship/test-utils';
import {
    LogManager,
    ILogger,
    ILoggerOptions,
    ObjectSerializer,
} from '../../src/logger.js';
// import { ArgError } from '@vamship/error-types';

describe.only('logger', function () {
    const LOG_LEVELS = [
        'silent',
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
    ];

    type TargetModule = typeof LogManager;

    type ImportResult = {
        testTarget: TargetModule;
        loggerMock: ILogger;
    };

    async function _import(): Promise<ImportResult> {
        const destinationObject = {};
        const extremeDestination = {};
        const loggerMock: ObjectMock<ILogger> = new ObjectMock<ILogger>(
            undefined,
        )
            .addMock('child', () => loggerMock)
            .addMock('destination', destinationObject);

        LOG_LEVELS.reduce(
            (result, level) => result.addMock(level, stub()),
            loggerMock,
        );

        const importHelper = new MockImportHelper<TargetModule>(
            'project://src/logger.js',
            {
                pino: loggerMock.ctor,
            },
            import.meta.resolve('../../../working'),
        );

        const testTarget = await _esmock(
            importHelper.importPath,
            importHelper.getLibs(),
            importHelper.getGlobals(),
        );

        return { testTarget, loggerMock };
    }

    describe('[init]', function () {
        it('should expose the necessary fields and methods', async function () {
            const { testTarget } = await _import();

            // Duck type checking because esmock messes with the prototype chain
            expect(testTarget.configure).to.be.a('function');
            expect(testTarget.enableMock).to.be.a('function');
            expect(testTarget.disableMock).to.be.a('function');
        });
    });

    // describe('configure()', function () {
    //        it('should throw an error if invoked without a valid name', async function () {
    //            const message = 'Invalid name (arg #1)';
    //            _testValues.allButString('').forEach((name) => {
    //                const wrapper = () => {
    //                    _logger.configure(name);
    //                };

    //                expect(wrapper).to.throw(ArgError, message);
    //            });
    //        });

    //        it('should return a reference to the logger module when invoked', async function () {
    //            const name = _testValues.getString('appName');
    //            const ret = _logger.configure(name);

    //            expect(ret).to.equal(_logger);
    //        });

    //        it('should initialize the logger object with the correct parameters', async function () {
    //            const name = _testValues.getString('appName');
    //            const level = 'debug';
    //            const extreme = false;
    //            const destination = _testValues.getString('destination');
    //            const serializers = {
    //                mySerializer: () => {
    //                    return 'test';
    //                },
    //            };
    //            const redact = new Array(5)
    //                .fill(0)
    //                .map((item, index) => _testValues.getString(`redact_${index}`));
    //            const destinationMethod = _pinoMock.mocks.destination;

    //            const options = {
    //                level,
    //                extreme,
    //                destination,
    //                serializers,
    //                redact,
    //            };

    //            expect(_pinoMock.ctor).to.not.have.been.called;
    //            expect(destinationMethod.stub).to.not.have.been.called;

    //            _logger.configure(name, options);

    //            expect(destinationMethod.stub).to.have.been.calledOnce;
    //            expect(destinationMethod.stub).to.have.been.calledWithExactly({
    //                dest: destination,
    //                sync: !extreme,
    //            });

    //            expect(_pinoMock.ctor).to.have.been.calledOnce;
    //            expect(_pinoMock.ctor.args[0][0]).to.deep.equal({
    //                name,
    //                level,
    //                serializers,
    //                redact,
    //            });
    //            expect(_pinoMock.ctor.args[0][1]).to.deep.equal(
    //                _pinoMock.__destinationObject
    //            );
    //        });

    //        it('should initialize the logger with defaults if the options object is not specified', async function () {
    //            const inputs = _testValues.allButObject();
    //            const destinationMethod = _pinoMock.mocks.destination;

    //            inputs.forEach((options, index) => {
    //                const name = _testValues.getString('appName');

    //                expect(destinationMethod.stub).to.not.have.been.called;

    //                _logger.configure(name, options);

    //                expect(destinationMethod.stub).to.have.been.calledOnce;
    //                expect(destinationMethod.stub.args[0]).to.have.length(1);
    //                expect(destinationMethod.stub.args[0][0]).to.deep.equal({
    //                    fd: process.stdout.fd,
    //                    sync: true,
    //                });

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                const args = _pinoMock.ctor.args[index][0];
    //                expect(args.level).to.equal('info');

    //                destinationMethod.reset();
    //            });
    //        });

    //        it('should use the default log level if a valid log level is not specified', async function () {
    //            const inputs = _testValues.allButString('foo', 'bar', '');

    //            inputs.forEach((level, index) => {
    //                const name = _testValues.getString('appName');
    //                const options = { level };
    //                _logger.configure(name, options);

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                const args = _pinoMock.ctor.args[index][0];
    //                expect(args.level).to.equal('info');
    //            });
    //        });

    //        it('should pass object destinations to the constructor without using pino.destination', async function () {
    //            const inputs = [{}, {}, {}];
    //            inputs.forEach((destination, index) => {
    //                const name = _testValues.getString('appName');
    //                const options = { destination, extreme: false };

    //                const destinationMethod = _pinoMock.mocks.destination;

    //                expect(destinationMethod.stub).to.not.have.been.called;

    //                _logger.configure(name, options);

    //                expect(destinationMethod.stub).to.not.have.been.called;

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                //Reset call counts
    //                destinationMethod.reset();

    //                expect(_pinoMock.ctor.args[index][1]).to.equal(destination);
    //            });
    //        });

    //        describe('[extreme mode]', function () {
    //            it('should apply the extreme flag to the destination if defined in the options', async function () {
    //                const inputs = [true, false];
    //                const destinationMethod = _pinoMock.mocks.destination;

    //                inputs.forEach((extreme, index) => {
    //                    const name = _testValues.getString('appName');

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    _logger.configure(name, { extreme });

    //                    expect(destinationMethod.stub).to.have.been.calledOnce;
    //                    expect(destinationMethod.stub.args[0]).to.have.length(1);
    //                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
    //                        fd: process.stdout.fd,
    //                        sync: !extreme,
    //                    });

    //                    //Reset the initialized flag
    //                    _logger.__set__('_isInitialized', false);

    //                    destinationMethod.reset();
    //                });
    //            });

    //            it('should not apply the extreme flag to the destination a destination object is specified', async function () {
    //                const inputs = [true, false];
    //                const destinationMethod = _pinoMock.mocks.destination;

    //                inputs.forEach((extreme, index) => {
    //                    const name = _testValues.getString('appName');
    //                    const destination = {};

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    _logger.configure(name, { extreme, destination });

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    //Reset the initialized flag
    //                    _logger.__set__('_isInitialized', false);

    //                    expect(_pinoMock.ctor.args[index][1]).to.equal(destination);
    //                });
    //            });

    //            it('should use the stdout file descriptor if the destination is "process.stdoout" ', async function () {
    //                const inputs = [true, false];
    //                const destinationMethod = _pinoMock.mocks.destination;

    //                inputs.forEach((extreme, index) => {
    //                    const name = _testValues.getString('appName');
    //                    const destination = 'process.stdout';
    //                    const options = { destination, extreme };

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    _logger.configure(name, options);

    //                    expect(destinationMethod.stub).to.have.been.calledOnce;

    //                    expect(destinationMethod.stub.args[0]).to.have.length(1);
    //                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
    //                        fd: process.stdout.fd,
    //                        sync: !extreme,
    //                    });

    //                    //Reset the initialized flag
    //                    _logger.__set__('_isInitialized', false);

    //                    //Reset call counts
    //                    destinationMethod.reset();

    //                    expect(_pinoMock.ctor.args[index][1]).to.equal(
    //                        _pinoMock.__destinationObject
    //                    );
    //                });
    //            });

    //            it('should use the stderr file descriptor if the destination is "process.stderr" ', async function () {
    //                const inputs = [true, false];
    //                const destinationMethod = _pinoMock.mocks.destination;

    //                inputs.forEach((extreme, index) => {
    //                    const name = _testValues.getString('appName');
    //                    const destination = 'process.stderr';
    //                    const options = { destination, extreme };

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    _logger.configure(name, options);

    //                    expect(destinationMethod.stub).to.have.been.calledOnce;

    //                    expect(destinationMethod.stub.args[0]).to.have.length(1);
    //                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
    //                        fd: process.stderr.fd,
    //                        sync: !extreme,
    //                    });

    //                    //Reset the initialized flag
    //                    _logger.__set__('_isInitialized', false);

    //                    //Reset call counts
    //                    destinationMethod.reset();

    //                    expect(_pinoMock.ctor.args[index][1]).to.equal(
    //                        _pinoMock.__destinationObject
    //                    );
    //                });
    //            });

    //            it('should treat the destination as a file path if it not one of the standard values', async function () {
    //                const inputs = [true, false];
    //                const destinationMethod = _pinoMock.mocks.destination;

    //                inputs.forEach((extreme, index) => {
    //                    const name = _testValues.getString('appName');
    //                    const destination = _testValues.getString('destination');
    //                    const options = { destination, extreme };

    //                    expect(destinationMethod.stub).to.not.have.been.called;

    //                    _logger.configure(name, options);

    //                    expect(destinationMethod.stub).to.have.been.calledOnce;

    //                    expect(destinationMethod.stub.args[0]).to.have.length(1);
    //                    expect(destinationMethod.stub.args[0][0]).to.deep.equal({
    //                        dest: destination,
    //                        sync: !extreme,
    //                    });

    //                    //Reset the initialized flag
    //                    _logger.__set__('_isInitialized', false);

    //                    //Reset call counts
    //                    destinationMethod.reset();

    //                    expect(_pinoMock.ctor.args[index][1]).to.equal(
    //                        _pinoMock.__destinationObject
    //                    );
    //                });
    //            });
    //        });

    //        it('should default extreme = true if a valid boolean value is not specified', async function () {
    //            const inputs = _testValues.allButBoolean();

    //            inputs.forEach((extreme, index) => {
    //                const name = _testValues.getString('appName');
    //                const destination = _testValues.getString('destination');
    //                const options = { destination, extreme };

    //                const destinationMethod = _pinoMock.mocks.destination;

    //                expect(destinationMethod.stub).to.not.have.been.called;

    //                _logger.configure(name, options);

    //                expect(destinationMethod.stub).to.have.been.calledOnce;

    //                expect(destinationMethod.stub).to.have.been.calledWithExactly({
    //                    dest: destination,
    //                    sync: true,
    //                });

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                //Reset call counts
    //                destinationMethod.reset();

    //                expect(_pinoMock.ctor.args[index][1]).to.equal(
    //                    _pinoMock.__destinationObject
    //                );
    //            });
    //        });

    //        it('should use the default value for serializers if a valid value is not specified', async function () {
    //            const inputs = _testValues.allButObject();

    //            inputs.forEach((serializers, index) => {
    //                const name = _testValues.getString('appName');
    //                const options = { serializers };
    //                _logger.configure(name, options);

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                const args = _pinoMock.ctor.args[index][0];
    //                expect(args.serializers).to.deep.equal({});
    //            });
    //        });

    //        it('should use the default value for redact if a valid value is not specified', async function () {
    //            const inputs = _testValues.allButArray();

    //            inputs.forEach((redact, index) => {
    //                const name = _testValues.getString('appName');
    //                const options = { redact };
    //                _logger.configure(name, options);

    //                //Reset the initialized flag
    //                _logger.__set__('_isInitialized', false);

    //                const args = _pinoMock.ctor.args[index][0];
    //                expect(args.redact).to.deep.equal([]);
    //            });
    //        });

    //        it('should have no impact if invoked multiple times', async function () {
    //            let name = _testValues.getString('appName');
    //            _logger.configure(name);

    //            for (let index = 0; index < 10; index++) {
    //                _pinoMock.ctor.resetHistory();
    //                name = _testValues.getString('appName');
    //                _logger.configure(name);

    //                expect(_pinoMock.ctor).to.not.have.been.called;
    //            }
    //        });
    //    });

    //    describe('getLogger()', function () {
    //        it('should throw an error if invoked without a logger group name', async function () {
    //            const message = 'Invalid group (arg #1)';
    //            const name = _testValues.getString('appName');
    //            _logger.configure(name);

    //            const inputs = _testValues.allButString('');
    //            inputs.forEach((group) => {
    //                const wrapper = () => {
    //                    return _logger.getLogger(group);
    //                };

    //                expect(wrapper).to.throw(ArgError, message);
    //            });
    //        });

    //        it('should return a dummy logger if the logger has not been configured', async function () {
    //            const appName = _testValues.getString('appName');
    //            const logger = _logger.getLogger(appName);

    //            expect(logger).to.be.an('object');
    //            LOG_LEVELS.forEach((level) => {
    //                const method = logger[level];

    //                expect(method).to.be.a('function');
    //                expect(method()).to.be.undefined;
    //            });

    //            expect(logger.child()).to.equal(logger);
    //            expect(logger.__isMock).to.be.true;
    //        });

    //        it('should return a logger object if the logger has been configured', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');
    //            _logger.configure(appName);

    //            const logger = _logger.getLogger(group);
    //            expect(logger).to.be.an('object');

    //            LOG_LEVELS.forEach((level) => {
    //                const method = logger[level];
    //                expect(method).to.be.a('function');
    //            });
    //            expect(logger.child).to.be.a('function');
    //            expect(logger.__isMock).to.be.undefined;
    //        });

    //        it('should create a child logger with the specified logger group name', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');
    //            const childMethod = _pinoMock.mocks.child;

    //            _logger.configure(appName);

    //            expect(childMethod.stub).to.not.have.been.called;
    //            _logger.getLogger(group);

    //            expect(childMethod.stub).to.have.been.calledOnce;
    //            const args = childMethod.stub.args[0][0];

    //            expect(args).to.deep.equal({
    //                group,
    //            });
    //        });

    //        it('should add any additional properties specified to the logger instance', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');
    //            const props = {
    //                foo: 'bar',
    //                abc: 123,
    //                obj: {
    //                    add: 'me',
    //                },
    //                level: 'trace',
    //            };
    //            const childMethod = _pinoMock.mocks.child;

    //            _logger.configure(appName);

    //            expect(childMethod.stub).to.not.have.been.called;
    //            _logger.getLogger(group, props);

    //            expect(childMethod.stub).to.have.been.calledOnce;
    //            const args = childMethod.stub.args[0][0];

    //            const expectedArgs = Object.assign(
    //                {
    //                    group,
    //                },
    //                props
    //            );
    //            expect(args).to.deep.equal(expectedArgs);
    //        });

    //        it('should ensure that the group property is not overridden by additional properties', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');
    //            const loggerProps = {
    //                group: 'this should not override the logger name',
    //            };
    //            const childMethod = _pinoMock.mocks.child;

    //            _logger.configure(appName);

    //            expect(childMethod.stub).to.not.have.been.called;
    //            _logger.getLogger(group, loggerProps);

    //            expect(childMethod.stub).to.have.been.calledOnce;
    //            const args = childMethod.stub.args[0][0];

    //            expect(args.group).to.equal(group);
    //        });
    //    });

    //    describe('enableMock()', function () {
    //        it('should return a dummy logger when invoked, even if after logger initialization', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');

    //            _logger.configure(appName);
    //            _logger.enableMock();
    //            const logger = _logger.getLogger(group);

    //            expect(logger).to.be.an('object');
    //            LOG_LEVELS.forEach((level) => {
    //                const method = logger[level];

    //                expect(method).to.be.a('function');
    //                expect(method()).to.be.undefined;
    //            });

    //            expect(logger.__isMock).to.be.true;
    //        });
    //    });

    //    describe('disableMock()', function () {
    //        it('should disable mocking and return the configured logger object when invoked', async function () {
    //            const appName = _testValues.getString('appName');
    //            const group = _testValues.getString('group');
    //            _logger.configure(appName);
    //            _logger.enableMock();

    //            let logger = _logger.getLogger(group);
    //            expect(logger).to.be.an('object');
    //            LOG_LEVELS.forEach((level) => {
    //                const method = logger[level];

    //                expect(method).to.be.a('function');
    //                expect(method()).to.be.undefined;
    //            });
    //            expect(logger.__isMock).to.be.true;

    //            _logger.disableMock();
    //            logger = _logger.getLogger(group);
    //            expect(logger).to.be.an('object');
    //            LOG_LEVELS.forEach((level) => {
    //                const method = logger[level];

    //                expect(method).to.be.a('function');
    //                expect(method()).to.be.undefined;
    //            });
    //            expect(logger.__isMock).to.be.undefined;
    //        });
    //    });
});
