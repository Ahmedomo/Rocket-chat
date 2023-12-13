import type { IUpload } from '@rocket.chat/core-typings';
import { css } from '@rocket.chat/css-in-js';
import { Box, Palette } from '@rocket.chat/fuselage';
import React from 'react';

import { useFormatDateAndTime } from '../../../../../hooks/useFormatDateAndTime';
import FileItemIcon from './FileItemIcon';
import FileItemMenu from './FileItemMenu';
import ImageItem from './ImageItem';

const hoverClass = css`
	&:hover {
		cursor: pointer;
		background-color: ${Palette.surface['surface-tint']};
	}
`;

type FileItemProps = {
	fileData: IUpload;
	isDeletionAllowed: boolean;
	onClickDelete: (id: IUpload['_id']) => void;
};

const FileItem = ({ fileData, isDeletionAllowed, onClickDelete }: FileItemProps) => {
	const format = useFormatDateAndTime();

	const { _id, name, url, uploadedAt, ts, type, typeGroup, style, className, user } = fileData;

	return (
		<Box display='flex' p={12} borderRadius='x4' style={style} className={[className, hoverClass]}>
			{typeGroup === 'image' ? (
				<ImageItem id={_id} url={url} name={name} username={user?.username} timestamp={format(uploadedAt)} />
			) : (
				<Box
					is='a'
					minWidth={0}
					download
					rel='noopener noreferrer'
					target='_blank'
					title={name}
					display='flex'
					flexGrow={1}
					flexShrink={1}
					href={url}
				>
					<FileItemIcon type={type} />
					<Box mis={8} flexShrink={1} overflow='hidden'>
						<Box withTruncatedText color='default' fontScale='p2m'>
							{name}
						</Box>
						<Box withTruncatedText color='hint' fontScale='p2'>
							@{user?.username}
						</Box>
						<Box color='hint' fontScale='micro'>
							{format(uploadedAt)}
						</Box>
					</Box>
				</Box>
			)}
			<FileItemMenu _id={_id} name={name} url={url} onClickDelete={isDeletionAllowed?.({ uid: user?._id, ts }) && onClickDelete} />
		</Box>
	);
};

export default FileItem;
