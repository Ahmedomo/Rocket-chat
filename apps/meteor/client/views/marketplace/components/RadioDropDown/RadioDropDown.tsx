import type { Button } from '@rocket.chat/fuselage';
import { useToggle } from '@rocket.chat/fuselage-hooks';
import type { ComponentProps, ReactElement } from 'react';
import React, { useCallback, useRef } from 'react';

import type { RadioDropDownGroup, RadioDropDownOnSelected } from '../../definitions/RadioDropDownDefinitions';
import { isValidReference } from '../../helpers/isValidReference';
import { onMouseEventPreventSideEffects } from '../../helpers/onMouseEventPreventSideEffects';
import DropDownListWrapper from '../DropDownListWrapper';
import RadioButtonList from '../RadioButtonList';
import RadioDropDownAnchor from './RadioDownAnchor';

type RadioDropDownProps = {
	group: RadioDropDownGroup;
	onSelected: RadioDropDownOnSelected;
} & Omit<ComponentProps<typeof Button>, 'onClick'>;

const RadioDropDown = ({ group, onSelected, ...props }: RadioDropDownProps): ReactElement => {
	const reference = useRef<HTMLElement>(null);
	const [collapsed, toggleCollapsed] = useToggle(false);

	const onClose = useCallback(
		(e: MouseEvent) => {
			if (isValidReference(reference, e)) {
				toggleCollapsed(false);
				return;
			}

			onMouseEventPreventSideEffects(e);

			return false;
		},
		[toggleCollapsed],
	);

	return (
		<>
			<RadioDropDownAnchor ref={reference} group={group} onClick={toggleCollapsed} {...props} />
			{collapsed && (
				<DropDownListWrapper ref={reference} onClose={onClose}>
					<RadioButtonList group={group} onSelected={onSelected} />
				</DropDownListWrapper>
			)}
		</>
	);
};

export default RadioDropDown;
