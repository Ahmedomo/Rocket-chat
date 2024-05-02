import * as path from 'node:path';

import type { StorybookConfig } from '@storybook/core-common';
import type { RuleSetRule } from 'webpack';

const config: StorybookConfig = {
	stories: ['../src/**/{*.story,story,*.stories,stories}.{js,tsx}'],
	addons: [
		{
			name: '@storybook/addon-essentials',
			options: {
				backgrounds: false,
			},
		},
		'@storybook/addon-postcss',
		'storybook-dark-mode',
	],
	core: {
		builder: 'webpack5',
	},
	webpackFinal: async (config) => {
		if (!config.resolve || !config.module) {
			throw new Error('Invalid webpack config');
		}

		config.resolve.alias = {
			...config.resolve.alias,
			'react': 'preact/compat',
			'react-dom/test-utils': 'preact/test-utils',
			'react-dom': 'preact/compat',
			'react/jsx-runtime': 'preact/jsx-runtime',
			[path.resolve('./src/lib/uiKit.js')]: path.resolve('./.storybook/mocks/uiKit.ts'),
		};

		const isRuleSetRule = (rule: any): rule is RuleSetRule => typeof rule === 'object';

		config.module.rules ??= [];

		config.module.rules = config.module.rules.map((rule) => {
			if (
				isRuleSetRule(rule) &&
				String(rule.test) === '/\\.(svg|ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\\?.*)?$/'
			) {
				rule.test = /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf|mp3|mp4)(\?.*)?$/;
			}
			return rule;
		});

		config.module.rules.unshift({
			test: /\.scss$/,
			use: [
				'style-loader',
				{
					loader: 'css-loader',
					options: {
						sourceMap: true,
						modules: true,
						importLoaders: 1,
					},
				},
				'sass-loader',
			],
		});

		const logoPath = path.resolve(path.join(__dirname, './logo.svg'));

		config.module.rules.push({
			test: (srcPath) => srcPath === logoPath,
			type: 'asset/resource',
			generator: { filename: 'static/media/[path][name][ext]' },
		});

		config.module.rules.push({
			test: (srcPath) => srcPath.endsWith('.svg') && srcPath !== logoPath,
			use: ['desvg-loader/preact', 'svg-loader'],
		});

		return config;
	},
};

module.exports = config;
