/*

Versopm 1.01
============

*/

const ExtensionUtils = imports.misc.extensionUtils;
const Extension      = ExtensionUtils.getCurrentExtension();
const Metadata       = Extension.metadata;
const Gettext        = imports.gettext;
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const GObject        = imports.gi.GObject;
const Gtk            = imports.gi.Gtk;
const Gdk            = imports.gi.Gdk;
const Lang           = imports.lang;
const _              = Gettext.domain("personalize").gettext;

const SETTINGS_APPLY_DELAY_TIME = 500; 

let settings     = null;
let themeUpdater = null;
let reloadExtensionAfterSomeTime = null;

function init() {

  settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.personalize");
  
}

function buildPrefsWidget() {

  let widget =   new Prefs_PersonalizeExtension();
  themeUpdater = new ThemeUpdater_PersonalizeExtension(); 
   
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, ()=> {    
    new ExtensionPreferencesWindow_PersonalizeExtension( widget );
    return false;
  });
 
  widget.show_all();  
  return widget;  
  
}

function reloadExtension() {

  if(reloadExtensionAfterSomeTime != null) {
      GLib.source_remove(reloadExtensionAfterSomeTime);
      reloadExtensionAfterSomeTime = null;
  }
  reloadExtensionAfterSomeTime = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SETTINGS_APPLY_DELAY_TIME, ()=> {
    settings.set_boolean("reload-signal", (settings.get_boolean("reload-signal")) ? false : true ); 
    reloadExtensionAfterSomeTime = null;
  });

}

const ExtensionPreferencesWindow_PersonalizeExtension = new GObject.Class({

  Name: 'ExtensionPreferencesWindow_PersonalizeExtension',

  _init: function( widget ) {
  
    this.toplevel  = widget.get_toplevel();
    this.headerBar = this.toplevel.get_titlebar();
    this.headerBar.custom_title = new Gtk.StackSwitcher({expand:true, halign: Gtk.Align.CENTER, visible: true, stack: widget});
    this.createAppMenu();  
    this.createRefreshButton();  
    
  },
  
  createAppMenu: function( ) {
      
    let preferencesDialogAction = new Gio.SimpleAction({ name: 'app.preferences'});  
    let helpDialogAction        = new Gio.SimpleAction({ name: 'app.help'});
    let aboutDialogAction       = new Gio.SimpleAction({ name: 'app.about'});
    let actionGroup             = new Gio.SimpleActionGroup();
    let menu                    = new Gio.Menu();
    let appMenu                 = new Gtk.PopoverMenu();
    let appMenuButton           = new Gtk.MenuButton({ popover: appMenu, image: new Gtk.Image({ gicon: new Gio.ThemedIcon({ name: "open-menu-symbolic" }), icon_size: Gtk.IconSize.BUTTON, visible: true, }), visible:true});
    
    actionGroup.add_action(aboutDialogAction)
    actionGroup.add_action(helpDialogAction)
    actionGroup.add_action(preferencesDialogAction)

    menu.append(_("Preferences"),             "app.preferences");  
    menu.append(_("Help"),                    "app.help"       );
    menu.append(_("About")+" "+Metadata.name, "app.about"      );

    appMenu.bind_model(menu, "app"); 
        
    this.headerBar.pack_end(appMenuButton);
    this.toplevel.insert_action_group('app', actionGroup);    
    
    preferencesDialogAction.connect('activate', ()=> {
      let dialog = new Gtk.Dialog({ title: _("Preferences"),transient_for: this.toplevel,use_header_bar: true, modal: true });
      let vbox                 = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });    
      this.resetExtensionButton = new ExtensionResetButton_PersonalizeExtension(this.toplevel );
      vbox.pack_start(this.resetExtensionButton,            false, false, 0);
      dialog.get_content_area().pack_start(vbox, false, false, 0);  
      dialog.show_all();  
    });

    helpDialogAction.connect('activate', ()=> {
      let dialog    = new Gtk.Dialog({ title: _("Help"), transient_for: this.toplevel, use_header_bar: true, modal: true });
      let vbox      = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 30 });    
      let firstInfo = new Gtk.Label({ justify: 0, use_markup: true, label: _(Metadata.description)});  
      vbox.pack_start(firstInfo,            false, false, 0);
      dialog.get_content_area().pack_start(vbox, false, false, 0);  
      dialog.show_all();  
    });    

    aboutDialogAction.connect('activate', ()=> {  
      let aboutDialog = new Gtk.AboutDialog({ transient_for: this.toplevel, modal: true, logo: (new Gtk.Image({ file: Extension.dir.get_child('eicon.png').get_path(), pixel_size: 128 })).get_pixbuf(), program_name: Metadata.name, version: Metadata.version.toString()+_(Metadata.status), comments: _(Metadata.comment), license_type: 3    } );
      aboutDialog.get_header_bar().get_custom_title().visible = true;
      aboutDialog.show_all();      
    });
    
    appMenu.connect("button-release-event", ()=> {
      appMenu.popdown();
    });
            
  },
  
  createRefreshButton: function() {
  
    let refreshButton = new Gtk.Button({ image: new Gtk.Image({ gicon: new Gio.ThemedIcon({ name: "view-refresh-symbolic" }), icon_size: Gtk.IconSize.BUTTON, visible: true, }), visible:true}); 
    refreshButton.connect('clicked', ()=> {
      themeUpdater.reloadTheme();
    });
    this.headerBar.pack_start(refreshButton);

  },  
  
});

