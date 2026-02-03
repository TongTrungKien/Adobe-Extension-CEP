Batch Clip Exporter for Premiere Pro
A CEP extension that enables batch exporting of individual clips from a Premiere Pro timeline directly to Adobe Media Encoder.

🚀 Features
Automatic Detection: Detects all clips on a selected reference track.

Individual Batch Export: Exports each clip as a separate file.

Locked Track Support: Includes locked tracks in the final export.

Format Support: Compatible with H.264, ProRes, and custom presets.

Dynamic Naming: Customizable naming patterns for output files.

Clip Preview: Displays a list of detected clips before processing.

Queue Integration: Sends the entire batch to the Media Encoder queue instantly.

📋 Requirements
Adobe Premiere Pro CC 2020 or later

Adobe Media Encoder

Windows or macOS

🛠 Installation
Windows:
Enable Debug Mode:

Open regedit.exe (Run as Administrator).

Navigate to: `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\`

Create a new String Value: PlayerDebugMode.

Set value to: 1.

Copy Extension:

Extract the extension folder.

Copy it to: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\BatchClipExporter\`

Restart Premiere Pro.

macOS:
Enable Debug Mode: Run the following command in Terminal:

Bash
```bash
defaults write /Users/<username>/Library/Preferences/com.adobe.CSXS.11.plist PlayerDebugMode 1
```

Copy Extension:

Copy the folder to: `/Library/Application Support/Adobe/CEP/extensions/`

Restart Premiere Pro.

📖 How to Use
Open Extension:

Go to: Window > Extensions > Batch Clip Exporter.

Configure Settings:

Reference Track: Choose the track to detect clips (e.g., V2 if V1 is a background).

Output Folder: Select your destination directory.

Naming Pattern:

clip_{###} → clip_001.mp4, clip_002.mp4...

video_{name} → video_Overlay.mp4, video_Background.mp4...

Preset: Select your Media Encoder preset (H.264, ProRes, etc.).

Analyze Timeline:

Click "Analyze Timeline" to scan and list detected clips.

Export:

Click "Export All Clips to Media Encoder".

Monitor the rendering progress in Adobe Media Encoder.

⚙️ Options
Include all tracks
On: Export includes ALL video/audio tracks (including locked ones).

Off: Only exports enabled/targeted tracks.

Ignore gaps
On: Only exports segments containing content (skips empty spaces).

Off: Exports everything, including gaps between clips.

💡 Use Case
Example Workflow: Imagine a timeline structured as follows:

V2: [Clip A] [Clip B] [Clip C]...

V1: [Background Layer] (LOCKED)

A1/A2: [Audio Tracks]

Result: The extension detects each clip on V2 and exports them as separate files that include the content from V2, the background from V1, and all audio tracks.

```
📂 File Structure
BatchClipExporter/
├── CSXS/
│   └── manifest.xml          # CEP manifest configuration
├── css/
│   └── style.css             # UI styling
├── js/
│   └── main.js               # Frontend logic
├── jsx/
│   └── hostscript.jsx        # ExtendScript backend
├── lib/
│   ├── CSInterface.js        # Adobe CEP library
│   └── json2.js              # JSON library
├── index.html                # Main UI
├── presets                   # Blueprints
└── README.md
```

❓ Troubleshooting
Extension not appearing: Double-check if PlayerDebugMode is enabled and the folder path is correct.

Export fails: Ensure Media Encoder is open and you have write permissions for the output folder.

Clips not detected: Verify the correct Reference Track is selected and the timeline contains active clips.

🔧 Customization
Presets: Add paths in jsx/hostscript.jsx within the getPresetPath() function.

UI Theme: Modify css/style.css.

Naming Logic: Edit the generateFileName() function in the JSX file.

📝 Notes
Designed for CSXS 11 (Premiere Pro 2021+).

For older versions, change CSXS.11 to CSXS.9 or CSXS.10 in the manifest and registry/plist.

Locked tracks are rendered by design to allow background/overlay consistency.

🤝 Credits
Based on the structure of [SIMPLE_QUEUE_TOOL_CEP](https://github.com/Mathsqrt2/SIMPLE_QUEUE_TOOL_CEP).

Special thanks to Hans for his contributions to this tool!
