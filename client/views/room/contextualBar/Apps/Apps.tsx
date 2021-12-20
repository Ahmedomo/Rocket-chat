import { IUIKitSurface } from '@rocket.chat/apps-engine/definition/uikit';
import { ButtonGroup, Button, Box, Avatar } from '@rocket.chat/fuselage';
import { UiKitComponent, UiKitModal } from '@rocket.chat/fuselage-ui-kit';
import React from 'react';

import { getURL } from '../../../../../app/utils/lib/getURL';
import VerticalBar from '../../../../components/VerticalBar';
import { modalParser } from '../../../blocks/ModalBlock';

type AppsProps = {
	view: IUIKitSurface;
	onSubmit: (e: any) => void;
	onCancel: (e: any) => Promise<void>;
	onClose: (e: any) => Promise<void>;
	appName: string;
	appId: string;
};

const Apps = ({ view, onSubmit, onClose, onCancel, appName, appId }: AppsProps): JSX.Element => (
	<>
		<VerticalBar.Header>
			<Avatar url={getURL(`/api/apps/${appId}/icon`)} />
			<VerticalBar.Text>{appName}</VerticalBar.Text>
			{onClose && <VerticalBar.Close onClick={onClose} />}
		</VerticalBar.Header>
		<VerticalBar.ScrollableContent>
			<Box is='form' method='post' action='#' onSubmit={onSubmit}>
				<UiKitComponent render={UiKitModal} blocks={view.blocks} />
			</Box>
		</VerticalBar.ScrollableContent>
		<VerticalBar.Footer>
			<ButtonGroup align='end'>
				{view.close && <Button onClick={onCancel}>{modalParser.text(view.close.text)}</Button>}
				{view.submit && (
					<Button primary onClick={onSubmit}>
						{modalParser.text(view.submit.text)}
					</Button>
				)}
			</ButtonGroup>
		</VerticalBar.Footer>
	</>
);

export default Apps;
