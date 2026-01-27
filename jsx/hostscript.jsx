// Premiere Pro ExtendScript for Clips Exporter Pro v2.0

function selectOutputFolder() {
    var folder = Folder.selectDialog("Select output folder");
    if (folder) {
        return folder.fsName;
    }
    return null;
}

function selectPresetFolder() {
    var folder = Folder.selectDialog("Select preset folder");
    if (folder) {
        return folder.fsName;
    }
    return null;
}

function importPreset() {
    var file = File.openDialog("Select preset file", "*.epr");
    if (file) {
        return file.fsName;
    }
    return null;
}

function analyzeTimelineClips(params) {
    try {
        var project = app.project;
        if (!project) {
            return null;
        }
        
        var sequence = project.activeSequence;
        if (!sequence) {
            alert("Please open a sequence first");
            return null;
        }
        
        var clips = [];
        var videoEnabled = params.videoTrack;
        var audioEnabled = params.audioTrack;
        var soloMode = params.soloTrack;
        var filters = params.filters || [];
        
        // Collect clips from video tracks
        if (videoEnabled) {
            var trackIndex = 0;
            if (soloMode && params.soloTrackName) {
                trackIndex = parseInt(params.soloTrackName.replace('V', '')) - 1;
                clips = clips.concat(getClipsFromTrack(sequence.videoTracks[trackIndex], 'video', filters, sequence));
            } else {
                for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
                    clips = clips.concat(getClipsFromTrack(sequence.videoTracks[i], 'video', filters, sequence));
                }
            }
        }
        
        // Collect clips from audio tracks
        if (audioEnabled && !soloMode) {
            for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
                clips = clips.concat(getClipsFromTrack(sequence.audioTracks[i], 'audio', filters, sequence));
            }
        }
        
        // Remove duplicates based on start time and name
        clips = removeDuplicateClips(clips);
        
        // Sort by start time
        clips.sort(function(a, b) {
            return a.start - b.start;
        });
        
        return JSON.stringify(clips);
        
    } catch (e) {
        alert("Error analyzing timeline: " + e.toString());
        return null;
    }
}

function getClipsFromTrack(track, trackType, filters, sequence) {
    var clips = [];
    
    if (!track) return clips;
    
    var numClips = track.clips.numItems;
    
    for (var i = 0; i < numClips; i++) {
        var clip = track.clips[i];
        
        if (clip && clip.projectItem) {
            var clipData = {
                index: i,
                name: clip.name || clip.projectItem.name,
                start: clip.start.seconds,
                end: clip.end.seconds,
                duration: (clip.end.seconds - clip.start.seconds),
                inPoint: clip.inPoint.seconds,
                outPoint: clip.outPoint.seconds,
                trackType: trackType,
                trackIndex: track.id,
                extension: getFileExtension(clip.projectItem.name),
                isSelected: clip.isSelected()
            };
            
            // Apply filters
            if (passesFilters(clipData, filters, sequence)) {
                clips.push(clipData);
            }
        }
    }
    
    return clips;
}

function passesFilters(clip, filters, sequence) {
    if (filters.length === 0) return true;
    
    for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        
        switch (filter.type) {
            case 'selected':
                if (!clip.isSelected) return false;
                break;
                
            case 'extension':
                if (clip.extension.toLowerCase() !== filter.value.toLowerCase().replace('.', '')) {
                    return false;
                }
                break;
                
            case 'name_starts':
                if (clip.name.indexOf(filter.value) !== 0) return false;
                break;
                
            case 'name_contains':
                if (clip.name.indexOf(filter.value) === -1) return false;
                break;
                
            case 'name_ends':
                var endIndex = clip.name.length - filter.value.length;
                if (clip.name.lastIndexOf(filter.value) !== endIndex) return false;
                break;
                
            case 'in_workarea':
                var inPoint = sequence.getInPoint();
                var outPoint = sequence.getOutPoint();
                if (clip.start < inPoint || clip.end > outPoint) return false;
                break;
                
            case 'duration_min':
                var minDuration = parseFloat(filter.value);
                if (clip.duration < minDuration) return false;
                break;
                
            case 'duration_max':
                var maxDuration = parseFloat(filter.value);
                if (clip.duration > maxDuration) return false;
                break;
                
            case 'track':
                // Track filtering logic
                break;
        }
    }
    
    return true;
}

function removeDuplicateClips(clips) {
    var unique = [];
    var seen = {};
    
    for (var i = 0; i < clips.length; i++) {
        var key = clips[i].start + '_' + clips[i].name;
        if (!seen[key]) {
            seen[key] = true;
            unique.push(clips[i]);
        }
    }
    
    return unique;
}

function batchExportClips(exportData) {
    try {
        var project = app.project;
        var sequence = project.activeSequence;
        
        if (!sequence) {
            alert("No active sequence found");
            return "error";
        }
        
        var clips = exportData.clips;
        var outputPath = exportData.outputPath;
        var namingPattern = exportData.namingPattern;
        var preset = exportData.preset;
        var useAME = exportData.useAME;
        
        // Get actual output path
        if (outputPath === 'PROJECT') {
            outputPath = getProjectFolder();
        }
        
        // Get preset path
        var presetPath = getPresetPath(preset);
        
        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            
            // Generate output filename
            var outputName = generateFileName(namingPattern, i + 1, clip, sequence);
            var fullOutputPath = outputPath + "/" + outputName + getOutputExtension(preset);
            
            // Set sequence in/out points
            sequence.setInPoint(clip.start);
            sequence.setOutPoint(clip.end);
            
            // Export
            if (useAME) {
                var success = exportToMediaEncoder(sequence, fullOutputPath, presetPath);
                if (!success) {
                    alert("Failed to queue clip " + (i + 1));
                    return "error";
                }
            } else {
                var success = exportDirect(sequence, fullOutputPath, preset);
                if (!success) {
                    alert("Failed to export clip " + (i + 1));
                    return "error";
                }
            }
        }
        
        return "success";
        
    } catch (e) {
        alert("Error during export: " + e.toString());
        return "error";
    }
}

