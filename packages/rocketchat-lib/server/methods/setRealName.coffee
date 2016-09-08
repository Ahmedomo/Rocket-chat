Meteor.methods
	setRealName: (name) ->

		check name, String

		if not Meteor.userId()
			throw new Meteor.Error('error-invalid-user', "Invalid user", { method: 'setRealName' })

		user = Meteor.user()

		if user.name is name
			return name

		if _.trim name
			name = _.trim name

		#unless RocketChat.models.Users.setName Meteor.userId(), name
		unless RocketChat.setRealName user._id, name
			throw new Meteor.Error 'error-could-not-change-name', "Could not change name", { method: 'setRealName' }

		return name

RocketChat.RateLimiter.limitMethod 'setRealName', 1, 1000,
	userId: (userId) -> return true