const ExtensionResetButton_PersonalizeExtension =  new GObject.Class({

  Name: 'ExtensionReseter_PersonalizeExtension',

  _init: function( object ) {
    
    this.resetExtensionButton = new Gtk.Button({label: _("Reset Personalize Extension"),halign:Gtk.Align.CENTER});
    this.resetExtensionButton.connect('clicked', ()=> { this.resetExtension( object, "updateDone", true ) });    
    return this.resetExtensionButton;
    
  },
  
  resetExtension: function( object, functionToBeCalledAtTheEnd, parameter ) {
  
    let dialog = new Gtk.MessageDialog({ transient_for: object.get_toplevel ? object.get_toplevel() : object, modal: true });  
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    dialog.add_button(Gtk.STOCK_OK, Gtk.ResponseType.OK);
    dialog.set_markup("<big><b>"+_("Reset Personalize to defaults?")+"</b></big>");
    dialog.get_message_area().pack_start(new Gtk.Label({ wrap: true, justify: 3, use_markup: true, label: _("Resetting the extension will discard the current preferences configuration and restore default one.")}), true, true, 0);
    dialog.connect('response', Lang.bind(this, function(dialog, id) {
      if(id != Gtk.ResponseType.OK) {
        dialog.destroy();  
        return;
      }
      
      settings.reset('theme-variant');
      settings.reset('window-corner-curvature-radius');
      settings.reset('accent-color');
      settings.reset("accent-color-selected-bg-color");
      settings.reset("accent-color-selected-borders-color");
      settings.reset("accent-color-link-color");
      settings.reset("accent-color-link-visited-color"); 
      settings.reset("accent-color-accent-gradient-color-first");
      settings.reset("accent-color-accent-gradient-color-second");
      settings.reset("accent-color-accent-gradient-color-third");
      settings.reset("accent-color-accent-gradient-color-fourth"); 
      settings.reset("accent-color-accent-gradient-color-fifth");
      settings.reset("accent-color-accent-gradient-color-sixth"); 
      settings.reset("accent-color-accent-active-hover-color");
      settings.reset("shell-panel-bottom-border-color"); 
      settings.reset("shell-button-focus-color");       

      dialog.destroy();
      if(object[functionToBeCalledAtTheEnd]) {
        object[functionToBeCalledAtTheEnd]( parameter );
      }
      themeUpdater.reloadTheme();
      
    }));
    
    dialog.show_all();
   
  },
  
})

const Prefs_PersonalizeExtension = new GObject.Class({

  Name: 'Prefs_PersonalizeExtension',
  Extends: Gtk.Stack,
    
  _init: function() {

    this.tweaksPrefs  = new PrefsWindowForTheme_PersonalizeExtension();
    this.colorPrefs   = new PrefsWindowForColors_PersonalizeExtension();
    
    this.colorPrefsPrefsWindow = new Gtk.ScrolledWindow({hexpand: true,shadow_type: Gtk.ShadowType.IN});
    this.colorPrefsPrefsWindow.add(this.colorPrefs);
        
    this.parent({ transition_type: 6  ,transition_duration: 200 });
    this.add_titled(this.tweaksPrefs,             "Theme",    _("Theme")  );      
    this.add_titled(this.colorPrefsPrefsWindow,   "Colors",   _("Colors")  );      
    this.tweaksPrefs.displayPrefs();
    this.colorPrefs.displayPrefs();

  },

});

