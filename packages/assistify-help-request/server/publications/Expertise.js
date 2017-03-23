Meteor.publish('autocompleteExpertise', function (selector, limit = 50) {
	if (typeof this.userId === 'undefined' || this.userId === null) {
		return this.ready();
	}

	const publication = this;

	const user = RocketChat.models.Users.findOneById(this.userId);

	if (typeof user === 'undefined' || user === null) {
		return this.ready();
	}

	const pub = this;
	const options = {
		fields: {
			name: 1,
			t: 1
		}
	};

	const cursorHandle = RocketChat.models.Rooms.findByNameContainingTypesAndTags(selector.name, [{type: 'e'}], options).observeChanges({
		added: function (_id, record) {
			return pub.added('autocompleteRecords', _id, record);
		},
		changed: function (_id, record) {
			return pub.changed('autocompleteRecords', _id, record);
		},
		removed: function (_id, record) {
			return pub.removed('autocompleteRecords', _id, record);
		}
	});

	this.ready();

	this.onStop(function () {
		return cursorHandle.stop();
	});
});
