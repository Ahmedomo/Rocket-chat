import { Stream } from '../Streamer';
import { NotificationsModule } from '../../../../../server/modules/notifications/notifications.module';
import { ISubscription } from '../../../../../definition/ISubscription';
import { IRoom } from '../../../../../definition/IRoom';
import { IUser } from '../../../../../definition/IUser';
import { ISetting } from '../../../../../definition/ISetting';
import { Collections, getConnection } from '../../mongo';
import { RoomsRaw } from '../../../../../server/models/raw/Rooms';
import { SubscriptionsRaw } from '../../../../../server/models/raw/Subscriptions';
import { UsersRaw } from '../../../../../server/models/raw/Users';
import { SettingsRaw } from '../../../../../server/models/raw/Settings';

const notifications = new NotificationsModule(Stream);

getConnection()
	.then((db) => {
		notifications.configure({
			Rooms: new RoomsRaw(db.collection<IRoom>(Collections.Rooms)),
			Subscriptions: new SubscriptionsRaw(db.collection<ISubscription>(Collections.Subscriptions)),
			Users: new UsersRaw(db.collection<IUser>(Collections.User)),
			Settings: new SettingsRaw(db.collection<ISetting>(Collections.Settings)),
		});
	});

export default notifications;
