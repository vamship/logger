import { expect } from 'chai';
import 'mocha';

import _logger from '../../src/logger.js';
import _index from '../../src/index.js';

describe('index', function () {
    it('should export the expected modules and classes', () => {
        expect(_index).to.equal(_logger);
    });
});
