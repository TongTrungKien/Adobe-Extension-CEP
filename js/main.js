var csInterface = new CSInterface();
var detectedClips = [];
var activeFilters = [];
var settings = {
    autoRefresh: false,
    refreshInterval: 5,
    autoLoadSettings: true,
    soloLinkedTracks: true,
    notificationLevel: 'errors',
    customPresetPath: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    setupToggleSwitches();
    log('Clips Exporter Pro v2.0 loaded', 'success');
});

function setupEventListeners() {
    // Header buttons
    document.getElementById('preferencesBtn').addEventListener('click', showPreferences);
    document.getElementById('refreshBtn').addEventListener('click', refreshExtension);
    document.getElementById('backBtn').addEventListener('click', hidePreferences);
    
    // Track controls
    document.getElementById('videoTrackBtn').addEventListener('click', toggleTrackType);
    document.getElementById('audioTrackBtn').addEventListener('click', toggleTrackType);
    document.getElementById('soloTrackToggle').addEventListener('change', toggleSoloTrack);
    
    // Filters
    document.getElementById('addFilterBtn').addEventListener('click', addFilter);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearAllFilters);
    
    // File name
    document.getElementById('insertVariableBtn').addEventListener('click', showVariableMenu);
    setupVariableMenu();
    
    // Output folder
    document.getElementById('outputFolderType').addEventListener('change', handleOutputFolderChange);
    document.getElementById('browseOutputBtn').addEventListener('click', browseOutputFolder);
    
    // Export
    document.getElementById('analyzeBtn').addEventListener('click', analyzeTimeline);
    document.getElementById('exportBtn').addEventListener('click', exportAllClips);
    document.getElementById('exportActiveSeqBtn').addEventListener('click', exportActiveSequence);
    document.getElementById('exportSelectedBinBtn').addEventListener('click', exportSelectedBin);
    
    // Log
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
    
    // Preferences
    document.getElementById('autoRefresh').addEventListener('change', saveSettings);
    document.getElementById('refreshInterval').addEventListener('input', updateIntervalValue);
    document.getElementById('refreshInterval').addEventListener('change', saveSettings);
    document.getElementById('autoLoadSettings').addEventListener('change', saveSettings);
    document.getElementById('soloLinkedTracks').addEventListener('change', saveSettings);
    document.getElementById('notificationLevel').addEventListener('change', saveSettings);
    
    document.getElementById('importPresetBtn').addEventListener('click', importPreset);
    document.getElementById('addPresetFolderBtn').addEventListener('click', addPresetFolder);
    document.getElementById('removePresetPathBtn').addEventListener('click', removePresetPath);
    
    document.getElementById('importPrefBtn').addEventListener('click', importPreferences);
    document.getElementById('exportPrefBtn').addEventListener('click', exportPreferences);
    document.getElementById('resetPrefBtn').addEventListener('click', resetPreferences);
}

function setupToggleSwitches() {
    var toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggles.forEach(function(toggle) {
        updateToggleText(toggle);
        toggle.addEventListener('change', function() {
            updateToggleText(toggle);
        });
    });
}

function updateToggleText(toggle) {
    var label = toggle.nextElementSibling;
    var text = label.querySelector('.toggle-text');
    if (text) {
        text.textContent = toggle.checked ? 'ON' : 'OFF';
    }
}

// Track Controls
function toggleTrackType(e) {
    e.target.classList.toggle('active');
    log('Track type toggled: ' + e.target.dataset.type, 'info');
}

function toggleSoloTrack() {
    var isChecked = document.getElementById('soloTrackToggle').checked;
    var selector = document.getElementById('soloTrackSelector');
    selector.style.display = isChecked ? 'block' : 'none';
}

// Filters
function addFilter() {
    var filterDiv = document.createElement('div');
    filterDiv.className = 'filter-item';
    
    var filterSelect = document.createElement('select');
    filterSelect.innerHTML = `
        <option value="selected">Clip is selected</option>
        <option value="extension">Clip file extension is</option>
        <option value="name_starts">Clip name starts with</option>
        <option value="name_contains">Clip name contains</option>
        <option value="name_ends">Clip name ends with</option>
        <option value="in_workarea">Clip is within sequence in/out points</option>
        <option value="duration_min">Clip duration longer than</option>
        <option value="duration_max">Clip duration shorter than</option>
        <option value="track">Clip is on track</option>
    `;
    
    var valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Value...';
    
    var removeBtn = document.createElement('button');
    removeBtn.className = 'filter-remove-btn';
    removeBtn.innerHTML = '−';
    removeBtn.onclick = function() {
        filterDiv.remove();
        updateActiveFilters();
    };
    
    filterSelect.addEventListener('change', function() {
        if (filterSelect.value === 'selected' || filterSelect.value === 'in_workarea') {
            valueInput.style.display = 'none';
        } else {
            valueInput.style.display = 'block';
        }
    });
    
    filterDiv.appendChild(filterSelect);
    filterDiv.appendChild(valueInput);
    filterDiv.appendChild(removeBtn);
    
    document.getElementById('filtersList').appendChild(filterDiv);
    updateActiveFilters();
}

