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

You can optionally add a config object, this requires a `title`,
`description` and `key` as Strings, it also requires a `type`
value which can be any of the below

Valid options for `type`: 
- `list`: Combobox - this requires adding a new object 
  called `list` which contains a list of objects containing 
  a value, and a title. Check `chat.timeout` for an example
  of this.
- `boolean`: Checkbox - nothing special, just a checkboxx


### Adding new menu

---

In `modules.js` export a new object, this object
must include a method called `checkElement`