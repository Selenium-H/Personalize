/*

Versopm 1.00
============

*/

const ExtensionUtils = imports.misc.extensionUtils;
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const Main           = imports.ui.main;

let looksManager      = null;
let extensionSettings = null;

function enable() {

  looksManager= new LooksManager_PersonalizeExtension();
  looksManager.startLooksManager();

}

function disable() {

  looksManager.undoChanges()

}

const LooksManager_PersonalizeExtension = class LooksManager_PersonalizeExtension {

  constructor() {
  
    this.themeSettings = new Gio.Settings({schema_id:"org.gnome.desktop.interface"});
    extensionSettings  = ExtensionUtils.getSettings("org.gnome.shell.extensions.personalize"); 
    
  }

  reloadTheme() { 
      
    try {
      GLib.file_get_contents(".themes/Adwaita-Personalized/index.theme");
      this.themeSettings.set_string("gtk-theme", "");
      this.themeSettings.set_string("gtk-theme", "Adwaita-Personalized");   
      Main.setThemeStylesheet(".themes/Adwaita-Personalized/gnome-shell/gnome-shell.css");
      Main.loadTheme();      
    }
    catch(error) {
      return;
    }
      
  }
  
  startLooksManager() {
  
    this.previousGtkTheme = this.themeSettings.get_string("gtk-theme");
    this.reloadTheme();   
    this.reloadSig = extensionSettings.connect("changed::reload-signal", () => {
      this.reloadTheme();
    });
      
  }
    
  undoChanges() {
  
    extensionSettings.disconnect(this.reloadSig);
    this.themeSettings.set_string("gtk-theme", this.previousGtkTheme);
    Main.setThemeStylesheet(null);
    Main.loadTheme();
    
  }  

}
