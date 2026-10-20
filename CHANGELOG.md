# Change Log

## [1.19.0]
- `ATS Translation Manager`: the original text of each entry is now a **link to the AL source**. Click it to open the `.al` file next to the Translation Manager, with the exact caption, tooltip or label selected (the right element is picked even when the same text appears several times in the object). Works both from an AL object and from a single `.xlf` file. Files always open in the editor group next to the Translation Manager, as a **preview tab** that is reused on the next click unless you edit or pin it.

- `ATS Translation Manager`: **Accept Suggestions** is now also available as a quick icon button next to the search box, applying the suggestions to all the filtered rows.

- `ATS Translation Manager`: new **Ignore all** button next to **Ignore** in the QA warning bar of the Edit Translation dialog. *Ignore* silences the warning for the single entry only; *Ignore all* silences it for every entry sharing the same source text (e.g. `Automatic` translated as both `Automatico` and `Automatica`). The choice is saved in the language file, so it survives restarts.

## [1.18.0]
- External objects (Workspace Explorer, `ATS: Find in Dependencies`, View symbols) now open in the **native AL preview** (`.dal`) served by the AL extension, with Go to Definition, Find All References, hover and breakpoints. The read-only `AL (External Package)` preview is kept only as a fallback when the AL extension can't resolve the object.

- Fixed the **`ATS: Add using`** quick fix, which was no longer offered for unrecognized objects (AL0185 / AL0427): recent versions of the AL extension attach a documentation link to their diagnostics, and the error was no longer recognized.

- Fixed the namespace diagnostics on **empty `.al` files** (or files containing only comments), which raised an error; a problematic file no longer interrupts the validation of the remaining ones.

