Meteor.startup ->

	if Meteor.isCordova
		return

	Tracker.autorun ->
		user  = Meteor.user()
		if not user
			return

		enabled = RocketChat.settings.get('Phone_Enabled')
		wss = RocketChat.settings.get('Phone_WSS')

		if not enabled or not wss
			console.log("Phone not enabled or missing server url") if window.rocketDebug
			return

		plogin = user.phonelogin
		ppass = user.phonepassword

		if not plogin or not ppass
			console.log("Phone account data not set (yet)") if window.rocketDebug
			return

		RocketChat.Phone.start(plogin, ppass, wss)


Template.phone.events
	'click #phone_settings': (e, instance) ->
		showSettings =  instance.showSettings.get()
		instance.showSettings.set(!showSettings)

	'click .button.dialkey': (e, instance) ->
		value = _.trim $(e.target).val()
		display = instance.phoneDisplay.get()
		instance.phoneDisplay.set(display + value)
		RocketChat.Phone.dtmf(value)

	'change #phone-display': (e, instance) ->
		value = _.trim $(e.target).val()
		instance.phoneDisplay.set(value)

	'keypress #phone-display': (e, instance) ->
		if e.keyCode == 13
			number = instance.phoneDisplay.get()
			RocketChat.Phone.newCall(number)

	'click #phone-dial': (e, instance)->
		number = instance.phoneDisplay.get()
		RocketChat.Phone.dialKey(number)
		instance.phoneDisplay.set('')

	'click #phone-video-dial': (e, instance)->
		number = instance.phoneDisplay.get()
		RocketChat.Phone.dialKey(number, true)
		instance.phoneDisplay.set('')

	'click #phone-hangup': (e, instance)->
		if window.rocketDebug
			console.log "hangup"

		RocketChat.Phone.hangup()
		instance.phoneDisplay.set('')

	'click #phone-hold': (e, instance)->
		if window.rocketDebug
			console.log "toggle hold"

		status = RocketChat.Phone.toggleHold()
		if status
			$('#phone-hold').addClass('phone-active-key')
		else
			$('#phone-hold').removeClass('phone-active-key')

	'click #phone-mute': (e, instance)->
		if window.rocketDebug
			console.log "toggle mute"
		status = RocketChat.Phone.toggleMute()
		if status
			$('#phone-mute').addClass('phone-active-key')
		else
			$('#phone-mute').removeClass('phone-active-key')

	'click #phone-redial': (e, instance)->
		if window.rocketDebug
			console.log "redialing...."

		lastCalled = RocketChat.Phone.getLastCalled()
		if lastCalled
			instance.phoneDisplay.set(lastCalled)
			RocketChat.Phone.redial()

	'click #phone-clear': (e, instance)->
		if window.rocketDebug
			console.log "clearing display"

		instance.phoneDisplay.set('')

	'click #phone-transfer': (e, instance)->
		if window.rocketDebug
			console.log "transferring call..."

		number = instance.phoneDisplay.get()
		RocketChat.Phone.transfer(number)

	'click .button.fullscreen': (e, instance) ->
		i = document.getElementById("phonestream")
		if i.requestFullscreen
			i.requestFullscreen()
		else
			if i.webkitRequestFullscreen
				i.webkitRequestFullscreen()
			else
				if i.mozRequestFullScreen
					i.mozRequestFullScreen()
				else
					if i.msRequestFullscreen
						i.msRequestFullscreen()


Template.phone.helpers
	phoneDisplay: ->
		return Template.instance().phoneDisplay.get()

	showSettings: ->
		return Template.instance().showSettings.get()

	callIsActive: ->
		if Template.instance().callState.get() == 'active'
			return true

	callIsRinging: ->
		if Template.instance().callState.get() == 'ringing'
			return true

	callIsIdle: ->
		if Template.instance().callState.get()
			return false
		return true

	callState: ->
		return Template.instance().callState.get()

	callContact: ->
		return Template.instance().callContact.get()

	callOperation: ->
		return Template.instance().callOperation.get()

	displayCallStatus: ->
		if Template.instance().callState.get() and Template.instance().callContact.get()
			return true
		return false


