import type { IRoom, IUser, VideoConference, VideoConferenceInstructions } from '@rocket.chat/core-typings';
import type { PaginatedResult } from '@rocket.chat/rest-typings';

export type VideoConferenceJoinOptions = {
	mic?: boolean;
	cam?: boolean;
};

export interface IVideoConfService {
	start(caller: IUser['_id'], rid: string, title?: string): Promise<VideoConferenceInstructions>;
	join(uid: IUser['_id'], callId: VideoConference['_id'], options: VideoConferenceJoinOptions): Promise<string>;
	cancel(uid: IUser['_id'], callId: VideoConference['_id']): Promise<void>;
	get(callId: VideoConference['_id']): Promise<Omit<VideoConference, 'providerData'> | null>;
	getUnfiltered(callId: VideoConference['_id']): Promise<VideoConference | null>;
	list(roomId: IRoom['_id'], pagination?: { offset?: number; count?: number }): Promise<PaginatedResult<{ data: VideoConference[] }>>;
	setProviderData(callId: VideoConference['_id'], data: VideoConference['providerData'] | undefined): Promise<void>;
	listProviders(): Promise<{ key: string; label: string }[]>;
}