function updateActiveFilters() {
    activeFilters = [];
    var filterItems = document.querySelectorAll('.filter-item');
    
    filterItems.forEach(function(item) {
        var select = item.querySelector('select');
        var input = item.querySelector('input');
        
        activeFilters.push({
            type: select.value,
            value: input.value
        });
    });
    
    log('Filters updated: ' + activeFilters.length + ' active', 'info');
}

function clearAllFilters() {
    document.getElementById('filtersList').innerHTML = '';
    activeFilters = [];
    log('All filters cleared', 'info');
}

// Variable Menu
function showVariableMenu() {
    var menu = document.getElementById('variableMenu');
    var isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
}

function setupVariableMenu() {
    var items = document.querySelectorAll('.variable-item');
    items.forEach(function(item) {
        item.addEventListener('click', function() {
            var variable = item.dataset.var;
            var input = document.getElementById('fileNamePattern');
            input.value += variable;
            document.getElementById('variableMenu').style.display = 'none';
            input.focus();
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        var menu = document.getElementById('variableMenu');
        var btn = document.getElementById('insertVariableBtn');
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.style.display = 'none';
        }
    });
}

// Output Folder
function handleOutputFolderChange() {
    var type = document.getElementById('outputFolderType').value;
    var customPath = document.getElementById('customOutputPath');
    var browseBtn = document.getElementById('browseOutputBtn');
    
    if (type === 'custom') {
        customPath.style.display = 'block';
        browseBtn.style.display = 'block';
    } else {
        customPath.style.display = 'none';
        browseBtn.style.display = 'none';
    }
}

function browseOutputFolder() {
    csInterface.evalScript('selectOutputFolder()', function(result) {
        if (result && result !== 'null') {
            document.getElementById('customOutputPath').value = result;
            log('Output folder selected: ' + result, 'info');
        }
    });
}

// Analyze Timeline
function analyzeTimeline() {
    log('Analyzing timeline...', 'info');
    updateActiveFilters();
    
    var params = {
        videoTrack: document.getElementById('videoTrackBtn').classList.contains('active'),
        audioTrack: document.getElementById('audioTrackBtn').classList.contains('active'),
        soloTrack: document.getElementById('soloTrackToggle').checked,
        soloTrackName: document.getElementById('soloTrackSelect').value,
        filters: activeFilters
    };
    
    csInterface.evalScript('analyzeTimelineClips(' + JSON.stringify(params) + ')', function(result) {
        if (result && result !== 'null') {
            try {
                detectedClips = JSON.parse(result);
                displayClips(detectedClips);
                document.getElementById('exportBtn').disabled = detectedClips.length === 0;
                log('Found ' + detectedClips.length + ' clips matching filters', 'success');
            } catch (e) {
                log('Error parsing clips: ' + e.message, 'error');
            }
        } else {
            log('No clips found or error occurred', 'error');
        }
    });
}

function displayClips(clips) {
    var preview = document.getElementById('clipsPreview');
    var list = document.getElementById('clipsList');
    var count = document.getElementById('clipCount');
    
    preview.style.display = 'block';
    count.textContent = clips.length + ' clip' + (clips.length !== 1 ? 's' : '') + ' detected';
    list.innerHTML = '';
    
    if (clips.length === 0) {
        list.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No clips found</div>';
        return;
    }
    
    clips.forEach(function(clip, index) {
        var card = document.createElement('div');
        card.className = 'clip-card';
        
        var name = document.createElement('div');
        name.className = 'clip-name';
        name.textContent = (index + 1) + '. ' + clip.name;
        
        var info = document.createElement('div');
        info.className = 'clip-info';
        info.innerHTML = '<span>' + formatTimecode(clip.start) + ' - ' + formatTimecode(clip.end) + '</span>' +
                        '<span>Duration: ' + formatTimecode(clip.duration) + '</span>';
        
        card.appendChild(name);
        card.appendChild(info);
        list.appendChild(card);
    });
}

// Export Functions
function exportAllClips() {
    var outputType = document.getElementById('outputFolderType').value;
    var outputPath = outputType === 'project' ? 'PROJECT' : document.getElementById('customOutputPath').value;
    
    if (outputType === 'custom' && !outputPath) {
        alert('Please select an output folder');
        return;
    }
    
    var exportData = {
        clips: detectedClips,
        outputPath: outputPath,
        namingPattern: document.getElementById('fileNamePattern').value,
        preset: document.getElementById('encodingPreset').value,
        useAME: document.getElementById('useAME').checked,
        videoTrack: document.getElementById('videoTrackBtn').classList.contains('active'),
        audioTrack: document.getElementById('audioTrackBtn').classList.contains('active')
    };
    
    document.getElementById('exportBtn').disabled = true;
    document.getElementById('progress').style.display = 'block';
    log('Starting batch export...', 'info');
    
    csInterface.evalScript('batchExportClips(' + JSON.stringify(exportData) + ')', function(result) {
        document.getElementById('progress').style.display = 'none';
        document.getElementById('exportBtn').disabled = false;
        
        if (result && result !== 'error') {
            log('Export completed! ' + detectedClips.length + ' clips queued', 'success');
            showNotification('Successfully queued ' + detectedClips.length + ' clips!');
        } else {
            log('Export failed. Check if Media Encoder is running.', 'error');
            showNotification('Export failed. Please check Media Encoder.', 'error');
        }
    });
}

function exportActiveSequence() {
    log('Exporting active sequence...', 'info');
    csInterface.evalScript('exportActiveSequence()', function(result) {
        if (result === 'success') {
            log('Active sequence queued to Media Encoder', 'success');
        } else {
            log('Failed to export active sequence', 'error');
        }
    });
}

function exportSelectedBin() {
    log('Exporting selected bin...', 'info');
    csInterface.evalScript('exportSelectedBin()', function(result) {
        if (result === 'success') {
            log('Selected bin items queued to Media Encoder', 'success');
        } else {
            log('Failed to export selected bin', 'error');
        }
    });
}

// Preferences
function showPreferences() {
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('preferencesPanel').style.display = 'block';
}

function hidePreferences() {
    document.getElementById('mainPanel').style.display = 'block';
    document.getElementById('preferencesPanel').style.display = 'none';
}

function updateIntervalValue() {
    var value = document.getElementById('refreshInterval').value;
    document.getElementById('intervalValue').textContent = value + 's';
}

function importPreset() {
    csInterface.evalScript('importPreset()', function(result) {
        if (result && result !== 'null') {
            log('Preset imported: ' + result, 'success');
        }
    });
}

function addPresetFolder() {
    csInterface.evalScript('selectPresetFolder()', function(result) {
        if (result && result !== 'null') {
            document.getElementById('presetPath').value = result;
            settings.customPresetPath = result;
            saveSettings();
            log('Preset folder added: ' + result, 'success');
        }
    });
}

function removePresetPath() {
    document.getElementById('presetPath').value = 'No custom path set';
    settings.customPresetPath = '';
    saveSettings();
    log('Custom preset path removed', 'info');
}

// Settings Management
function loadSettings() {
    var saved = localStorage.getItem('clipsExporterSettings');
    if (saved && settings.autoLoadSettings) {
        try {
            settings = JSON.parse(saved);
            applySettings();
            log('Settings loaded', 'info');
        } catch (e) {
            log('Failed to load settings', 'warning');
        }
    }
}

function saveSettings() {
    settings.autoRefresh = document.getElementById('autoRefresh').checked;
    settings.refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    settings.autoLoadSettings = document.getElementById('autoLoadSettings').checked;
    settings.soloLinkedTracks = document.getElementById('soloLinkedTracks').checked;
    settings.notificationLevel = document.getElementById('notificationLevel').value;
    
    localStorage.setItem('clipsExporterSettings', JSON.stringify(settings));
    log('Settings saved', 'success');
}

function applySettings() {
    document.getElementById('autoRefresh').checked = settings.autoRefresh;
    document.getElementById('refreshInterval').value = settings.refreshInterval;
    document.getElementById('autoLoadSettings').checked = settings.autoLoadSettings;
    document.getElementById('soloLinkedTracks').checked = settings.soloLinkedTracks;
    document.getElementById('notificationLevel').value = settings.notificationLevel;
    document.getElementById('presetPath').value = settings.customPresetPath || 'No custom path set';
    
    updateIntervalValue();
    setupToggleSwitches();
}

function importPreferences() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                settings = JSON.parse(event.target.result);
                applySettings();
                saveSettings();
                log('Preferences imported successfully', 'success');
            } catch (err) {
                log('Failed to import preferences', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportPreferences() {
    var data = JSON.stringify(settings, null, 2);
    var blob = new Blob([data], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'clips-exporter-preferences.json';
    a.click();
    log('Preferences exported', 'success');
}

function resetPreferences() {
    if (confirm('Are you sure you want to reset all preferences to default?')) {
        localStorage.removeItem('clipsExporterSettings');
        settings = {
            autoRefresh: false,
            refreshInterval: 5,
            autoLoadSettings: true,
            soloLinkedTracks: true,
            notificationLevel: 'errors',
            customPresetPath: ''
        };
        applySettings();
        log('Preferences reset to default', 'info');
    }
}

// Utilities
function refreshExtension() {
    location.reload();
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

function log(message, type) {
    var logDiv = document.getElementById('log');
    var entry = document.createElement('div');
    entry.className = 'log-entry ' + (type || 'info');
    
    var timestamp = new Date().toLocaleTimeString();
    entry.textContent = '[' + timestamp + '] ' + message;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function showNotification(message, type) {
    if (settings.notificationLevel === 'none') return;
    if (settings.notificationLevel === 'errors' && type !== 'error') return;
    
    alert(message);
}

function formatTimecode(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * 30);
    
    return pad(h) + ':' + pad(m) + ':' + pad(s) + ':' + pad(f);
}

function pad(num) {
    return (num < 10 ? '0' : '') + num;
}

function updateProgress(current, total) {
    var percent = (current / total) * 100;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = 'Processing ' + current + ' of ' + total;
}