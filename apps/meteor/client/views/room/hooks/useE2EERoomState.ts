import { useSyncExternalStore } from 'use-sync-external-store/shim';

import type { E2ERoomState } from '../../../../app/e2e/client/E2ERoomState';
import { useE2EERoom } from './useE2EERoom';

export const useE2EERoomState = (rid: string) => {
	const e2eRoom = useE2EERoom(rid);

	const subscribeE2EERoomState = [
		(callback: () => void): (() => void) => (e2eRoom ? e2eRoom.on('STATE_CHANGED', callback) : () => undefined),
		(): E2ERoomState | undefined => (e2eRoom ? e2eRoom.state : undefined),
	] as const;

	return useSyncExternalStore(...subscribeE2EERoomState);
};
