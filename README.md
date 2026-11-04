# shiplog-widget

The embeddable changelog widget served from `https://shiplog.cc/widget.js`. This is the exact source your visitors' browsers run when you embed a [Shiplog](https://shiplog.cc) changelog in your product.

Shiplog is a changelog SaaS for indie developers. This repo contains only the client-side embed script; the dashboard, API, and backend are part of the hosted service.

## Install

```html
<script src="https://shiplog.cc/widget.js"></script>
<script>
	Shiplog.init({
		appKey: 'your_widget_key'
	});
</script>
```

Get your `appKey` (an `slk_...` widget key) from your app's Widget installation page in the Shiplog dashboard.

## Init options

| Option        | Type    | Description                                                                   |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| `appKey`      | string  | **Required.** Your app's widget key                                           |
| `position`    | string  | `'bottom-left'` to pin the launcher left; default is bottom-right             |
| `hideLauncher`| boolean | `true` renders the floating button hidden (use with `trigger` or the JS API)  |
| `trigger`     | string  | CSS selector for your own element(s) that toggle the panel on click           |
| `accentColor` | string  | Hex color (`#rgb` or `#rrggbb`) for the launcher, badges, and accents         |
| `userId`      | string  | Your own user ID for read tracking; omit for anonymous visitors               |

## Programmatic API

```js
Shiplog.open();   // open the updates panel
Shiplog.close();  // close it
Shiplog.toggle(); // toggle it
```

Safe to call before `init()`; open/toggle queue until the widget is created.

## Read tracking

Anonymous visitors get a localStorage-backed `shiplog:anonymous-id` automatically, so the unread badge reflects what each visitor has actually seen. Pass `userId` to track reads against your own user identity instead.

## Notes

- The script resolves its API origin from its own `<script src>`, so it works from any page that can reach `shiplog.cc`.
- The `/api/widget/*` endpoints it calls are part of the hosted Shiplog service and are CORS-open by design.
- No dependencies, no build step. `widget.js` ships as-is.

## Contributing

PRs welcome for widget internals (rendering, a11y, init API). Features that need backend or API changes live in the hosted service; open an issue here first and it will be routed.

## License

[MIT](LICENSE)
