
# Advanced Tools Suite for AL Language
>A complete suite of utilities to enhance your development experience with AL Language

[![version](https://img.shields.io/vscode-marketplace/v/vdevmt.al-advanced-tools-suite.svg?&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=vdevmt.al-advanced-tools-suite)
[![installs](https://img.shields.io/vscode-marketplace/d/vdevmt.al-advanced-tools-suite.svg)](https://marketplace.visualstudio.com/items?itemName=vdevmt.al-advanced-tools-suite)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/vdevmt.al-advanced-tools-suite)](https://marketplace.visualstudio.com/items?itemName=vdevmt.al-advanced-tools-suite&ssr=false#review-details)

# Features
These features are concluded at this moment:

## launch.json manager
Store all launch.json files in a local or shared folder and select which one to use for the current project.<br />
With these features you can easily share launchers with your colleagues:

* Import launch.json file on your workspace by command **ATS: Import 'launch.json'**
* Export launch.json file of your workspace by command **ATS: Export 'launch.json'**
* Run Business Central Client by command **ATS: Run Business Central Client**

<img src="./images/ImportLaunch.gif" alt="Import launch.json" height="400">

## Namespace utilities

* Set object namespace based on current file path by command **ATS: Set object namespace based on file path**<br />
   
<img src="./images/NamespaceByPathCmd.gif" alt="Namespace By Path" height="400">

* Namespace completion providers based on:
    - Current File path if **ats.UseObjectFilePathAsNamespace** setting is enabled
    - Default Root Namespace defined by **al.RootNamespace** setting
    - Additional custom Namespaces defined in **ats.DefaultNamespaces** setting

<img src="./images/NamespaceSuggestion.gif" alt="Namespace Suggestion" height="400">

## Region utilities

* Create regions by snippet **tregion**

<img src="./images/RegionSnippet.gif" alt="Create Region Snippet" height="400">

* Create region for the selected code in the current editor by command **ATS: Create region by selection**

<img src="./images/RegionBySelection.gif" alt="Create Region By Selection" height="400">

# Snippets

## tsingleLineFields:
An easy way to organize page fields in a single-line structure.<br />
With this structure you can create a complex grid like this:<br />

<img src="./images/singlelinefields.jpg" alt="Single-Line fields">

##  tsingleLineFieldsWithCaptionTop:
An easy way to organize page fields in a single-line structure with caption at the top.<br /> 
With this structure you can create a complex grid like this:<br />

<img src="./images/singlelinefieldscaptionupper.jpg" alt="Single-Line fields with upper caption">

# Extension settings
* `ATS.DefaultLaunchArchiveFolder`: Default archive folder for import/export utiltities of launch.json file;  
* `ATS.UseObjectFilePathAsNamespace`: Allow usage of object file path for namespace declarations (default = false). The number of positions included depends on the value defined in the `ATS.MaxNamespaceSize` setting 
* `ATS.DefaultNamespaces`: List of default namespaces that can be used for AL objects;  
* `ATS.MaxNamespaceSize`: No. of max elements expected for namespace declaration in AL objects (default = 5);  
* `ATS.EnableNamespaceDiagnostics`: Enable or disable warnings for wrong or missing namespace declarations in AL objects (default = false). 
    Allowed values: 
    - `al.rootNamespace` setting value;  
    - Object file path (if `ATS.UseObjectFilePathAsNamespace` setting is enabled);
    - Custom namespaces defined in `ATS.DefaultNamespaces` setting.
* `ATS.NamespaceMandatory`: Enable or disable errors for missing namespace declarations in AL objects (default = false). This setting will be used only if the `ATS.EnableNamespaceDiagnostics` setting is enabled.

# Requirements
* AL Language extension
