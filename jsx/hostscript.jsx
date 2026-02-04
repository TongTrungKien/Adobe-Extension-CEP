// Premiere Pro ExtendScript for Clips Exporter Pro v2.0 - WINDOWS PATH FIX

// ---------------------------------------------------------
// 1. CÁC HÀM XỬ LÝ ĐƯỜNG DẪN (Học theo code tham khảo của bạn)
// ---------------------------------------------------------

function getSeparator() {
    if ($.os.indexOf("Windows") != -1) {
        return "\\"; // Windows bắt buộc dùng gạch chéo ngược
    }
    return "/";
}

// Hàm này cực kỳ quan trọng: Biến mọi đường dẫn thành chuẩn của Hệ điều hành đang chạy
function fixPath(path) {
    var os = $.os;
    if (os.indexOf("Windows") != -1) {
        // Nếu là Windows, đổi hết / thành \
        return path.replace(/\//g, "\\");
    } else {
        // Nếu là Mac, đổi hết \ thành /
        return path.replace(/\\/g, "/");
    }
}

// ---------------------------------------------------------
// 2. LOGIC CHÍNH
// ---------------------------------------------------------

function ping() {
    return "pong success 1";
}

function selectOutputFolder() {
    var folder = Folder.selectDialog("Select output folder");
    if (folder) return folder.fsName;
    return null;
}

function selectPresetFolder() {
    var folder = Folder.selectDialog("Select preset folder");
    if (folder) return folder.fsName;
    return null;
}

function importPreset() {
    var file = File.openDialog("Select preset file (.epr)");
    if (file) return file.fsName;
    return null;
}

// --- JSON POLYFILL ---
if (typeof JSON !== "object") { JSON = {}; }
(function () {
    "use strict";
    var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var meta = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", "\"": "\\\"", "\\": "\\\\" };
    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string) ? "\"" + string.replace(rx_escapable, function (a) {
            var c = meta[a]; return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + "\"" : "\"" + string + "\"";
    }
    function str(key, holder) {
        var i, k, v, length, partial, value = holder[key];
        if (value && typeof value === "object" && typeof value.toJSON === "function") { value = value.toJSON(key); }
        switch (typeof value) {
            case "string": return quote(value);
            case "number": return isFinite(value) ? String(value) : "null";
            case "boolean": case "null": return String(value);
            case "object":
                if (!value) return "null";
                partial = [];
                if (Object.prototype.toString.apply(value) === "[object Array]") {
                    length = value.length;
                    for (i = 0; i < length; i += 1) { partial[i] = str(i, value) || "null"; }
                    return "[" + partial.join(",") + "]";
                }
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value); if (v) partial.push(quote(k) + ":" + v);
                    }
                }
                return "{" + partial.join(",") + "}";
        }
    }
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function (value) { return str("", { "": value }); };
    }
}());

// =========================================================
// 1. HÀM LẤY THÔNG TIN TRACK (ĐỂ VẼ UI)
// =========================================================
function getSequenceTracksInfo() {
    try {
        var project = app.project;
        if (!project || !project.activeSequence) return null;
        
        var sequence = project.activeSequence;
        var info = {
            video: [],
            audio: []
        };

        // Quét tất cả Video Tracks (Dù là 3 hay 10 track cũng lấy hết)
        for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
            var track = sequence.videoTracks[i];
            info.video.push({
                index: i,
                name: track.name, // Tên track (V1, V2...)
                hasClips: track.clips.numItems > 0 // Kiểm tra có clip không
            });
        }

        // Quét tất cả Audio Tracks
        for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
            var track = sequence.audioTracks[i];
            info.audio.push({
                index: i,
                name: track.name,
                hasClips: track.clips.numItems > 0
            });
        }

        return JSON.stringify(info);
    } catch (e) {
        return null;
    }
}

