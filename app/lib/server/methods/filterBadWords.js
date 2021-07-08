import Filter from 'bad-words';

import { settings } from '../../../settings';
import { callbacks } from '../../../callbacks';

callbacks.add('beforeSaveMessage', function(message) {
	console.log('filterBad Word');
	if (settings.get('Message_AllowBadWordsFilter')) {
		const badWordsList = settings.get('Message_BadWordsFilterList');
		let whiteList = settings.get('Message_BadWordsWhitelist');
		let options;

		// Add words to the blacklist
		if (!!badWordsList && badWordsList.length) {
			options = {
				list: badWordsList.split(','),
			};
		}
		const filter = new Filter(options);
		console.log('ed1');
		if (whiteList?.length) {
			whiteList = whiteList.split(',').map((word) => word.trim());
			filter.removeWords(...whiteList);
		}

		message.msg ? message.msg = filter.clean(message.msg) : message.title = filter.clean(message.title);
	}

	return message;
}, 1, 'filterBadWords');
