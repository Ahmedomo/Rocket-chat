import { addMigration } from '../../lib/migrations';
import { Apps } from '../../../app/apps/server/orchestrator';

addMigration({
	version: 246,
	up() {
		// we now have a compound index on appId + associations
		// so we can use the index prefix instead of a separate index on appId
		Apps.initialize();
		return Apps._persistModel?.tryDropIndex({ appId: 1 });
	},
});