const PrefsWindow_PersonalizeExtension = new GObject.Class({

  Name: 'PrefsWindow_PersonalizeExtension',
  Extends: Gtk.Grid,

  _init: function(action) {
      
    this.parent({ column_spacing: 40, halign: Gtk.Align.CENTER, margin: 20,margin_top:0, row_spacing: 20 ,border_width:20});
    this.addGrids();
    this.action = action;
     
  },

  addGrids: function() {

    this.switchBox0 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20, margin_top: 10, row_spacing: 0  ,border_width:0 });
    this.switchBox1 = new Gtk.Grid({ column_spacing: 30, halign: Gtk.Align.CENTER, margin: 20,                 row_spacing: 0  ,border_width:0 });
    
    this.attach(this.switchBox0, 0, 0,  5, 1);
    this.attach(this.switchBox1, 0, 10, 5, 1);

  },
   
  emptyLine: function(posY) {
  
    this.attach(new Gtk.Label({ xalign: 1, label: "" ,halign: Gtk.Align.CENTER }) ,0  ,posY ,1  ,1);
    
  },

  insertSpace: function(LABEL,posX,posY,sBox) {
  
    sBox.attach(new Gtk.Label({ xalign: 1, label: LABEL ,halign: Gtk.Align.CENTER }), posX, posY, 1, 1);
    
  }, 
  
  prefColor: function(KEY, posX, posY, space) {
  
    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let settingColor = new Gtk.ColorButton({use_alpha: true});
    let color = new Gdk.RGBA();
    let refresh = true;
    color.parse(settings.get_string(KEY));
    settingColor.set_rgba(color);
    settingColor.connect('color-set', Lang.bind(this, function(widget) {
      refresh = false;
      settings.set_string(KEY, settingColor.get_rgba().to_string());
      themeUpdater.reloadTheme(KEY)
      refresh = true;
    })); 
    
    settings.connect("changed::"+KEY, () => {
      if(refresh == true) {
        color.parse(settings.get_string(KEY));
        settingColor.set_rgba(color);
      }
    });
    
    this.attach(settingLabel, posX,       posY, space, 1);
    this.attach(settingColor, posX+space, posY, 1,     1);
    
  },

  prefsWA: function( KEY, posX, posY, sbox, space = 1 ) {
  
    let SettingLabel0  = new Gtk.Label({ xalign: 1, label:_(settings.settings_schema.get_key(KEY).get_summary()),halign: Gtk.Align.START });
    let SettingSwitch0 = new Gtk.Switch({hexpand: false, active: settings.get_boolean(KEY), halign: Gtk.Align.END});
    let prefsSwitchBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin: 0,hexpand:true});
        
    SettingSwitch0.connect("notify::active", Lang.bind(this, function(button) {
      settings.set_boolean(KEY, button.active);
      themeUpdater.reloadTheme();
    }));

    settings.connect("changed::"+KEY, () => {
      SettingSwitch0.set_active(settings.get_boolean(KEY));
    });
   
    prefsSwitchBox.add(SettingSwitch0);
    this.attach(SettingLabel0,  posX,       posY, space, 1);
    this.attach(prefsSwitchBox, posX+space, posY, 1,     1);
    
  },  

});

const PrefsWindowForColors_PersonalizeExtension = new GObject.Class({

  Name: 'PrefsWindowForColors_PersonalizeExtension',
  Extends: PrefsWindow_PersonalizeExtension,

  _init: function() {  
  
    this.parent();
    
  },  
  
  displayPrefs: function() {
  
    this.margin_top = 20;
    let pos = 0;
    
    this.prefColor("accent-color-selected-bg-color",            0, pos++, 7);
    this.prefColor("accent-color-selected-borders-color",       0, pos++, 7);
    this.prefColor("accent-color-link-color",                   0, pos++, 7);
    this.prefColor("accent-color-link-visited-color",           0, pos++, 7); 
    this.prefColor("accent-color-accent-gradient-color-first",  0, pos++, 7);
    this.prefColor("accent-color-accent-gradient-color-second", 0, pos++, 7);
    this.prefColor("accent-color-accent-gradient-color-third",  0, pos++, 7);
    this.prefColor("accent-color-accent-gradient-color-fourth", 0, pos++, 7); 
    this.prefColor("accent-color-accent-gradient-color-fifth",  0, pos++, 7);
    this.prefColor("accent-color-accent-gradient-color-sixth",  0, pos++, 7); 
    this.prefColor("accent-color-accent-active-hover-color",    0, pos++, 7);
    this.prefColor("shell-panel-bottom-border-color",           0, pos++, 7); 
    this.prefColor("shell-button-focus-color",                  0, pos++, 7); 
    
  }
  
});