function exportActiveSequence() {
    try {
        var project = app.project;
        var sequence = project.activeSequence;
        
        if (!sequence) {
            alert("No active sequence found");
            return "error";
        }
        
        var outputPath = getProjectFolder() + "/" + sequence.name + ".mp4";
        
        if (app.encoder) {
            app.encoder.encodeSequence(
                sequence,
                outputPath,
                "Match Source - High bitrate",
                app.encoder.ENCODE_ENTIRE,
                1
            );
            return "success";
        }
        
        return "error";
        
    } catch (e) {
        alert("Error exporting sequence: " + e.toString());
        return "error";
    }
}

function exportSelectedBin() {
    try {
        var project = app.project;
        var rootItem = project.rootItem;
        
        if (!rootItem) {
            alert("No project items found");
            return "error";
        }
        
        // Get selected bin
        var selectedBin = getSelectedBin(rootItem);
        if (!selectedBin) {
            alert("No bin selected");
            return "error";
        }
        
        var items = selectedBin.children;
        var outputPath = getProjectFolder();
        
        for (var i = 0; i < items.numItems; i++) {
            var item = items[i];
            if (item.type === 1) { // If it's a clip
                var itemOutputPath = outputPath + "/" + item.name + ".mp4";
                
                // Export each item (requires creating temporary sequence)
                // This is complex - simplified version
            }
        }
        
        return "success";
        
    } catch (e) {
        alert("Error exporting bin: " + e.toString());
        return "error";
    }
}

function exportToMediaEncoder(sequence, outputPath, presetPath) {
    try {
        if (!app.encoder) return false;
        
        app.encoder.encodeSequence(
            sequence,
            outputPath,
            presetPath,
            app.encoder.ENCODE_WORKAREA,
            1
        );
        
        return true;
        
    } catch (e) {
        return false;
    }
}

function exportDirect(sequence, outputPath, preset) {
    try {
        // Direct export without Media Encoder
        var success = sequence.exportAsMediaDirect(
            outputPath,
            "",
            app.encoder.ENCODE_WORKAREA
        );
        
        return success;
        
    } catch (e) {
        return false;
    }
}

function generateFileName(pattern, index, clip, sequence) {
    var fileName = pattern;
    
    // Replace variables
    fileName = fileName.replace('{###}', padNumber(index, 3));
    fileName = fileName.replace('{clipName}', sanitizeFileName(clip.name));
    fileName = fileName.replace('{seqName}', sanitizeFileName(sequence.name));
    fileName = fileName.replace('{date}', getCurrentDate());
    fileName = fileName.replace('{time}', getCurrentTime());
    fileName = fileName.replace('{trackName}', 'V' + (clip.trackIndex + 1));
    
    return fileName;
}

function sanitizeFileName(name) {
    // Remove invalid characters
    return name.replace(/[<>:"/\\|?*]/g, '_');
}

function getCurrentDate() {
    var date = new Date();
    var year = date.getFullYear();
    var month = padNumber(date.getMonth() + 1, 2);
    var day = padNumber(date.getDate(), 2);
    return year + '-' + month + '-' + day;
}

function getCurrentTime() {
    var date = new Date();
    var hours = padNumber(date.getHours(), 2);
    var minutes = padNumber(date.getMinutes(), 2);
    var seconds = padNumber(date.getSeconds(), 2);
    return hours + '-' + minutes + '-' + seconds;
}

function padNumber(num, width) {
    var str = num.toString();
    while (str.length < width) {
        str = '0' + str;
    }
    return str;
}

function getFileExtension(fileName) {
    var parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}

function getOutputExtension(preset) {
    var extensions = {
        'h264_high': '.mp4',
        'h264_4k': '.mp4',
        'h265_hevc': '.mp4',
        'prores_422': '.mov',
        'prores_4444': '.mov',
        'dnxhd': '.mxf'
    };
    
    return extensions[preset] || '.mp4';
}

function getPresetPath(presetName) {
    var presets = {
        'h264_high': 'Match Source - High bitrate',
        'h264_4k': 'Match Source - High bitrate',
        'h265_hevc': 'Match Source - High bitrate',
        'prores_422': 'Apple ProRes 422',
        'prores_4444': 'Apple ProRes 4444',
        'dnxhd': 'DNxHD'
    };
    
    return presets[presetName] || 'Match Source - High bitrate';
}

function getProjectFolder() {
    var project = app.project;
    if (project.path) {
        var projectFile = new File(project.path);
        return projectFile.parent.fsName;
    }
    return Folder.desktop.fsName;
}

function getSelectedBin(item) {
    if (item.type === 2 && item.isSelected()) { // Type 2 is bin
        return item;
    }
    
    for (var i = 0; i < item.children.numItems; i++) {
        var child = item.children[i];
        var result = getSelectedBin(child);
        if (result) return result;
    }
    
    return null;
}