import type { RefObject } from 'react';

export const isValidReference = (reference: RefObject<HTMLElement>, e: { target?: unknown }): boolean => {
	const isValidTarget = Boolean(e.target);
	const isValidReference = e.target !== reference.current && !reference.current?.contains(e.target as Node);

	return isValidTarget && isValidReference;
};
