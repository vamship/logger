import { expect } from 'chai';
import 'mocha';

import { LogManager } from '../../src/log-manager.js';
import * as _index from '../../src/index.js';

describe('index', function () {
    it('should export the expected modules and classes', () => {
        expect(_index.LogManager).to.equal(_index.LogManager);

        expect(_index.default).to.be.an.instanceof(LogManager);
    });
});