## [1.17.0]
- New command `ATS: Find in Dependencies`: text/regex search across the source code of your dependency apps (`.app` packages), to quickly find where fields, procedures, and objects are used in the base apps. Includes a Match Case toggle, per-app filtering (apps that don't ship their sources are excluded), results grouped by app/object with stepped Expand all / Collapse all, and read-only navigation right to the matching line. Each search opens in its own **tab** (closable individually or all at once); results can be **pruned at any level** (a single match is removed instantly, while removing an object or an app asks for confirmation); very long source lines are **horizontally scrollable**; **double-click** a result to open it. 

- External objects opened from the `ATS Workspace Explorer` (or from `ATS: Find in Dependencies`) now open in a **truly read-only preview**, no longer seen as an AL source file of your project: no more spurious diagnostics, and above all no more stray `.al` files created inside the project folder (which caused duplicate-object compile errors and unwanted git changes). Previews use the dedicated `AL (External Package)` language (`*.atsal`): syntax colors are preserved, while AL hover / Go to Definition *inside* the preview are not available (use Ctrl+Click from a project file for the native AL preview).

## [1.15.10]
- Added App filter to the Workspace Explorer (useful for multi-root workspaces).

## [1.15.8]
- Enhancements and performance on ATS Translation Manager
- New Command: `ATS: Edit Workspace Translations`: This command allows you to quickly edit all translations in the workspace using the `ATS Translation Manager`

## [1.15.5]
- Improved Performance for ATS Translation Manager: We have optimized the underlying processes of the ATS Translation Manager to significantly reduce load times and improve overall responsiveness.

- Smarter .al File Creation: To streamline developer workflows, new .al files will now be automatically populated with the default namespace. (Note: This only applies to completely empty files to avoid overwriting existing code)

## [1.15.3]
- Added: Local translation archive management for `ATS Translation Manager` > Introduced a persistent local database to store and reuse previous translations, improving consistency and speed across different workspaces.

## [1.15.0]
- Added `ATS Translation Manager`
- Added Bookmarks on `ATS Workspace Explorer`

## [1.14.0]
- Added new features on `ATS: Workspace Explorer`

## [1.12.0]
- `ATS: Workspace Explorer` (CTRL+ALT+F12)

## [1.10.0]
- Performance improvements

## [1.9.7]
- Enhancements: Improved handling of multi-root workspaces

## [1.9.5]
- New special copy feature (Preview) `ATS: Copy as Procedure`

## [1.9.0]
- New command `ATS: Show all local variables`
- `ATS: Show all procedures` : Added regions to the list
- New extension logo

## [1.8.9]
- Special copy tools improvements

## [1.8.4]
- Enhanced the `ATS: Go to AL Object (Workspace Only)` feature with a new filter option that allows users to search by object type.

## [1.7.0]
- New command: `ATS: Go to AL Object (Workspace Only)`

## [1.6.2]
- AL Object Explorer: added button to export symbols as text

## [1.6.0]
- New command: `ATS: Import AL Symbols`

## [1.5.4]
- New special copy functions: `ATS:Copy as Integration Event`, `ATS: Copy as Page Fields`, `ATS: Copy as Report/Query Columns`

## [1.5.0]
- New commands: `ATS: AL objects summary`, `ATS: Export AL objects assignment details as csv`

## [1.4.2]
- New command: `ATS: AL Package new version`: Automate the versioning process for your Business Central apps

## [1.4.0]
- Performance enhancements

## [1.3.33]
- New features: 
    - `Copy as Record Insert statement`: Quickly create Insert statements for AL tables
    - `Copy as Record Modify statement`: Quickly create Modify statements for AL tables
    - `Copy as Record Delete statement`: Quickly create Delete statements for AL tables
- `Copy as Event Subscriber:` enhancements: Create event subscribers also from table and page fields 

## [1.3.30]
- New feature: `Copy as Event Subscriber:`: Quickly create event subscribers for AL Objects

## [1.3.28]
- New Command `ATS: Show all global variables`: Show and search all global variables on AL Objects 
- AL Object Explorer enhancements and optimizations

## [1.3.24]
- New Command `ATS: Show all Triggers`: Show and search all triggers of the current AL Object (Object, fields, dataitem, etc.)
- AL Object Explorer enhancements and optimizations

## [1.3.22]
- `AL Object Explorer` enhancements: new elements and performance optimizations

## [1.3.19]
- New Features:
    - Command `ATS: AL Object Explorer`: navigates through the elements of the current AL Object.    
    - Command `ATS: Show all Dataitems`: show and search dataitems of the current AL Object.    
    - Command `ATS: Show all Table Keys`: show and search table keys of the current AL Object.    
    - Command `ATS: Show open AL Objects`: Show detailed list of open AL Objects

## [1.3.10]
- New Features:
    - Command `ATS: Show all Fields`: show and search fields of the current AL Object.    
    - Command `ATS: Show all Procedures`: show and search functions of the current AL Object.    
    - Command `ATS: Show all Actions`: show and search page actions of the current AL Object.    

## [1.3.9]
- New Features:
    - Command `ATS: Show all Regions`: show the complete structure of regions in the current document.    

## [1.3.7]
- New Features:
    - Command `ATS: Change default startup object and run Business Central`
    - AL Object info on status bar

## [1.3.5]

- New Features:
    - If you use regions in your code, you can now view the region path of the current line in the status bar (`ATS.ShowRegionsOnStatusBar` setting must be enabled).
    - Open launch.json file by command `ATS: Open launch.json`
    - Minor fixes related to regions and namespace usages

## [1.3.2]

- Enhancement:
    - Run current AL object by command `ATS: Run Business Central` without edit launch.json configurations

## [1.3.0]

- New Features:
    - `URL Forwarding Rules` used by command `ATS: Run Business Central` to run Business Central Client with different URL instead of the URL defined into launch.json for each configuration (Public URL or http to https conversion).

## [1.2.0]

- New Features:
    - Diagnostics: Namespace validation rules

## [1.0.0]

Initial release of "Advanced Tools Suite for AL Language"