const PrefsWindowForTheme_PersonalizeExtension = new GObject.Class({

  Name: 'PrefsWindowForTheme_PersonalizeExtension',
  Extends: PrefsWindow_PersonalizeExtension,

  _init: function() {  
  
    this.parent();
    
  },
       
  displayPrefs: function() {
  
    this.margin_top     = 20;
    let pos=0;
    
    this.prefRadio("theme-variant",                0, pos++, ['gtk-contained.css', 'gtk-contained-dark.css'], [_('Light'), _('Dark')], 7 );
    this.prefsWA("allow-dark",                     0, pos++, this.switchBox0,                                                          7 );     
    this.prefColor("accent-color",                 0, pos++,                                                                           7 );    
    this.prefInt("window-corner-curvature-radius", 0, pos++,                                                                           7 );
    
  },
  
  prefInt: function(KEY,posX,posY,space) {

    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let timeSetting = Gtk.SpinButton.new_with_range(0,10000, 1);
    timeSetting.set_value(settings.get_int(KEY));
    timeSetting.connect('notify::value', function(spin) {
      settings.set_int(KEY,spin.get_value_as_int());
    });

    this.attach(settingLabel, posX,       posY, space, 1);
    this.attach(timeSetting,  posX+space, posY, 1,     1);
    
  },
  
  prefRadio: function(KEY, posX, posY, options, items,space) {
  
    let settingLabel = new Gtk.Label({xalign: 1, label: _(settings.settings_schema.get_key(KEY).get_summary()), halign: Gtk.Align.START});  
    let currentMode = settings.get_string(KEY);
    let box = new Gtk.Grid({ halign: Gtk.Align.CENTER, column_spacing: 20 });    
    let radio = null;
    for (let i = 0; i < options.length; i++) {
      radio = new Gtk.RadioButton({ label: items[i], group: radio });
      radio.active = (currentMode == options[i]) ? true: false;
      radio.connect('toggled', button => {
        if(button.active) {    
          settings.set_string(KEY, options[i]);
          themeUpdater.reloadTheme( "", true, options[i] );
        }
      });
      box.add(radio);
    }
    
    this.attach(settingLabel, posX,       posY,  space, 1);
    this.attach(box,          posX+space, posY,  1,     1);       
    
  },
  
});