function analyzeTimelineClips(params) {
    try {
        var project = app.project;
        if (!project || !project.activeSequence) return null;
        var sequence = project.activeSequence;
        
        var clips = [];
        var filters = params.filters || []; // Các bộ lọc (Màu, Duration...)
        
        // --- LOGIC SOLO TRACK MỚI (DYNAMIC) ---
        if (params.soloTrack && params.soloTrackName) {
            // params.soloTrackName sẽ có dạng "video-0" hoặc "audio-2" (Index thực)
            var parts = params.soloTrackName.split('-');
            var type = parts[0];   // "video" hoặc "audio"
            var index = parseInt(parts[1]); // 0, 1, 2...
            
            if (type === 'video' && index < sequence.videoTracks.numTracks) {
                var track = sequence.videoTracks[index];
                // Gọi hàm lấy clip VÀ TRUYỀN FILTER VÀO
                clips = clips.concat(getClipsFromTrack(track, 'video', filters, sequence));
            } 
            else if (type === 'audio' && index < sequence.audioTracks.numTracks) {
                var track = sequence.audioTracks[index];
                clips = clips.concat(getClipsFromTrack(track, 'audio', filters, sequence));
            }
        } 
        // --- LOGIC QUÉT TOÀN BỘ (NHƯ CŨ) ---
        else {
            if (params.videoTrack) {
                for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
                    clips = clips.concat(getClipsFromTrack(sequence.videoTracks[i], 'video', filters, sequence));
                }
            }
            if (params.audioTrack) {
                for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
                    clips = clips.concat(getClipsFromTrack(sequence.audioTracks[i], 'audio', filters, sequence));
                }
            }
        }
        
        // Lọc trùng và sắp xếp
        clips = removeDuplicateClips(clips);
        clips.sort(function(a, b) { return a.start - b.start; });
        
        return JSON.stringify(clips);
        
    } catch (e) {
        alert("Error analyzing: " + e.toString());
        return null; 
    }
}

function getClipsFromTrack(track, trackType, filters, sequence) {
    var detectedClips = [];
    
    // Tự động đặt tên track V1, V2... dựa trên ID nếu cần
    // (Hoặc dùng track.name trực tiếp)
    var trackNameDisplay = track.name; 

    for (var i = 0; i < track.clips.numItems; i++) {
        var clip = track.clips[i];
        
        // [QUAN TRỌNG] Dòng này đảm bảo logic Lọc Màu/Thời gian vẫn hoạt động
        if (checkFilters(clip, filters)) {
            
            var clipName = clip.name;
            var labelColor = -1;
            
            if (clip.projectItem) {
                clipName = clip.projectItem.name;
                labelColor = clip.projectItem.getColorLabel();
            }

            detectedClips.push({
                name: clipName,
                start: clip.start.seconds,
                end: clip.end.seconds,
                duration: clip.duration.seconds,
                track: trackNameDisplay,
                trackType: trackType,
                labelColor: labelColor
            });
        }
    }
    return detectedClips;
}

// function analyzeTimelineClips(params) {
//     try {
//         var project = app.project;
//         if (!project) return null;
//         var sequence = project.activeSequence;
//         if (!sequence) {
//             alert("Please open a sequence first");
//             return null;
//         }
        
//         var clips = [];
//         var videoEnabled = params.videoTrack;
//         var audioEnabled = params.audioTrack;
//         var soloMode = params.soloTrack;
//         var filters = params.filters || [];
        
//         if (videoEnabled) {
//             var trackIndex = 0;
//             if (soloMode && params.soloTrackName) {
//                 trackIndex = parseInt(params.soloTrackName.replace('V', '')) - 1;
//                 clips = clips.concat(getClipsFromTrack(sequence.videoTracks[trackIndex], 'video', filters, sequence));
//             } else {
//                 for (var i = 0; i < sequence.videoTracks.numTracks; i++) {
//                     clips = clips.concat(getClipsFromTrack(sequence.videoTracks[i], 'video', filters, sequence));
//                 }
//             }
//         }
        
//         // if (audioEnabled && !soloMode) {
//         //     for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
//         //         clips = clips.concat(getClipsFromTrack(sequence.audioTracks[i], 'audio', filters, sequence));
//         //     }
//         // }
        
//         clips = removeDuplicateClips(clips);
//         clips.sort(function(a, b) { return a.start - b.start; });
        
//         return JSON.stringify(clips);
        
