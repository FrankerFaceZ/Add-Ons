# FFZ: Better Right Click

---

### Modular right click menu for FrankerFaceZ

## Documentation

---

### Adding module to an existing menu

---

If we wanted to add something to the chat right click menu
for example, you would edit `chat.modules` in `modules.js`
and add a new object which function and optionally
`enabledByDefault` which will set the module to be enabled
by default. The key name for this object will be what is
displayed on the menu, for example a function with key
`open_in_new_tab` will be displayed as `Open in new Tab`.
The function takes an argument `brc` which is the current 
instance of the ffz-brc addon class as well as a `values` object
which-in the case of chat-contains the clicked user, their id, the
room of which the chat was sent in and the room id.

Example of simple module:
```javascript
open_in_new_tab   : {
    enabledByDefault: true,
    method          : (brc, values) => window.open(`https://twitch.tv/${values.user}`, '_blank')
}
```

List of all valid keys
- `title`
  - Required: false
  - Type: `String`
  - Description: The name of the module displayed in the 
    config, if not specified the menu key will be used
- `shortTitle`
  - Required: false
  - Type: `String`
  - Description: Shorter name used to display on the right
    click menu, if not set then will default to title
- `enabledByDefault`
  - Required: false
  - Type: `boolean`
  - Description: Whether the module should be enabled by
    default or not
- `requiresMod`
  - Required: false
  - Type: `boolean`
  - Description: If true then the module won't be displayed
    unless you are a moderator or broadcaster of the
    current channel
- `method`
  - Required: true
  - Type: `function`
  - Arguments: 
    - `brc: FFZBRC` The current instance of the addon
      class
    - `values: Object` All the attributes in the menu
      element, these can be modified in the menu's 
      `onClick` function
  - Description: Called when the module is clicked, 
- `config`: See below

You can optionally add a config object, this requires a `title`,
`description` and `key` as Strings, it also requires a `type`
value which can be any of the below

Valid options for `type`: 
- `list`: Combobox - this requires adding a new object 
  called `list` which contains a list of objects containing 
  a value, and a title. Check `chat.timeout` for an example
  of this.
- `boolean`: Checkbox - doesn't require any extra arguments
- `color`: RGB Menu - doesn't require any extra arguments


### Adding new menu

---

In `modules.js` export a new object, this object must include all
that is listed below

- `checkElement`
  - Required: true
  - Type: `function`
  - Arguments:
    - `element: HTMLElement` The clicked element
  - Description: Called when an element is right clicked to
    check if the menu should be shown or not

- `onClick`
  - Required: true
  - Type: `function` 
  - Arguments: 
    - `event: MouseEvent` The event called 
    - `element: HTMLElement` The menu element
  - Description: Called just before the menu is shown, any
    attributes set on the element passed will be passed
    when a module is clicked, and it's `method` is called

- `title`
  - Required: false
  - Type: `String`
  - Description: The name of the menu, if not specified
    the menu key will be used

- `description`
  - Required: false
  - Type: `String`
  - Description: Brief description shown at the top of the
    config sub-menu for the menu

- `modules`
  - Required: true
  - Type: `List`
  - Description: A list of modules [(See above)](#adding-module-to-an-existing-menu)