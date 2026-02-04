'use strict';

// #region 1. CONFIGURATION & IMPORTS
// ============================================================================
const crypto = require('crypto');
const os = require('os');

const CONFIG = {
    PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyaq6Mydb8l6kDtG0Y5n8
+HAzeF47K4ho0dGpH9J+X0y5jlIsfGLJMD6g1ZWT2hDmMKbqSiFN5fCUD4wTuH6Y
Yq0eDgsgWWf5sHGhNGtXNc5aOqRocXNx/Hf6CggCkyU2M6vp8chlCVjlxoNqOipP
2XDCl9ACdeby1/IqZ2r4Xs3Ooip079HsXd5k/+OuCoG350ZQaqMFiiKHaf2ufpAA
AYZgyJ44q2vUcfw/3EOXKpPYo3veJrasAnLOyLYZ1LWvmzPnKQzHqUKHKD2kit8V
bGOm66fnmrDK2IUZdZmzx8WG1mgvC8AxZrVBM+F1NWqJ+6FqvysdV2ftHYgEu+8+
9wIDAQAB
-----END PUBLIC KEY-----`,
    REFRESH_TRACK_DELAY: 1000,
    TOAST_DURATION: 4000
};

// Global State
const AppState = {
    csInterface: null,
    detectedClips: [],
    activeFilters: [],
    settings: {
        autoRefresh: false,
        refreshInterval: 5,
        autoLoadSettings: true,
        soloLinkedTracks: true,
        notificationLevel: 'errors',
        customPresetPath: ''
    }
};
// #endregion

// #region 2. LICENSE MANAGER
// ============================================================================
const LicenseManager = {
    getHardwareID: function() {
        try {
            const interfaces = os.networkInterfaces();
            for (const name in interfaces) {
                for (const iface of interfaces[name]) {
                    if (!iface.internal && iface.mac !== '00:00:00:00:00:00' && !name.toLowerCase().includes('virtual')) {
                        return iface.mac;
                    }
                }
            }
            return "UNKNOWN_DEVICE";
        } catch (e) { return "ERROR_GET_HWID"; }
    },

    verify: function(inputKey) {
        try {
            if (!inputKey) return { valid: false, msg: "Vui lòng nhập Key!" };
            
            const decodedString = Buffer.from(inputKey, 'base64').toString('utf8');
            const parts = decodedString.split("|||");
            
            if (parts.length !== 2) return { valid: false, msg: "Key sai định dạng!" };

            const dataString = parts[0];
            const signature = parts[1];
            const dataObj = JSON.parse(dataString);

            // Verify Signature
            const verify = crypto.createVerify('SHA256');
            verify.update(dataString);
            verify.end();
            const isSignatureValid = verify.verify(CONFIG.PUBLIC_KEY, signature, 'base64');

            if (!isSignatureValid) return { valid: false, msg: "Key giả mạo!" };

            // Verify Expiry
            if (new Date() > new Date(dataObj.exp)) return { valid: false, msg: "Key đã hết hạn!" };

            // Verify HWID
            const currentHWID = this.getHardwareID();
            if (dataObj.hwid && dataObj.hwid !== currentHWID) {
                return { valid: false, msg: "Key không dùng được cho máy này!" };
            }

            return { valid: true, msg: "Hợp lệ", user: dataObj.email };
        } catch (e) {
            return { valid: false, msg: "Lỗi kiểm tra key: " + e.message };
        }
    },

    checkAutoLogin: function() {
        const hwidDisplay = document.getElementById("hwidDisplay");
        if(hwidDisplay) hwidDisplay.value = this.getHardwareID();

        const savedKey = localStorage.getItem('license_key');
        const modal = document.getElementById('licenseModal');
        
        let isAuthorized = false;
        if (savedKey) {
            const check = this.verify(savedKey);
            if (check.valid) isAuthorized = true;
        }

        if (isAuthorized) {
            if(modal) modal.style.display = "none";
            initApp();
        } else {
            console.log("⚠️ App locked - Waiting for license activation");
        }
    }
};

// Window functions for HTML onClick (Keep for compatibility)
window.copyHWID = function() {
    const hwidInput = document.getElementById("hwidDisplay");
    if (hwidInput) {
        hwidInput.select();
        document.execCommand("copy");
        alert("Đã copy mã máy!");
    }
};

window.onActivateBtnClick = function() {
    const keyInput = document.getElementById('keyInput');
    const errorMsg = document.getElementById('errorMsg');
    const modal = document.getElementById('licenseModal');
    
    if(!keyInput) return;
    
    const userKey = keyInput.value.trim();
    const result = LicenseManager.verify(userKey);

    if (result.valid) {
        localStorage.setItem('license_key', userKey);
        if(modal) modal.style.display = "none";
        alert("Kích hoạt thành công! Xin chào " + result.user);
        initApp(); 
    } else {
        if(errorMsg) {
            errorMsg.innerText = result.msg;
            errorMsg.style.display = "block";
        }
    }
};
// #endregion

// #region 3. CORE APPLICATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    LicenseManager.checkAutoLogin();
});

function initApp() {
    if (typeof CSInterface === 'undefined') {
        // ALERT ở đây sẽ dùng giao diện đẹp vì đã override ở cuối file
        alert('Lỗi: Không tìm thấy CSInterface.js');
        return;
    }
    
    AppState.csInterface = new CSInterface();
    
    setupDefaultValues();
    SettingsManager.load();
    setupEventListeners();
    setupToggleSwitches();
    
    // [FIX] Tự động load track list khi mở app
    setTimeout(() => {
        TrackManager.updateList();
    }, CONFIG.REFRESH_TRACK_DELAY);
    
    Logger.info('✅ Clips Exporter Pro v2.0 - Authorized & Loaded');
}

function setupEventListeners() {
    // --- Header & Navigation ---
    document.getElementById('preferencesBtn').addEventListener('click', UIManager.showPreferences);
    document.getElementById('backBtn').addEventListener('click', UIManager.hidePreferences);
    document.getElementById('refreshBtn').addEventListener('click', () => location.reload());
    document.getElementById('clearLogBtn').addEventListener('click', Logger.clear);

    // --- Track Controls ---
    document.getElementById('videoTrackBtn').addEventListener('click', TrackManager.toggleType);
    document.getElementById('audioTrackBtn').addEventListener('click', TrackManager.toggleType);
    
    document.getElementById('soloTrackToggle').addEventListener('change', function() {
        TrackManager.toggleSoloUI();
        if (this.checked) TrackManager.updateList();
    });

    document.getElementById('soloTrackSelect').addEventListener('mousedown', function() {
        if (this.options.length <= 1) TrackManager.updateList();
    });

    // --- Filters ---
    document.getElementById('addFilterBtn').addEventListener('click', FilterManager.add);
    document.getElementById('clearFiltersBtn').addEventListener('click', FilterManager.clearAll);

    // --- Filename & Variables ---
    document.getElementById('insertVariableBtn').addEventListener('click', UIManager.showVariableMenu);
    UIManager.setupVariableMenuEvents();
    
    const fileNameInput = document.getElementById('fileNamePattern');
    if (fileNameInput) {
        if (!fileNameInput.value.trim()) fileNameInput.value = "{clipName}_{###}";
        fileNameInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // --- Output Folder ---
    document.getElementById('outputFolderType').addEventListener('change', ExportManager.handleOutputFolderChange);
    document.getElementById('browseOutputBtn').addEventListener('click', ExportManager.browseOutputFolder);

    // --- Export Actions ---
    document.getElementById('analyzeBtn').addEventListener('click', ExportManager.analyzeTimeline);
    document.getElementById('exportBtn').addEventListener('click', ExportManager.exportAllClips);
    document.getElementById('exportActiveSeqBtn').addEventListener('click', ExportManager.exportActiveSequence);
    document.getElementById('exportSelectedBinBtn').addEventListener('click', ExportManager.exportSelectedBin);

    // --- Preferences & Presets ---
    document.getElementById('autoRefresh').addEventListener('change', SettingsManager.save);
    document.getElementById('refreshInterval').addEventListener('input', UIManager.updateIntervalValue);
    document.getElementById('refreshInterval').addEventListener('change', SettingsManager.save);
    document.getElementById('autoLoadSettings').addEventListener('change', SettingsManager.save);
    document.getElementById('soloLinkedTracks').addEventListener('change', SettingsManager.save);
    document.getElementById('notificationLevel').addEventListener('change', SettingsManager.save);
    
    document.getElementById('importPresetBtn').addEventListener('click', PresetManager.import);
    document.getElementById('addPresetFolderBtn').addEventListener('click', PresetManager.addFolder);
    document.getElementById('removePresetPathBtn').addEventListener('click', PresetManager.removePath);
    
    document.getElementById('importPrefBtn').addEventListener('click', SettingsManager.import);
    document.getElementById('exportPrefBtn').addEventListener('click', SettingsManager.export);
    document.getElementById('resetPrefBtn').addEventListener('click', SettingsManager.reset);
}

function setupDefaultValues() {
    const fileNameInput = document.getElementById('fileNamePattern');
    if (fileNameInput && !fileNameInput.value.trim()) fileNameInput.value = "{clipName}_{###}";
    
    const encodingPreset = document.getElementById('encodingPreset');
    if (encodingPreset && !encodingPreset.value) encodingPreset.value = "H.264 - High Quality 1080p";
    
    const outputFolderType = document.getElementById('outputFolderType');
    if (outputFolderType && !outputFolderType.value) {
        outputFolderType.value = "project";
        ExportManager.handleOutputFolderChange();
    }
}

function setupToggleSwitches() {
    document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(toggle => {
        UIManager.updateToggleText(toggle);
        toggle.addEventListener('change', () => UIManager.updateToggleText(toggle));
    });
}
// #endregion

// #region 4. MANAGER MODULES (LOGIC)
// ============================================================================

const TrackManager = {
    toggleType: function(e) {
        e.target.classList.toggle('active');
        Logger.info('Track type toggled: ' + e.target.dataset.type);
    },

    toggleSoloUI: function() {
        const isChecked = document.getElementById('soloTrackToggle').checked;
        document.getElementById('soloTrackSelector').style.display = isChecked ? 'block' : 'none';
    },

    updateList: function() {
        const select = document.getElementById('soloTrackSelect');
        select.innerHTML = '<option disabled>Đang quét track...</option>';
        select.disabled = true;

        AppState.csInterface.evalScript('getSequenceTracksInfo()', (result) => {
            select.innerHTML = ''; 
            
            if (!result || result === 'null') {
                select.innerHTML = '<option disabled>Không tìm thấy Sequence</option>';
                return;
            }

            try {
                const data = JSON.parse(result);
                let hasTracks = false;

                const addGroup = (label, tracks, typePrefix) => {
                    if (tracks && tracks.length > 0) {
                        const group = document.createElement('optgroup');
                        group.label = label;
                        tracks.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = `${typePrefix}-${t.index}`;
                            const status = t.hasClips ? " (Có clip)" : " (Trống)";
                            opt.textContent = t.name + status;
                            
                            if (t.hasClips) {
                                opt.style.fontWeight = "bold";
                                opt.style.color = "#4CAF50";
                            }
                            group.appendChild(opt);
                        });
                        select.appendChild(group);
                        hasTracks = true;
                    }
                };

                addGroup("Video Tracks", data.video, "video");
                addGroup("Audio Tracks", data.audio, "audio");

                select.disabled = !hasTracks;
            } catch(e) {
                console.error(e);
                select.innerHTML = '<option disabled>Lỗi đọc track</option>';
            }
        });
    }
};

const FilterManager = {
    add: function() {
        const filterDiv = document.createElement('div');
        filterDiv.className = 'filter-item';
        
        const filterSelect = document.createElement('select');
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
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Value...';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'filter-remove-btn';
        removeBtn.innerHTML = '−';
        removeBtn.onclick = () => {
            filterDiv.remove();
            FilterManager.updateActive();
        };
        
        filterSelect.addEventListener('change', () => {
            const hiddenTypes = ['selected', 'in_workarea'];
            valueInput.style.display = hiddenTypes.includes(filterSelect.value) ? 'none' : 'block';
        });
        
        filterDiv.appendChild(filterSelect);
        filterDiv.appendChild(valueInput);
        filterDiv.appendChild(removeBtn);
        
        document.getElementById('filtersList').appendChild(filterDiv);
        FilterManager.updateActive();
    },

    updateActive: function() {
        AppState.activeFilters = [];
        document.querySelectorAll('.filter-item').forEach(item => {
            AppState.activeFilters.push({
                type: item.querySelector('select').value,
                value: item.querySelector('input').value
            });
        });
        Logger.info('Filters updated: ' + AppState.activeFilters.length + ' active');
    },

    clearAll: function() {
        document.getElementById('filtersList').innerHTML = '';
        AppState.activeFilters = [];
        Logger.info('All filters cleared');
    }
};

const ExportManager = {
    handleOutputFolderChange: function() {
        const type = document.getElementById('outputFolderType').value;
        const isCustom = type === 'custom';
        document.getElementById('customOutputPath').style.display = isCustom ? 'block' : 'none';
        document.getElementById('browseOutputBtn').style.display = isCustom ? 'block' : 'none';
    },

    browseOutputFolder: function() {
        AppState.csInterface.evalScript('selectOutputFolder()', (result) => {
            if (result && result !== 'null') {
                document.getElementById('customOutputPath').value = result;
                Logger.info('Output folder selected: ' + result);
            }
        });
    },

    analyzeTimeline: function() {
        Logger.info('Analyzing timeline...');
        FilterManager.updateActive();
        
        const params = {
            videoTrack: document.getElementById('videoTrackBtn').classList.contains('active'),
            audioTrack: document.getElementById('audioTrackBtn').classList.contains('active'),
            soloTrack: document.getElementById('soloTrackToggle').checked,
            soloTrackName: document.getElementById('soloTrackSelect').value,
            filters: AppState.activeFilters
        };

        AppState.csInterface.evalScript('analyzeTimelineClips(' + JSON.stringify(params) + ')', (result) => {
            if (result && result !== 'null') {
                try {
                    AppState.detectedClips = JSON.parse(result);
                    UIManager.displayClips(AppState.detectedClips);
                    document.getElementById('exportBtn').disabled = AppState.detectedClips.length === 0;
                    Logger.success('Found ' + AppState.detectedClips.length + ' clips matching filters');
                } catch (e) {
                    Logger.error('Error parsing clips: ' + e.message);
                }
            } else {
                Logger.error('No clips found or error occurred');
            }
        });
    },

    exportAllClips: function() {
        const outputType = document.getElementById('outputFolderType').value;
        const outputPath = outputType === 'project' ? 'PROJECT' : document.getElementById('customOutputPath').value;
        
        if (outputType === 'custom' && !outputPath) {
            alert('Please select an output folder');
            return;
        }
        
        const exportData = {
            clips: AppState.detectedClips,
            outputPath: outputPath,
            namingPattern: document.getElementById('fileNamePattern').value,
            preset: document.getElementById('encodingPreset').value,
            useAME: document.getElementById('useAME').checked,
            videoTrack: document.getElementById('videoTrackBtn').classList.contains('active'),
            audioTrack: document.getElementById('audioTrackBtn').classList.contains('active')
        };
        
        document.getElementById('exportBtn').disabled = true;
        document.getElementById('progress').style.display = 'block';
        
        // Progress Bar Simulation
        const totalClips = AppState.detectedClips.length;
        UIManager.updateProgress(0, totalClips);
        Logger.info('Starting batch export...');
        
        let currentClip = 0;
        const progressInterval = setInterval(() => {
            currentClip++;
            if (currentClip <= totalClips) UIManager.updateProgress(currentClip, totalClips);
        }, 1000);
        
        AppState.csInterface.evalScript('batchExportClips(' + JSON.stringify(exportData) + ')', (result) => {
            clearInterval(progressInterval);
            UIManager.updateProgress(totalClips, totalClips);
            
            setTimeout(() => {
                document.getElementById('progress').style.display = 'none';
            }, 2000);
            
            document.getElementById('exportBtn').disabled = false;
            
            if (result && result !== 'error') {
                Logger.success('Export completed! ' + totalClips + ' clips queued');
                UIManager.showNotification('Successfully queued ' + totalClips + ' clips!', 'success');
            } else {
                Logger.error('Export failed. Check Media Encoder.');
                UIManager.showNotification('Export failed. Please check Media Encoder.', 'error');
            }
        });
    },

    exportActiveSequence: function() {
        Logger.info('Exporting active sequence...');
        AppState.csInterface.evalScript('exportActiveSequence()', (result) => {
            if (result === 'success') Logger.success('Active sequence queued to Media Encoder');
            else Logger.error('Failed to export active sequence');
        });
    },

    exportSelectedBin: function() {
        Logger.info('Exporting selected bin...');
        AppState.csInterface.evalScript('exportSelectedBin()', (result) => {
            if (result === 'success') Logger.success('Selected bin items queued to Media Encoder');
            else Logger.error('Failed to export selected bin');
        });
    }
};

const SettingsManager = {
    load: function() {
        const saved = localStorage.getItem('clipsExporterSettings');
        if (saved && AppState.settings.autoLoadSettings) {
            try {
                AppState.settings = JSON.parse(saved);
                this.apply();
                Logger.info('Settings loaded');
            } catch (e) {
                Logger.warning('Failed to load settings');
            }
        }
    },

    save: function() {
        AppState.settings.autoRefresh = document.getElementById('autoRefresh').checked;
        AppState.settings.refreshInterval = parseInt(document.getElementById('refreshInterval').value);
        AppState.settings.autoLoadSettings = document.getElementById('autoLoadSettings').checked;
        AppState.settings.soloLinkedTracks = document.getElementById('soloLinkedTracks').checked;
        AppState.settings.notificationLevel = document.getElementById('notificationLevel').value;
        
        localStorage.setItem('clipsExporterSettings', JSON.stringify(AppState.settings));
        Logger.success('Settings saved');
    },

    apply: function() {
        document.getElementById('autoRefresh').checked = AppState.settings.autoRefresh;
        document.getElementById('refreshInterval').value = AppState.settings.refreshInterval;
        document.getElementById('autoLoadSettings').checked = AppState.settings.autoLoadSettings;
        document.getElementById('soloLinkedTracks').checked = AppState.settings.soloLinkedTracks;
        document.getElementById('notificationLevel').value = AppState.settings.notificationLevel;
        document.getElementById('presetPath').value = AppState.settings.customPresetPath || 'No custom path set';
        
        UIManager.updateIntervalValue();
        setupToggleSwitches();
    },

    import: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    AppState.settings = JSON.parse(event.target.result);
                    SettingsManager.apply();
                    SettingsManager.save();
                    Logger.success('Preferences imported successfully');
                } catch (err) {
                    Logger.error('Failed to import preferences');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    export: function() {
        const data = JSON.stringify(AppState.settings, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clips-exporter-preferences.json';
        a.click();
        Logger.success('Preferences exported');
    },

    reset: function() {
        if (confirm('Are you sure you want to reset all preferences to default?')) {
            localStorage.removeItem('clipsExporterSettings');
            AppState.settings = {
                autoRefresh: false,
                refreshInterval: 5,
                autoLoadSettings: true,
                soloLinkedTracks: true,
                notificationLevel: 'errors',
                customPresetPath: ''
            };
            SettingsManager.apply();
            Logger.info('Preferences reset to default');
        }
    }
};

const PresetManager = {
    import: function() {
        AppState.csInterface.evalScript('importPreset()', (result) => {
            if (result && result !== 'null') Logger.success('Preset imported: ' + result);
        });
    },
    
    addFolder: function() {
        AppState.csInterface.evalScript('selectPresetFolder()', (result) => {
            if (result && result !== 'null') {
                document.getElementById('presetPath').value = result;
                AppState.settings.customPresetPath = result;
                SettingsManager.save();
                Logger.success('Preset folder added: ' + result);
            }
        });
    },

    removePath: function() {
        document.getElementById('presetPath').value = 'No custom path set';
        AppState.settings.customPresetPath = '';
        SettingsManager.save();
        Logger.info('Custom preset path removed');
    }
};
// #endregion

// #region 5. UI & UTILITIES
// ============================================================================

const UIManager = {
    showPreferences: () => {
        document.getElementById('mainPanel').style.display = 'none';
        document.getElementById('preferencesPanel').style.display = 'block';
    },

    hidePreferences: () => {
        document.getElementById('mainPanel').style.display = 'block';
        document.getElementById('preferencesPanel').style.display = 'none';
    },

    updateIntervalValue: () => {
        const value = document.getElementById('refreshInterval').value;
        document.getElementById('intervalValue').textContent = value + 's';
    },

    updateToggleText: (toggle) => {
        const label = toggle.nextElementSibling;
        const text = label.querySelector('.toggle-text');
        if (text) text.textContent = toggle.checked ? 'ON' : 'OFF';
    },

    showVariableMenu: () => {
        const menu = document.getElementById('variableMenu');
        const isVisible = menu.classList.contains('show');
        document.querySelectorAll('.variable-menu').forEach(m => m.classList.remove('show'));
        
        if (!isVisible) {
            menu.classList.add('show');
            const input = document.getElementById('fileNamePattern');
            menu.style.top = '100%';
            menu.style.left = '0';
            menu.style.width = input.offsetWidth + 'px';
        }
    },

    setupVariableMenuEvents: () => {
        document.querySelectorAll('.variable-item').forEach(item => {
            item.addEventListener('click', () => {
                const variable = item.dataset.var;
                const input = document.getElementById('fileNamePattern');
                const cursorPos = input.selectionStart;
                const currentValue = input.value;
                
                const newValue = currentValue.substring(0, cursorPos) + variable + currentValue.substring(cursorPos);
                input.value = newValue;
                
                const newCursorPos = cursorPos + variable.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
                input.focus();
                
                document.getElementById('variableMenu').classList.remove('show');
            });
        });

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('variableMenu');
            const btn = document.getElementById('insertVariableBtn');
            const input = document.getElementById('fileNamePattern');
            if (!menu.contains(e.target) && e.target !== btn && e.target !== input) {
                menu.classList.remove('show');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') document.getElementById('variableMenu').classList.remove('show');
        });
    },

    displayClips: (clips) => {
        const list = document.getElementById('clipsList');
        document.getElementById('clipsPreview').style.display = 'block';
        document.getElementById('clipCount').textContent = `${clips.length} clip${clips.length !== 1 ? 's' : ''} detected`;
        list.innerHTML = '';
        
        if (clips.length === 0) {
            list.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No clips found</div>';
            return;
        }
        
        clips.forEach((clip, index) => {
            const card = document.createElement('div');
            card.className = 'clip-card';
            card.innerHTML = `
                <div class="clip-name">${index + 1}. ${clip.name}</div>
                <div class="clip-info">
                    <span>${formatTimecode(clip.start)} - ${formatTimecode(clip.end)}</span>
                    <span>Duration: ${formatTimecode(clip.duration)}</span>
                </div>`;
            list.appendChild(card);
        });
    },

    updateProgress: (current, total) => {
        const percent = Math.round((current / total) * 100);
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        
        if (fill) fill.style.width = percent + '%';
        if (text) {
            if (current === 0) text.textContent = 'Đang khởi tạo...';
            else if (current === total) text.textContent = `Hoàn thành! ${total} clips đã gửi đến AME (${percent}%)`;
            else text.textContent = `Đang xử lý clip ${current}/${total} (${percent}%)`;
        }
    },

    // --- HÀM SHOW ALERT BẢNG TO ĐẸP ---
    showAlert: (title, message, type = 'info') => {
        const modal = document.getElementById('messageModal');
        const box = modal.querySelector('.message-box');
        const icon = document.getElementById('msgIcon');
        const titleEl = document.getElementById('msgTitle');
        const bodyEl = document.getElementById('msgBody');
        const btn = document.getElementById('msgBtn');

        titleEl.textContent = title;
        bodyEl.textContent = message;

        // Reset class
        box.className = 'modal-content message-box'; 
        
        // Thêm class màu sắc dựa trên type
        if (type === 'error') {
            box.classList.add('msg-error');
            icon.textContent = '✕';
        } else if (type === 'success') {
            box.classList.add('msg-success');
            icon.textContent = '✔';
        } else {
            box.classList.add('msg-info');
            icon.textContent = 'ℹ';
        }

        modal.classList.add('show-flex');

        const closeFunc = () => {
            modal.classList.remove('show-flex');
            btn.removeEventListener('click', closeFunc);
        };
        btn.addEventListener('click', closeFunc);
        
        modal.onclick = (e) => {
            if (e.target === modal) closeFunc();
        };
    },

    // --- HÀM QUẢN LÝ THÔNG BÁO ---
    showNotification: (message, type) => {
        // 1. NẾU LÀ LỖI -> Hiện bảng Modal to (Bắt buộc người dùng đọc)
        if (type === 'error') {
            UIManager.showAlert('Đã xảy ra lỗi', message, 'error');
            return;
        }

        // 2. NẾU LÀ SUCCESS/INFO -> Hiện Toast nhỏ ở dưới (Tự biến mất)
        if (AppState.settings.notificationLevel === 'none') return;
        if (AppState.settings.notificationLevel === 'errors' && type !== 'error') return;

        const toast = document.getElementById("customToast");
        const msgDiv = document.getElementById("toastMessage");
        const iconDiv = document.getElementById("toastIcon");

        if (!toast) return;

        msgDiv.textContent = message;
        // Đặt class màu sắc cho Toast
        toast.className = "toast-notification " + (type === 'success' ? "toast-success" : "toast-info");
        iconDiv.textContent = type === 'success' ? "✔" : "ℹ";

        toast.classList.add("show");

        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => toast.classList.remove("show"), CONFIG.TOAST_DURATION);
    }
};

// Logger Utility
const Logger = {
    _log: (message, type = 'info') => {
        const logDiv = document.getElementById('log');
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
    },
    info: function(msg) { this._log(msg, 'info'); },
    success: function(msg) { this._log(msg, 'success'); },
    warning: function(msg) { this._log(msg, 'warning'); },
    error: function(msg) { this._log(msg, 'error'); },
    clear: () => document.getElementById('log').innerHTML = ''
};

// Helper Functions
function formatTimecode(seconds) {
    const pad = num => (num < 10 ? '0' : '') + num;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}
// #endregion

// ========================================================
// GHI ĐÈ LỆNH ALERT MẶC ĐỊNH CỦA TRÌNH DUYỆT
// ========================================================
window.alert = function(message) {
    console.log("Custom alert triggered:", message);
    if (typeof UIManager !== 'undefined' && UIManager.showAlert) {
        UIManager.showAlert('Thông báo', message, 'info');
    } else {
        // Fallback nếu UIManager chưa load (rất hiếm khi xảy ra)
        console.error("UIManager not found, falling back to log");
    }
};
