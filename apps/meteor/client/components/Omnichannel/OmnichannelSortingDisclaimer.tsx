import { OmnichannelSortingMechanismSettingType as OmniSortingType } from '@rocket.chat/core-typings';
import { Box } from '@rocket.chat/fuselage';
import { useSetting, useTranslation } from '@rocket.chat/ui-contexts';
import React, { useState } from 'react';

type OmnichannelSortingDisclaimerProps = {
	id?: string;
};

export const OmnichannelSortingDisclaimer = (props: OmnichannelSortingDisclaimerProps) => {
	const t = useTranslation();
	const sortingMechanism = useSetting<OmniSortingType>('Omnichannel_sorting_mechanism') || OmniSortingType.Timestamp;

	const [{ [sortingMechanism]: type }] = useState({
		[OmniSortingType.Priority]: 'Priorities',
		[OmniSortingType.SLAs]: 'SLA_Policies',
		[OmniSortingType.Timestamp]: '',
	} as const);

	if (!type) {
		return null;
	}

	return (
		<Box is='small' wordBreak='break-word' style={{ whiteSpace: 'normal' }} {...props}>
			{t('Omnichannel_sorting_disclaimer', { sortingMechanism: t(type) })}
		</Box>
	);
};