//     } catch (e) {
//         alert("Error analyzing timeline: " + e.toString());
//         return null; 
//     }
// }

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
            case 'selected': if (!clip.isSelected) return false; break;
            case 'extension': if (clip.extension.toLowerCase() !== filter.value.toLowerCase().replace('.', '')) return false; break;
            case 'name_starts': if (clip.name.indexOf(filter.value) !== 0) return false; break;
            case 'name_contains': if (clip.name.indexOf(filter.value) === -1) return false; break;
            case 'name_ends': var endIndex = clip.name.length - filter.value.length; if (clip.name.lastIndexOf(filter.value) !== endIndex) return false; break;
            case 'in_workarea': 
                var inPoint = sequence.getInPoint();
                var outPoint = sequence.getOutPoint();
                if (clip.start < inPoint || clip.end > outPoint) return false; 
                break;
            case 'duration_min': var minDuration = parseFloat(filter.value); if (clip.duration < minDuration) return false; break;
            case 'duration_max': var maxDuration = parseFloat(filter.value); if (clip.duration > maxDuration) return false; break;
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
        
        if (outputPath === 'PROJECT') outputPath = getProjectFolder();
        var presetPath = getPresetPath(preset);
        
        if (!presetPath || !File(presetPath).exists) {
             alert("STOP: Không tìm thấy file Preset.");
             return "error_preset_not_found";
        }

        if (useAME && !app.encoder) {
            app.encoder.launchEncoder();
            $.sleep(5000);
        }

        // [YÊU CẦU 1] Đặt tên Bin là "Ingredient"
        var binName = "Ingredient";
        // Nếu đã có bin tên ingredient thì Premiere sẽ tự đổi thành ingredient 01 (không sao cả)
        var exportBin = project.rootItem.createBin(binName);

        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            
            // 1. Tính toán In/Out
            var inPointTicks = (clip.start * 254016000000).toFixed(0);
            var outPointTicks = (clip.end * 254016000000).toFixed(0);
            
            sequence.setInPoint(inPointTicks);
            sequence.setOutPoint(outPointTicks);
            
            // 2. Tạo Subsequence (Lấy toàn bộ layer)
            var newSubSeq = sequence.createSubsequence(false);
            
            // Đặt tên file
            newSubSeq.name = "Item_" + padNumber(i + 1, 3);
            var outputName = generateFileName(namingPattern, i + 1, clip, sequence);

            // Di chuyển vào Bin "ingredient"
            if (newSubSeq.projectItem) {
                newSubSeq.projectItem.moveBin(exportBin);
            }
            
            var fullOutputPath = outputPath + "/" + outputName + getOutputExtension(preset);
            fullOutputPath = fixPath(fullOutputPath);
            
            // 3. Gửi sang AME
            if (useAME) {
                var jobID = app.encoder.encodeSequence(newSubSeq, fullOutputPath, presetPath, 0, 0);
                // Delay nhỏ giữa các clip để AME kịp nhận lệnh
                $.sleep(1000); 
            } else {
                newSubSeq.exportAsMediaDirect(fullOutputPath, presetPath, 0);
            }
        }
        
        // Trả lại focus cho sequence gốc
        project.activeSequence = sequence;
        
        // [YÊU CẦU 2 & 3] Đợi 10s rồi xóa Bin
        // if (useAME && exportBin) {
        //     // Đợi 5 giây để đảm bảo AME đã nuốt trọn lệnh cuối cùng
        //     $.sleep(10000);
            
        //     try {
        //         // Xóa thư mục "ingredient"
        //         exportBin.deleteBin();
        //     } catch(err) {
        //         // Fallback cho bản Premiere cũ
        //         exportBin.delete();
        //     }
        // } else if (!useAME && exportBin) {
        //     // Nếu xuất trực tiếp thì xóa luôn không cần đợi
        //     exportBin.deleteBin();
        // }

        alert("Đã gửi " + clips.length + " video sang Media Encoder thành công!Vui lòng \nKHÔNG XÓA '" + binName + "' đến khi xuất xong toàn bộ video");
        
        return "success";
    } catch (e) {
        alert("Error: " + e.toString());
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
        outputPath = fixPath(outputPath);
        
        var presetPath = getPresetPath('h264_high'); 

        if (app.encoder && presetPath && File(presetPath).exists) {
            app.encoder.encodeSequence(
                sequence,
                outputPath,
                presetPath,
                app.encoder.ENCODE_ENTIRE,
                0
            );
            return "success";
        }
        return "error";
    } catch (e) {
        alert("Error exporting sequence: " + e.toString());
        return "error";
    }
}

