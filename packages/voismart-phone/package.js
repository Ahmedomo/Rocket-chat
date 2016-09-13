Package.describe({
	name: 'voismart:phone',
	version: '0.0.1',
	summary: 'Rocket.Chat Verto Integration'
});

Package.onUse(function(api) {
	api.versionsFrom('1.0');

	api.use([
		'coffeescript',
		'underscore',
		'less@2.5.0',
		'rocketchat:lib'
	]);

	api.use('templating', 'client');

	api.addFiles([
            'client/tabBar.coffee',
            'client/3rdparty/adapter-latest.js',
            'client/3rdparty/verto/jquery.json.min.js',
            'client/3rdparty/verto/jquery.jsonrpcclient.js',
            'client/3rdparty/verto/jquery.FSRTC.js',
            'client/3rdparty/verto/jquery.verto.js',
            'client/views/phone.html',
            'client/views/phonevideo.html',
            'client/views/phoneSettings.html',
            'client/views/phone.less',
            'client/views/phoneSettings.less',
            'client/views/phoneButtons.html',
            'client/phone.coffee',
            'client/phoneSettings.coffee',
            'client/phoneButtons.coffee'
    ], 'client');

    api.addFiles([
            'server/settings.coffee'
    ], 'server');

	api.addFiles([], 'server');
});
