import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { getConfig } from '../config';
import { defaultConfig } from '../shared/defaultConfig';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('getConfig should match defaultConfig by default', () => {
		const config = getConfig();
		assert.deepStrictEqual(config, defaultConfig);
	});

	test('package configuration should contain mapped keys and matching default values', () => {
		const packageJsonPath = path.resolve(__dirname, '../../package.json');
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
			contributes?: {
				configuration?: {
					properties?: Record<string, { default?: unknown }>;
				};
			};
		};

		const properties = packageJson.contributes?.configuration?.properties;
		assert.ok(properties, 'contributes.configuration.properties should exist in package.json');
		if (!properties) {
			throw new Error('contributes.configuration.properties should exist in package.json');
		}

		const expectedDefaults: Record<string, unknown> = {
			'tabPreview.retainWebview': defaultConfig.retainWebview,
			'tabPreview.size': defaultConfig.size,
			'tabPreview.icon.display': defaultConfig.icon.display,
			'tabPreview.icon.grayscale': defaultConfig.icon.grayscale,
			'tabPreview.icon.opacity': defaultConfig.icon.opacity,
			'tabPreview.icon.size': defaultConfig.icon.size,
			'tabPreview.icon.position': defaultConfig.icon.position,
			'tabPreview.showCloseButton': defaultConfig.showCloseButton,
			'tabPreview.thumbnail.display': defaultConfig.thumbnail.display,
			'tabPreview.thumbnail.theme': defaultConfig.thumbnail.theme,
			'tabPreview.thumbnail.fontSize': defaultConfig.thumbnail.fontSize,
			'tabPreview.thumbnail.lineHeight': defaultConfig.thumbnail.lineHeight,
			'tabPreview.thumbnail.renderCharacters': defaultConfig.thumbnail.renderCharacters,
			'tabPreview.thumbnail.opacity': defaultConfig.thumbnail.opacity,
			'tabPreview.thumbnail.onlyVisibleRange': defaultConfig.thumbnail.onlyVisibleRange,
		};

		for (const [configKey, expectedDefaultValue] of Object.entries(expectedDefaults)) {
			const configDefinition: { default?: unknown } | undefined = properties[configKey];
			assert.ok(configDefinition, `Missing configuration key: ${configKey}`);
			assert.strictEqual(
				configDefinition.default,
				expectedDefaultValue,
				`Default mismatch for ${configKey}`
			);
		}
	});
});