function exportToMediaEncoder(sequence, outputPath, presetPath) {
    try {
        // ===== FIX 2: ĐÃ XÓA app.encoder.launchEncoder() Ở ĐÂY =====
        // Không cần launch lại vì đã launch ở ngoài vòng lặp rồi
        // ============================================================
        
        if (!app.encoder) {
            alert("Adobe Media Encoder is not available");
            return false;
        }
        
        var safePresetPath = fixPath(presetPath);
        
        var f = new File(safePresetPath);
        if(!f.exists) {
            alert("CRITICAL ERROR (File Not Found):\n" + safePresetPath + 
                  "\n\nCode đang tìm file tại đường dẫn trên nhưng không thấy.");
            return false;
        }

        app.encoder.encodeSequence(
            sequence,
            outputPath,
            safePresetPath,
            app.encoder.ENCODE_IN_TO_OUT,
            0 
        );
        
        return true;
    } catch (e) {
        alert("Media Encoder Error: " + e.toString());
        return false;
    }
}

function exportDirect(sequence, outputPath, presetPath) {
    try {
        var safePresetPath = fixPath(presetPath);
        var success = sequence.exportAsMediaDirect(
            outputPath,
            safePresetPath, 
            app.encoder.ENCODE_IN_TO_OUT
        );
        return success;
    } catch (e) {
        return false;
    }
}

function generateFileName(pattern, index, clip, sequence) {
    var fileName = pattern;

    // Thay thế {###} bằng số đã được pad (ví dụ: 001)
    fileName = fileName.replace(/\{###\}/g, padNumber(index, 3));

    fileName = fileName.replace(/\{clipName\}/g, sanitizeFileName(clip.name));
    fileName = fileName.replace(/\{seqName\}/g, sanitizeFileName(sequence.name));
    fileName = fileName.replace(/\{date\}/g, getCurrentDate());
    fileName = fileName.replace(/\{time\}/g, getCurrentTime());
    fileName = fileName.replace(/\{trackName\}/g, 'V' + (clip.trackIndex + 1));

    return fileName;
}

function sanitizeFileName(name) {
    return name.replace(/[<>:"\/\\|?*]/g, "_");
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
    return '.mp4';
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
    if (item.type === 2 && item.isSelected()) {
        return item;
    }
    for (var i = 0; i < item.children.numItems; i++) {
        var child = item.children[i];
        var result = getSelectedBin(child);
        if (result) return result;
    }
    return null;
}

function exportSelectedBin() {
    return "error_not_implemented_fully";
}

// ---------------------------------------------------------
// HÀM TÌM PRESET: CHUẨN HÓA PATH CHO WINDOWS
// ---------------------------------------------------------
function getPresetPath(presetName) {
    try {
        var fileName = "H.264 - High Quality 720p.epr"; 
        
        // 1. CÁCH TỰ ĐỘNG: Dựa trên vị trí file script
        var scriptFile = File($.fileName);
        var extensionRoot = scriptFile.parent.parent.fsName;
        
        // Lắp ráp đường dẫn thủ công để tránh lỗi Folder object
        var autoPath = extensionRoot + getSeparator() + "presets" + getSeparator() + fileName;
        autoPath = fixPath(autoPath); // Chuẩn hóa gạch chéo
        
        if (File(autoPath).exists) {
            return autoPath;
        }

        // 2. CÁCH DỰ PHÒNG (HARDCODE): Dựa trên đường dẫn bạn cung cấp
        var hardcodedPath = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\ClipsExporterPro\\presets\\" + fileName;
        
        if (File(hardcodedPath).exists) {
            return hardcodedPath;
        }
        
        // 3. Nếu cả 2 đều không thấy
        alert("DEBUG PATH:\n" +
              "1. Auto Path: " + autoPath + "\n" +
              "2. Hard Path: " + hardcodedPath + "\n\n" +
              "Cả 2 nơi đều không tìm thấy file. Vui lòng kiểm tra lại tên file chính xác 100% trong thư mục presets.");
        
        return null;
        
    } catch(e) {
        alert("Lỗi lấy đường dẫn: " + e.toString());
        return null;
    }
}
