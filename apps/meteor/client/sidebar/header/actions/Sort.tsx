import { MenuV2, MenuSection, MenuItem } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { VFC, HTMLAttributes } from 'react';
import React from 'react';

import GenericMenuContent from '../../../components/GenericMenuContent';
import { useSortMenu } from './hooks/useSortMenu';

const Sort: VFC<Omit<HTMLAttributes<HTMLElement>, 'is'>> = () => {
	const t = useTranslation();

	const sections = useSortMenu();

	return (
		<MenuV2 icon='sort' selectionMode='multiple' title={t('Display')}>
			{sections.map(({ title, items }) => (
				<MenuSection title={t.has(title) ? t(title) : title} items={items}>
					{(item) => (
						<MenuItem key={item.id}>
							<GenericMenuContent {...item} />
						</MenuItem>
					)}
				</MenuSection>
			))}
		</MenuV2>
	);
};

export default Sort;
