import { Box, Option, RadioButton, Tile } from '@rocket.chat/fuselage';
import type { ReactElement } from 'react';
import React from 'react';

import type { RadioDropDownGroup, RadioDropDownOnSelected } from '../definitions/RadioDropDownDefinitions';

type RadioButtonListProps = {
	group: RadioDropDownGroup;
	onSelected: RadioDropDownOnSelected;
};

const RadioButtonList = ({ group, onSelected }: RadioButtonListProps): ReactElement => (
	<Tile overflow='auto' pb={12} pi={0} elevation='2' w='full' bg='light' borderRadius='x2'>
		{group.label && (
			<Box pi={16} pbs={8} pbe={4} fontScale='micro' textTransform='uppercase' color='default'>
				{group.label}
			</Box>
		)}
		{group.items.map((item) => (
			<Option key={item.id} label={item.label} onClick={(): void => onSelected(item)}>
				<RadioButton checked={item.checked} onChange={(): void => onSelected(item)} />
			</Option>
		))}
	</Tile>
);

export default RadioButtonList;