Template.phone.onCreated ->
	@callState = new ReactiveVar null
	@showSettings = new ReactiveVar false
	@phoneDisplay = new ReactiveVar ""
	@callContact = new ReactiveVar ""
	@callOperation = new ReactiveVar ""


Template.phone.onDestroyed ->
	if window.rocketDebug
		console.log("Moving video tag out from containter")

	RocketChat.Phone.removeVideo()


Template.phone.onRendered ->
	@autorun ->
		if window.rocketDebug
			console.log("Moving video tag to its containter")
		Session.get('openedRoom')
		FlowRouter.watchPathChange()
		RocketChat.Phone.setTemplate(Template.instance())
		RocketChat.Phone.placeVideo()


RocketChat.Phone = new class
	_template = undefined

	_started = false
	_login = undefined
	_password = undefined
	_vertoHandle = undefined
	_server = undefined
	_videoTag = undefined

	_onHold = false
	_isMute = false

	_audioInDevice = undefined
	_audioOutDevice = undefined
	_videoDevice = null

	_curCall = null
	_dialogs = {}
	_callState = null

	_curResolutions = null
	_curVideoW = null
	_curVideoH = null

	constructor: ->
		if window.rocketDebug
			console.log("Starting a new Phone Handler")

	answer = (useVideo) ->
		if window.rocketDebug
			console.log "Will answer call"

		if useVideo
			useVideo = true
			_videoTag.css('display', 'block')
		else
			useVideo = false
			_videoTag.css('display', 'none')

		has_video = false
		if _videoDevice and (_videoDevice != "none") and useVideo
			has_video = true

		_curCall.answer({
			useVideo: has_video,
			useStereo: true,
			useCamera: _videoDevice,
			useSpeak: _audioOutDevice || "none",
			useMic: _audioInDevice || "none",
		}, {})

	onWSLogin = (verto, success) ->
		if window.rocketDebug
			console.log('onWSLogin', success)

	onWSClose = (verto, success) ->
		if window.rocketDebug
			console.log('onWSClose', success)

	setCallState = (state) ->
		_template.callState.set(state)
		_callState = state

	onDialogState = (d) ->
		if window.rocketDebug
			console.log('on rocket dialog ', d)
			console.log('current dialogs ', _dialogs)

		_dialogs[d.callID] = d

		if !_curCall?
			_curCall = d

		if d.callID != _curCall.callID
			switch d.state.name
				when 'ringing'
					console.log("refusing call")
					d.stopRinging()
					d.hangup({cause: "USER_BUSY", causeCode: 17})
				when 'hangup', 'destroy'
					delete _dialogs[d.callID]
			return

		if window.rocketDebug
			console.log "Processing state RQ:" + d.state.name

		switch d.state.name
			when 'trying', 'early'
				setCallState('active')
				RocketChat.TabBar.updateButton('phone', { class: 'phone-blinking' })

			when 'ringing'
				setCallState('ringing')
				RocketChat.TabBar.updateButton('phone', { class: 'phone-blinking' })
				RocketChat.TabBar.setTemplate "phone", ->
					if d.params.caller_id_name
						cid = d.params.caller_id_name
					else
						cid = d.params.caller_id_number
					msg = TAPi18n.__("Incoming_call_from")
					putNotification(msg, cid)
					notification =
						title: TAPi18n.__ "Phone_Call"
						text: TAPi18n.__("Incoming_call_from") + cid
						payload:
							rid: Session.get('openedRoom')
							sender: Meteor.user()

					KonchatNotification.showDesktop notification

			when 'active'
				setCallState('active')
				msg = TAPi18n.__("In_call_with")
				if d.direction.name == 'outbound'
					putNotification(msg, d.params.destination_number)
				else
					cid = d.params.caller_id_name + ' ' + d.params.caller_id_number
					putNotification(msg, cid)
				RocketChat.TabBar.updateButton('phone', { class: 'red' })

			when 'hangup'
				if _callState != 'transfer'
					if window.rocketDebug
						console.log("hangup call rq")
					_curCall.hangup()

				setCallState('hangup')
				_curCall = null
				clearNotification()
				RocketChat.TabBar.updateButton('phone', { class: '' })
				if d.answered or d.gotAnswer or d.cause == 'ORIGINATOR_CANCEL' or d.cause == 'NORMAL CLEARING'
					toastr.success TAPi18n.__('Phone_end_call')
				else
					msg = TAPi18n.__('Phone_failed_call')
					toastr.error(msg + ": " + d.cause)

			when 'destroy'
				if _callState != 'transfer' and _callState != 'hangup'
					if window.rocketDebug
						console.log("destroy call rq")
					_curCall.hangup()

				setCallState(null)
				_curCall = null
				clearNotification()
				delete _dialogs[d.callID]

	clearNotification = ->
		_template.callContact.set('')
		_template.callOperation.set('')

	putNotification = (msg, cid) ->
		_template.callContact.set(cid)
		_template.callOperation.set(msg)

	refreshVideoResolution = (resolutions) ->
		_curResolutions = resolutions.validRes
		if window.rocketDebug
			console.log ">>>>>>>>>< RESOLUTIONS >>>>>>>>>>>>>>>>>>"
			console.log resolutions
			console.log ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

	bootstrap = (status) =>
		if window.rocketDebug
			console.log _started
			console.log _vertoHandle
			console.log _login
			console.log _password
			console.log _server

		_vertoHandle = new jQuery.verto({
			login: _login,
			passwd: _password
			socketUrl: _server,
			ringFile: 'sounds/bell_ring2.wav',
			iceServers: true,
			tag: "phonestream"
			audioParams: {
				googEchoCancellation: true,
				googNoiseSuppression: true,
				googHighpassFilter: true
			},
			sessid: $.verto.genUUID(),
			deviceParams: {
				useCamera: _videoDevice,
				onResCheck: refreshVideoResolution
			}
		}, {
			onWSLogin: onWSLogin,
			onWSClose: onWSClose,
			onDialogState: onDialogState
		})
		_started = true

	setConfig = ->
		$.verto.refreshDevices(refreshDevices)
		conf = {
			audioInDevice: _audioInDevice
			audioOutDevice: _audioOutDevice
			videoDevice: _videoDevice
		}
		localStorage.setItem('MeteorPhoneConfig', $.toJSON(conf))

	getConfig = ->
		cached = localStorage.getItem('MeteorPhoneConfig')
		conf = $.parseJSON(cached)
		if not conf
			setConfig()
			return

		_audioInDevice = conf.audioInDevice
		_audioOutDevice = conf.audioOutDevice
		_videoDevice = conf.videoDevice

	refreshDevices = (what) ->
		if window.rocketDebug
			console.log ">>>>>>>>>> REFRESH DEVICES <<<<<<<<<<<<"
			console.log what
			console.log ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

		if _videoDevice
			$.FSRTC.getValidRes(_videoDevice, refreshVideoResolution)

	removeVideo: ->
		_videoTag.appendTo($("body"))
		_videoTag.css('display', 'none')
		_videoTag.css('visibility', 'hidden')
		if _curCall and _callState is 'active'
			_videoTag[0].play()

	setTemplate: (t) ->
		_template = t

	placeVideo: ->
		_videoTag.appendTo($("#phone-video"))
		_videoTag.css('visibility', 'visible')
		if _curCall and _callState is 'active'
			_videoTag.css('display', 'block')
			_videoTag[0].play()
		else
			_videoTag.css('display', 'none')

	transfer: (number) ->
		if _curCall and _callState is 'active'
			setCallState('transfer')
			_curCall.transfer(number)

	getLastCalled: ->
		return Session.get("VoiSmart::Phone::lastCalled")

	redial: () ->
		if !_curCall? and _callState is null
			@newCall(Session.get("VoiSmart::Phone::lastCalled"),
				Session.get("VoiSmart::Phone::lastUseVideo"))

	toggleMute: () ->
		if !_curCall?
			return

		_isMute = !_isMute
		_curCall.setMute('toggle')
		return _isMute

	toggleHold: () ->
		if !_curCall?
			return

		_onHold = !_onHold
		_curCall.toggleHold()
		return _onHold

	dtmf: (key) ->
		if !_curCall?
			return

		_curCall.dtmf(key)

	hangup: ->
		if !_curCall?
			if window.rocketDebug
				console.log "No call to hangup"
			return

		_curCall.hangup()
		_curCall = null

	dialKey: (number, useVideo) ->
		if !_curCall? and _callState is null
			@newCall(number, useVideo)
			return

		if _callState is 'ringing'
			answer(useVideo)
			return

		console.log('What Im doing here: ', _callState, ' ', _curCall)

	newCall: (destination, useVideo) ->
		if useVideo
			useVideo = true
		else
			useVideo = false
		Session.set("VoiSmart::Phone::lastUseVideo", useVideo)


		if !destination or destination is ''
			console.log("No number provided") if window.rocketDebug
			return

		if _curCall?
			console.log("Cannot call while in call") if window.rocketDebug
			return

		has_mic = RocketChat.Phone.getAudioInDevice()
		has_speak = RocketChat.Phone.getAudioOutDevice()
		if !has_mic? or !has_speak? or has_mic is "none" or has_speak is "none"
			console.log("not mic and speaker defined, should refuse call?") if window.rocketDebug
			#return # firefox still has issues in device selection

		if !has_mic? or has_mic is "none"
			# all browsers have a mic, so bail out if none
			toastr.error TAPi18n.__('Phone_invalid_devices')
			return

		has_video = false
		if _videoDevice and (_videoDevice != "none") and useVideo
			has_video = true

		_curCall = _vertoHandle.newCall({
			destination_number: destination,
			useVideo: has_video,
			useStereo: true,
			useCamera: _videoDevice,
			useSpeak: _audioOutDevice || "none",
			useMic: _audioInDevice || "none",
		}, {
			onDialogState: onDialogState
		})
		Session.set("VoiSmart::Phone::lastCalled", destination)
		msg = TAPi18n.__("Outgoing_call_to")
		putNotification(msg, destination)

	setVideoResolution: (idx) ->
		if idx is "0"
			_curVideoW = null
			_curVideoH = null
			delete _vertoHandle.videoParams.minWidth
			delete _vertoHandle.videoParams.maxWidth
			delete _vertoHandle.videoParams.minHeight
			delete _vertoHandle.videoParams.maxHeight
		else
			idx = idx - 1
			wxh = _curResolutions[idx]
			console.log(wxh) if window.rocketDebug
			_curVideoW = wxh[0]
			_curVideoH = wxh[1]
			_vertoHandle.videoParams({
				#width: _curVideoW,
				#height: _curVideoH
				minWidth: _curVideoW,
				minHeight: _curVideoH,
				maxWidth: _curVideoW,
				maxHeight: _curVideoH
			})

		_vertoHandle.videoParams({
			minFrameRate: 5,
			vertoBestFrameRate: 30
		})

	getResolutions: ->
		return _curResolutions

	setAudioInDevice: (id) ->
		_audioInDevice = id
		setConfig()

	getAudioInDevice: ->
		return _audioInDevice

	setAudioOutDevice: (id) ->
		_audioOutDevice = id
		setConfig()

	getAudioOutDevice: ->
		return _audioOutDevice

	setVideoDevice: (id) ->
		if id is 'none'
			id = null
		_videoDevice = id
		setConfig()

	getVideoDevice: ->
		return _videoDevice

	start: (login, password, server) ->
		console.log("Starting verto....") if window.rocketDebug

		if _started and (login != _login or _password != password or _server != server)
			_vertoHandle.logout()
			_vertoHandle = undefined
			_started = false
			console.log("Restarting an already started client") if window.rocketDebug

		if !_started
			console.log("Activating video element") if window.rocketDebug
			Blaze.render(Template.phonevideo, document.body)

		if _started and _vertoHandle
			console.log("Client already started, ignoring") if window.rocketDebug
			return

		_videoTag = $("#phonestream")

		_login = login
		_password = password
		_server = server

		getConfig()

		$.verto.init({}, bootstrap)

