import { isTeamsConvertToChannelProps } from '@rocket.chat/rest-typings';
import { assert } from 'chai';

describe('TeamsConvertToChannelProps (definition/rest/v1)', () => {
	describe('isTeamsConvertToChannelProps', () => {
		it('should be a function', () => {
			assert.isFunction(isTeamsConvertToChannelProps);
		});
		it('should return false if neither teamName or teamId is provided', () => {
			assert.isFalse(isTeamsConvertToChannelProps({}));
		});

		it('should return true if teamName is provided', () => {
			assert.isTrue(isTeamsConvertToChannelProps({ teamName: 'teamName' }));
		});

		it('should return true if teamId is provided', () => {
			assert.isTrue(isTeamsConvertToChannelProps({ teamId: 'teamId' }));
		});

		it('should return false if both teamName and teamId are provided', () => {
			assert.isFalse(isTeamsConvertToChannelProps({ teamName: 'teamName', teamId: 'teamId' }));
		});

		it('should return true even if teamName is not a string due to type coercion', () => {
			assert.isTrue(isTeamsConvertToChannelProps({ teamName: 1 }));
		});

		it('should return true even if teamId is not a string due to type coercion', () => {
			assert.isTrue(isTeamsConvertToChannelProps({ teamId: 1 }));
		});

		it('should return false if an additionalProperties is provided', () => {
			assert.isFalse(
				isTeamsConvertToChannelProps({
					teamName: 'teamName',
					additionalProperties: 'additionalProperties',
				}),
			);
		});
	});
});
