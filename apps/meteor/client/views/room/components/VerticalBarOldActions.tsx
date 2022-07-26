import { IRoom } from '@rocket.chat/core-typings';
import { Icon } from '@rocket.chat/fuselage';
import { useTranslation, TranslationKey } from '@rocket.chat/ui-contexts';
import React, { ReactElement, ComponentProps } from 'react';

import VerticalBar from '../../../components/VerticalBar';
import { ToolboxContextValue } from '../lib/Toolbox/ToolboxContext';
import { useTabBarClose } from '../providers/ToolboxProvider';
import BlazeTemplate from './BlazeTemplate';

type VerticalBarOldActionsProps = {
	name: string;
	rid: IRoom['_id'];
	_id: IRoom['_id'];
	icon?: ComponentProps<typeof Icon>['name'];
	tabBar: ToolboxContextValue['tabBar'];
	title: TranslationKey;
};

const VerticalBarOldActions = ({ name, rid, icon, tabBar, title, ...props }: VerticalBarOldActionsProps): ReactElement => {
	const close = useTabBarClose();
	const t = useTranslation();

	return (
		<>
			<VerticalBar.Header>
				{icon && <VerticalBar.Icon name={icon} />}
				<VerticalBar.Text>{t(title)}</VerticalBar.Text>
				{close && <VerticalBar.Close onClick={close} />}
			</VerticalBar.Header>
			<VerticalBar.Content>
				<BlazeTemplate flexShrink={1} overflow='hidden' name={name} tabBar={tabBar} rid={rid} {...props} />
			</VerticalBar.Content>
		</>
	);
};

export default VerticalBarOldActions;
