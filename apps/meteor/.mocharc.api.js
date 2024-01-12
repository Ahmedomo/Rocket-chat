'use strict';

/**
 * Mocha configuration for REST API integration tests.
 */

module.exports = {
	...require('./.mocharc.base.json'), // see https://github.com/mochajs/mocha/issues/3916
	timeout: 10000,
	bail: false,
	file: 'tests/end-to-end/teardown.js',
	spec: ['tests/end-to-end/api/**/*', 'tests/end-to-end/apps/*'],
};