const ThemeUpdater_PersonalizeExtension = new GObject.Class({

  Name: 'ThemeUpdater_PersonalizeExtension',
  
  _init: function() {
  
    this.setPathAndInstallTweakedTheme();
  
  },
  
  decimalToHexadecimalColor: function( number) {

      let hexString = "";
      let remainder = 0;
      let numStringStack = [];
      
      while( number != 0 ) { 
        remainder = number%16;
        number = Math.floor(number/16);
        numStringStack.unshift((remainder > 9)? String.fromCharCode(65+remainder-10): remainder.toString());
      }
      
      while(numStringStack.length < 2) {
        numStringStack.unshift("0");
      }
      
      let len = numStringStack.length;
      remainder = 0;
      for(remainder = 0; remainder < len; remainder++) {
        hexString += numStringStack[remainder];
      }
            
      return hexString;
  
  },

  generateColorsFromRgbString: function( rgbString, updateAllColor ) {
   
    let selected_bg_color = "#";
    let selected_borders_color = "#";
    let link_color = "#";
    let link_visited_color = "#";
    let accent_gradient_color_first = "#";
    let accent_gradient_color_second = "#";
    let accent_gradient_color_third = "#";
    let accent_gradient_color_fourth = "#";
    let accent_gradient_color_fifth = "#";    
    let accent_active_hover_color   = "#";
    let accent_gradient_color_sixth = "#";   
    let nautilus_disk_space_used_color = "#";
    let panel_bottom_border_color = "#";
    let button_focus_color = "(";
    let accent_gradient_color_seventh = "#";
    
    let len = rgbString.length-1
    let num = 0;
    let colors=[0,0,0];
    let colorIndex = 0;
    
    rgbString = rgbString.replaceAll("rgba","");
    rgbString = rgbString.replaceAll("rgb","");
    
    for( let i=1; i<len; i++) {
      switch(rgbString[i]) {
        case ",": 
        case ")":
        case ".":
          colors[colorIndex++] = num;
          num = 0;
          break;
          
        default:
          num = num*10+parseInt(rgbString[i]); 
      }
    }
    
    selected_bg_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
    
    if(!updateAllColor) {
      return [ this.rgbaToHexadecimalColor(settings.get_string("accent-color-selected-bg-color")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-selected-borders-color")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-link-color")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-link-visited-color")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-first")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-second")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-third")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-fourth")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-fifth")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-sixth")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-active-hover-color")), this.rgbaToHexadecimalColor(settings.get_string("nautilus-disk-space-used-color")), this.rgbaToHexadecimalColor(settings.get_string("shell-panel-bottom-border-color")), this.manageRgbaStrings(settings.get_string("shell-button-focus-color")), this.rgbaToHexadecimalColor(settings.get_string("accent-color-accent-gradient-color-seventh")) ];
    }
    
    colors[0] = (colors[0] > 29 ) ? colors[0]-29: colors[0];
    colors[1] = (colors[1] > 37 ) ? colors[1]-37: colors[1];
    colors[2] = (colors[2] > 48 ) ? colors[2]-48: colors[2];
    selected_borders_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
    
    colors[0] = (colors[0] < 253) ? colors[0]+3 : colors[0];
    colors[1] = (colors[1] < 244) ? colors[1]+11: colors[1];
    colors[2] = (colors[2] < 232) ? colors[2]+23: colors[2];
    link_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
    
    colors[0] = (colors[0] > 6) ? colors[0]-6: colors[0];
    colors[1] = (colors[1] > 23) ? colors[1]-23: colors[1];
    colors[2] = (colors[2] > 45) ? colors[2]-45 : colors[2];  
    link_visited_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
      
    colors[0] = (colors[0] < 201) ? colors[0]+54: colors[0];
    colors[1] = (colors[1] < 182) ? colors[1]+63: colors[1];
    colors[2] = (colors[2] < 182) ? colors[2]+73 : colors[2];  
    accent_gradient_color_first += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] < 237) ? colors[0]+18: colors[0];
    colors[1] = (colors[1] < 244) ? colors[1]+11: colors[1];
    colors[2] = (colors[2] < 253) ? colors[2]+2 : colors[2];  
    accent_gradient_color_second += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] > 22) ? colors[0]-22: colors[0];
    colors[1] = (colors[1] > 28) ? colors[1]-28: colors[1];
    colors[2] = (colors[2] >  3) ? colors[2]-3 : colors[2];  
    accent_gradient_color_third += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] < 228) ? colors[0]+27: colors[0];
    colors[1] = (colors[1] < 225) ? colors[1]+30: colors[1];
    colors[2] = (colors[2] < 251) ? colors[2]+4 : colors[2];  
    accent_gradient_color_fourth += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] > 41) ? colors[0]-41: colors[0];
    colors[1] = (colors[1] > 24) ? colors[1]-24: colors[1];
    colors[2] = (colors[2] >  5) ? colors[2]-5 : colors[2];  
    accent_gradient_color_fifth += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] > 22) ? colors[0]-22: colors[0];
    colors[1] = (colors[1] > 14) ? colors[1]-14: colors[1];
    colors[2] = (colors[2] >  3) ? colors[2]-3 : colors[2];  
    accent_gradient_color_sixth += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    colors[0] = (colors[0] < 238) ? colors[0]+17: colors[0];
    colors[1] = (colors[1] < 252) ? colors[1]+3 : colors[1];
    colors[2] = (colors[2] < 230) ? colors[2]+15: colors[2];  
    accent_active_hover_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
    
    colors[0] = (colors[0] < 193) ? colors[0]+62: colors[0];
    colors[1] = (colors[1] < 220) ? colors[1]+35: colors[1];
    colors[2] = (colors[2] < 251) ? colors[2]+4 : colors[2];  
    nautilus_disk_space_used_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);
    
    colors[0] = (colors[0] > 83)  ? colors[0]-83: colors[0];
    colors[1] = (colors[1] > 41)  ? colors[1]-41: colors[1];
    colors[2] = (colors[2] < 237) ? colors[2]+18: colors[2];  
    panel_bottom_border_color += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);    

    colors[0] = (colors[0] > 4)  ? colors[0]-4: colors[0];
    colors[1] = (colors[1] > 12)  ? colors[1]-12: colors[1];
    colors[2] = (colors[2] > 22) ? colors[2]-22: colors[2];  
    button_focus_color += colors[0].toString()+", " + colors[1].toString()+", "+colors[2].toString()+","; 
    
    colors[0] = (colors[0] < 238) ? colors[0]+17: colors[0];
    colors[1] = (colors[1] < 234) ? colors[1]+21: colors[1];
    colors[2] = (colors[2] < 231) ? colors[2]+24: colors[2];        
    accent_gradient_color_seventh += this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]);

    settings.set_string("accent-color-selected-bg-color",            this.hexadecimalToRgbColor(selected_bg_color)             );
    settings.set_string("accent-color-selected-borders-color",       this.hexadecimalToRgbColor(selected_borders_color)        ); 
    settings.set_string("accent-color-link-color",                   this.hexadecimalToRgbColor(link_color)                    ); 
    settings.set_string("accent-color-link-visited-color",           this.hexadecimalToRgbColor(link_visited_color)            );
    settings.set_string("accent-color-accent-gradient-color-first",  this.hexadecimalToRgbColor(accent_gradient_color_first)   );
    settings.set_string("accent-color-accent-gradient-color-second", this.hexadecimalToRgbColor(accent_gradient_color_second)  ); 
    settings.set_string("accent-color-accent-gradient-color-third",  this.hexadecimalToRgbColor(accent_gradient_color_third)   ); 
    settings.set_string("accent-color-accent-gradient-color-fourth", this.hexadecimalToRgbColor(accent_gradient_color_fourth)  ); 
    settings.set_string("accent-color-accent-gradient-color-fifth",  this.hexadecimalToRgbColor(accent_gradient_color_fifth)   ); 
    settings.set_string("accent-color-accent-gradient-color-sixth",  this.hexadecimalToRgbColor(accent_gradient_color_sixth)   );
    settings.set_string("accent-color-accent-active-hover-color",    this.hexadecimalToRgbColor(accent_active_hover_color)     );
    settings.set_string("nautilus-disk-space-used-color",            this.hexadecimalToRgbColor(nautilus_disk_space_used_color));
    settings.set_string("shell-panel-bottom-border-color",           this.hexadecimalToRgbColor(panel_bottom_border_color)     );
    settings.set_string("shell-button-focus-color",                  "rgba"+button_focus_color+"0.6)") ;
    settings.set_string("accent-color-accent-gradient-color-seventh",  this.hexadecimalToRgbColor(accent_gradient_color_seventh)   );
           
    return [ selected_bg_color, selected_borders_color, link_color, link_visited_color, accent_gradient_color_first, accent_gradient_color_second, accent_gradient_color_third, accent_gradient_color_fourth, accent_gradient_color_fifth, accent_gradient_color_sixth, accent_active_hover_color, nautilus_disk_space_used_color, panel_bottom_border_color, button_focus_color, accent_gradient_color_seventh ];
     
  }, 
  
  generateThemeFiles: function( updateAllColor = false) {
 
    let variant = settings.get_string("theme-variant");
    let colors = this.generateColorsFromRgbString(settings.get_string("accent-color"), updateAllColor);
    
    //Generate Gtk-2 Theme
    this.fileData = (variant == "gtk-contained.css") ? String(GLib.file_get_contents( Extension.path+"/theme/gtk_2_template_light" )[1]): String(GLib.file_get_contents( Extension.path+"/theme/gtk_2_template_dark" )[1]);    

    this.fileData = this.setValueToVariables("/*Accent_Color_selected_bg_color*/",            colors[0], this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_link_color*/",                   colors[2], this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_link_visited_color*/",           colors[3], this.fileData );

    GLib.file_set_contents(this.THEME_PATH+"/gtk-2.0/gtkrc", this.fileData);  
    
    //Generate Gtk-3 Theme
    this.fileData     = String(GLib.file_get_contents( Extension.path+"/theme/gtk_3_template.css" )[1]);
    this.fileDataDark = String(GLib.file_get_contents( Extension.path+"/theme/gtk_3_template.css" )[1]);

    this.fileData     = this.fileData.replace("/*Theme_Variant*/@import url(\"resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css\")", "@import url(\"resource:///org/gtk/libgtk/theme/Adwaita/"+variant+"\")");
    this.fileDataDark = this.fileDataDark.replace("/*Theme_Variant*/@import url(\"resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css\")", "@import url(\"resource:///org/gtk/libgtk/theme/Adwaita/gtk-contained-dark.css\")");

    this.fileData = this.setValueToVariables("/*Accent_Color_selected_bg_color*/",             colors[0],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_selected_borders_color*/",        colors[1],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_link_color*/",                    colors[2],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_link_visited_color*/",            colors[3],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_first*/",   colors[4],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_second*/",  colors[5],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_third*/",   colors[6],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fourth*/",  colors[7],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fifth*/",   colors[8],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_sixth*/",   colors[9],  this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_active_hover_color*/",     colors[10], this.fileData );
    this.fileData = this.setValueToVariables("/*Nautilus_Disk_Space_Used_Color*/",             colors[11], this.fileData );
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_seventh*/", colors[14], this.fileData );

    if(variant == "gtk-contained-dark.css") {
      this.fileData = this.removeCodeFragment("/*Libhandy_Widgets_Light_Variant_Start*/\n", "/*Libhandy_Widgets_Light_Variant_End*/\n", this.fileData );
      this.fileData = this.fileData.replace("/*Libhandy_Widgets_Dark_Variant_Start*/\n", "" );
      this.fileData = this.fileData.replace("/*Libhandy_Widgets_Dark_Variant_End*/\n", "" );
    }
    else {
      this.fileData = this.removeCodeFragment("/*Libhandy_Widgets_Dark_Variant_Start*/\n", "/*Libhandy_Widgets_Dark_Variant_End*/\n", this.fileData );
      this.fileData = this.fileData.replace("/*Libhandy_Widgets_Light_Variant_Start*/\n", "" );
      this.fileData = this.fileData.replace("/*Libhandy_Widgets_Light_Variant_End*/\n", "" );      
    }

    this.fileDataDark = this.setValueToVariables("/*Accent_Color_selected_bg_color*/",             colors[0],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_selected_borders_color*/",        colors[1],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_link_color*/",                    colors[2],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_link_visited_color*/",            colors[3],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_first*/",   colors[4],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_second*/",  colors[5],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_third*/",   colors[6],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fourth*/",  colors[7],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fifth*/",   colors[8],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_sixth*/",   colors[9],  this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_active_hover_color*/",     colors[10], this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Nautilus_Disk_Space_Used_Color*/",             colors[11], this.fileDataDark );
    this.fileDataDark = this.setValueToVariables("/*Accent_Color_accent_gradient_color_seventh*/", colors[14], this.fileDataDark );
    
    this.fileDataDark = this.removeCodeFragment("/*Libhandy_Widgets_Light_Variant_Start*/\n", "/*Libhandy_Widgets_Light_Variant_End*/\n", this.fileDataDark );
    this.fileDataDark = this.fileDataDark.replace("/*Libhandy_Widgets_Dark_Variant_Start*/\n", "" );
    this.fileDataDark = this.fileDataDark.replace("/*Libhandy_Widgets_Dark_Variant_End*/\n", "" );

    let pos = this.fileData.indexOf("/*Border_Curvature*/");
    pos = pos + 20;
    nextPos = this.fileData.indexOf("px",pos);
    accentColorStop = this.fileData.substring(pos, nextPos);
    this.fileData     = this.fileData.replaceAll("/*Border_Curvature*/"+accentColorStop+"px", settings.get_int("window-corner-curvature-radius")+"px");
    this.fileDataDark = this.fileDataDark.replaceAll("/*Border_Curvature*/"+accentColorStop+"px", settings.get_int("window-corner-curvature-radius")+"px");
 
    GLib.file_set_contents(this.THEME_PATH+"/gtk-3.0/gtk.css",      this.fileData);
    if(settings.get_boolean("allow-dark")) {
      GLib.file_set_contents(this.THEME_PATH+"/gtk-3.0/gtk-dark.css", this.fileDataDark);
    }
    else {
      if(GLib.file_get_contents(this.THEME_PATH+"/gtk-3.0/gtk-dark.css")[0]) {
        GLib.spawn_command_line_sync("rm "+this.THEME_PATH+"/gtk-3.0/gtk-dark.css");
      }
    }
    
    //Generate GNOME Shell Theme
    this.fileData = String(GLib.file_get_contents( Extension.path+"/theme/gnome_shell_template.css" )[1]);
    
    this.fileData = this.setValueToVariables("/*Accent_Color_selected_bg_color*/",            colors[0], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_selected_borders_color*/",       colors[1], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_link_color*/",                   colors[2], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_link_visited_color*/",           colors[3], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_first*/",  colors[4], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_second*/", colors[5], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_third*/",  colors[6], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fourth*/", colors[7], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_fifth*/",  colors[8], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_gradient_color_sixth*/",  colors[9], this.fileData);
    this.fileData = this.setValueToVariables("/*Accent_Color_accent_active_hover_color*/",    colors[10], this.fileData);    
    this.fileData = this.setValueToVariables("/*Accent_Color_panel_bottom_border_color*/",    colors[12], this.fileData);    
    this.fileData = this.setValueToVariables("/*Accent_Color_button_focus_color*/",           colors[13], this.fileData, 14);    
        
    GLib.file_set_contents(this.THEME_PATH+"/gnome-shell/gnome-shell.css", this.fileData);
  
  },

  getDecimalValue: function( hexDigit ) {
  
    switch(hexDigit) {
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        return parseInt(hexDigit);
      case "A":
        return 10;
      case "B":
        return 11;
      case "C":
        return 12;      
      case "D":
        return 13;
      case "E":
        return 14;
      case "F":
        return 15;
      default: 
        return 0;
    }
  
  },
  
  hexadecimalToDecimalColor: function( hex ) {

    return (16*this.getDecimalValue(hex[0])+this.getDecimalValue(hex[1])).toString();
  
  },  

  hexadecimalToRgbColor: function( hexColor) {
  
    return "rgb("+this.hexadecimalToDecimalColor( hexColor.substring(1,3) )+","+this.hexadecimalToDecimalColor( hexColor.substring(3,5) )+","+this.hexadecimalToDecimalColor( hexColor.substring(5,7) )+")";
  
  },
  
  manageGtk2Theme: function( variant ) {
  
    GLib.spawn_command_line_sync("rm "+this.THEME_PATH+"/gtk-2.0/assets");
    (variant == "gtk-contained.css") ? GLib.spawn_command_line_sync("ln -sf "+this.THEME_PATH+"/gtk-2.0/assets-light "+this.THEME_PATH+"/gtk-2.0/assets"):GLib.spawn_command_line_sync("ln -sf "+this.THEME_PATH+"/gtk-2.0/assets-dark "+this.THEME_PATH+"/gtk-2.0/assets");
      
  },

  manageRgbaStrings: function( rgbaString ) {
  
    rgbaString = rgbaString.replaceAll("rgba","");
    rgbaString = rgbaString.replaceAll("rgb","");
    let i = rgbaString.indexOf(")",2);
    return rgbaString.substring(0, i);
    
  },
  
  reloadTheme: function(KEY, manageGtk2Assets = false, variant="gtk-contained.css" ) {
    
    if(this.isInstalled) {
      if(manageGtk2Assets) {
        this.manageGtk2Theme(variant);
      }
      this.generateThemeFiles(KEY=="accent-color");
      reloadExtension();
    }
    
  },  

  removeCodeFragment: function( startingPoint, endPoint, fileDataVariable ) {
  
    let startingPos  = fileDataVariable.indexOf(startingPoint);
    let endingPos    = fileDataVariable.indexOf(endPoint)+endPoint.length;   
    fileDataVariable = fileDataVariable.replaceAll( fileDataVariable.substring( startingPos, endingPos ), "" );
    return fileDataVariable;
      
  },
  
  rgbaToHexadecimalColor: function( rgbString ) {
  
    let len = rgbString.length-1
    let num = 0;
    let colors=[0,0,0];
    let colorIndex = 0;
    
    rgbString = rgbString.replaceAll("rgba","");
    rgbString = rgbString.replaceAll("rgb","");
    
    for( let i=1; i<len; i++) {
      switch(rgbString[i]) {
        case ",": 
        case ")":
        case ".":
          colors[colorIndex++] = num;
          num = 0;
          break;
          
        default:
          num = num*10+parseInt(rgbString[i]); 
      }
    }
    
    return ("#" + this.decimalToHexadecimalColor(colors[0]) + this.decimalToHexadecimalColor(colors[1]) + this.decimalToHexadecimalColor(colors[2]));
    
  },
  
  setPathAndInstallTweakedTheme: function() {
    
    this.isInstalled = false;
    this.THEME_PATH = "/home/"+GLib.spawn_command_line_sync("whoami")[1]+"/.themes/";
    this.THEME_PATH = this.THEME_PATH.replace("\n","");
    try {
      GLib.spawn_command_line_sync("cd "+this.THEME_PATH);
    }
    catch(error) {
      try {
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH);
      }
      catch(error) {
        return;
      }
    }  
    try {
      this.fileData = String(GLib.file_get_contents(this.THEME_PATH+"Adwaita-Personalized/index.theme"));
    }
    catch(error) {
      try {
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH);
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH+"Adwaita-Personalized");
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH+"Adwaita-Personalized/gtk-3.0");
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH+"Adwaita-Personalized/gtk-2.0");
        GLib.spawn_command_line_sync("mkdir "+this.THEME_PATH+"Adwaita-Personalized/gnome-shell");
      
        GLib.file_set_contents(this.THEME_PATH+"Adwaita-Personalized/index.theme", "[X-GNOME-Metatheme]\nName=Adwaita-Personalized\nType=X-GNOME-Metatheme\nComment=Personalized Adwaita theme\nEncoding=UTF-8\nGtkTheme=Adwaita\nIconTheme=Adwaita\nCursorTheme=Adwaita\nCursorSize=24");
        GLib.spawn_command_line_sync("cp -r /usr/share/themes/Adwaita-dark/gtk-2.0 "+this.THEME_PATH+"Adwaita-Personalized/");
        GLib.spawn_command_line_sync("mv "+this.THEME_PATH+"Adwaita-Personalized/gtk-2.0/assets "+this.THEME_PATH+"Adwaita-Personalized/gtk-2.0/assets-dark");
        GLib.spawn_command_line_sync("cp -r /usr/share/themes/Adwaita/gtk-2.0/assets "+this.THEME_PATH+"Adwaita-Personalized/gtk-2.0/assets-light");
        this.THEME_PATH += "Adwaita-Personalized";
        this.manageGtk2Theme(settings.get_string("theme-variant"));
        this.generateThemeFiles();
        this.isInstalled = true;
        return;
      }
      catch(error) {
        return;
      }
    }
    this.isInstalled = true;
    this.THEME_PATH += "Adwaita-Personalized";
    return;

  },
  
  setValueToVariables: function( variable, colorValue, fileDataVariable, backShift=7 ) {
  
    let nextPos      = fileDataVariable.indexOf(variable);
    fileDataVariable = fileDataVariable.replaceAll( fileDataVariable.substring( (nextPos - backShift), nextPos ) + variable, colorValue);
    return fileDataVariable;
      
  },
    
});
