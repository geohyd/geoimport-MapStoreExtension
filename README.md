# MapStore extension for geoImport extension project - Version: 1.0.1
 
This repo is a fork of [MapStoreExtension](https://github.com/geosolutions-it/MapStoreExtension).

It contains the client side of the geoImport extension project.

Thanks to it a user can:
 - import shape or gpx files from the attribute table of layer to add new geometries

This extension was created on request of DREAL Corse.

## Build .zip

Clone the repository with the --recursive option to automatically clone submodules.

`git clone --recursive https://github.com/geohyd/geoimport-MapStoreExtension`

Install NodeJS >= 12.16.1 , if needed, from [here](https://nodejs.org/en/download/releases/).


Install the app and then build the .zip archive to be imported in MapStore :

`npm install`

`npm run ext:build`
 
 This will create a `GeoImportExtension.zip` zip in `dist` directory.
 
## Add the extension to your MapStore instance 
 
 - from UI : import `GeonetworkExtension.zip` throught a context creator/editor (this will automatically create the `pluginsConfig.json.patch` file which effects are documented below)
   
 or 
 - copy zip content in `georchestra_datadir/mapstore/dist/extensions/GeoImportExtension/`
 - create/edit the following files in `georchestra_datadir/mapstore` :
      - `extensions.json` (to reference extensions) : 
        `{
          "GeoImportExtension": {
            "bundle":"dist/extensions/GeoImportExtension/index.js",
            "translations":"dist/extensions/GeoImportExtension/translations"
          }
        }`
      - `pluginsConfig.json.patch` (optionnal, see below) :
        `[
           {
             "op":"add",
             "path":"/plugins/-",
             "value": {
               "name":"GeoImportExtension",
               "extension":true
             }
           }
         ]`

## `pluginsConfig.json.patch` file 

This file determines how the extension will be handled by MapStore UI.

If present as created when imported from the UI (above content) :
- any extension added to MapStore will be present in the default context and available for all other contexts.
- while creating/editing a context any mapstore admin user can accidentally remove the extension, which is then totally removed from the MapStore instance, i.e., not available for any context anymore.

If present with `"extension":false` :
- the extension will be considered as a plugin and will be present in the default context and available for all other contexts.
- it won't be possible to accidentally remove the extension, it won't be possible to remove it directly from the UI (entirely removing the extension is needed to reload it/load an extension with the same name.

If absent :
- the extension will be present in the default context and not available for any other contexts.



