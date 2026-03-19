# TabPreview

TabPreview is a custom Ctrl+Tab switcher for VS Code with visual tab previews.

## Features

- Replaces the default editor switcher flow with a visual tab panel.
- Overrides the built-in VS Code `Ctrl+Tab` editor switching shortcut.
- Shows file icons and optional code thumbnails.
- Supports quick tab switching and tab closing from the panel.
- Provides extension settings for size, icon style, and thumbnail rendering.

## Usage

1. Press `Ctrl+Tab` to open the TabPreview panel.
2. Keep holding `Ctrl`, then press `Tab` (or `Shift+Tab`) to cycle selection.
3. Release `Ctrl` to switch to the selected tab.
4. Middle-click a tab item in TabPreview to close that tab directly.

## Command Visibility

The main command is intentionally hidden from Command Palette in `package.json`:

```json
"menus": {
	"commandPalette": [
		{
			"command": "tabpreview.showSwitcher",
			"when": "false"
		}
	]
}
```

## Settings

TabPreview contributes settings under the `tabPreview.*` namespace, including:

- `tabPreview.size`
- `tabPreview.icon.*`
- `tabPreview.showCloseButton`
- `tabPreview.thumbnail.*`

Use the command `tabpreview.settings` to quickly open the TabPreview UI settings page.

## Known Limitations

- Thumbnail rendering depends on available text document content in memory.
- Some non-file tabs (for example certain webview/terminal tabs) may use fallback identifiers.

## Development

- Build extension: `npm run compile`
- Build webview: `npm run webview:build`
- Watch mode: `npm run watch` and `npm run webview:watch`

## License

MIT
