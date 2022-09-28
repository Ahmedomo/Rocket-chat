import { ajv } from '../../ajv';

export type GetCurrentImportOperationParamsGET = Record<string, unknown>;

const GetCurrentImportOperationParamsGETSchema = {
	type: 'object',
	properties: {},
	additionalProperties: false,
	required: [],
};

export const isGetCurrentImportOperationParamsGET = ajv.compile<GetCurrentImportOperationParamsGET>(
	GetCurrentImportOperationParamsGETSchema,
);
