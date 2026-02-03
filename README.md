# Batch Clip Exporter for Premiere Pro

Extension CEP cho phép xuất hàng loạt các đoạn clip riêng lẻ từ timeline của Premiere Pro sang Adobe Media Encoder.

## ✨ Tính năng

- 🎬 Tự động phát hiện tất cả clips trên track được chọn
- 📦 Xuất hàng loạt từng clip thành file riêng biệt
- 🔓 Bao gồm cả tracks bị khóa (locked) trong export
- 🎯 Hỗ trợ nhiều format: H.264, ProRes, và custom presets
- 📝 Tùy chỉnh naming pattern cho output files
- 📊 Hiển thị preview các clips được phát hiện
- ⚡ Gửi hàng loạt vào Media Encoder queue

## 📋 Yêu cầu

- Adobe Premiere Pro CC 2020 trở lên
- Adobe Media Encoder
- Windows hoặc macOS

## 🚀 Cài đặt

### Windows:

1. **Bật Debug Mode:**
   - Mở `regedit.exe` (Run as Administrator)
   - Đi tới: `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\`
   - Tạo key mới: `PlayerDebugMode` (String Value)
   - Set giá trị: `1`

2. **Copy extension:**
   - Giải nén toàn bộ folder extension
   - Copy vào: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\BatchClipExporter\`

3. **Restart Premiere Pro**

### macOS:

1. **Bật Debug Mode:**
   ```bash
   defaults write /Users/<username>/Library/Preferences/com.adobe.CSXS.11.plist PlayerDebugMode 1
   ```

2. **Copy extension:**
   - Copy folder vào: `/Library/Application Support/Adobe/CEP/extensions/BatchClipExporter/`

3. **Restart Premiere Pro**

## 📖 Cách sử dụng

1. **Mở Extension:**
   - Trong Premiere Pro: `Window > Extensions > Batch Clip Exporter`

2. **Cấu hình Settings:**
   - **Reference Track**: Chọn track để phát hiện clips (thường là V2 nếu V1 là nền)
   - **Output Folder**: Chọn thư mục lưu files export
   - **Naming Pattern**: 
     - `clip_{###}` → clip_001.mp4, clip_002.mp4, ...
     - `video_{name}` → video_OSS.mp4, video_Nền.mp4, ...
   - **Preset**: Chọn preset Media Encoder (H.264, ProRes, v.v.)

3. **Analyze Timeline:**
   - Click "🔍 Analyze Timeline" để quét và hiển thị các clips
   - Kiểm tra danh sách clips được phát hiện

4. **Export:**
   - Click "🚀 Export All Clips to Media Encoder"
   - Đợi extension gửi từng clip vào Media Encoder queue
   - Mở Media Encoder để theo dõi tiến trình render

## ⚙️ Options

### Include all tracks
- ✅ **Bật**: Export bao gồm TẤT CẢ video/audio tracks (kể cả tracks bị khóa)
- ❌ **Tắt**: Chỉ export tracks đang enabled/targeted

### Ignore gaps
- ✅ **Bật**: Chỉ export đoạn có content (bỏ qua khoảng trống)
- ❌ **Tắt**: Export cả gaps giữa các clips

## 🎯 Use Case

### Ví dụ workflow phổ biến:

Bạn có timeline như sau:
```
V2: [OSS] [OSS (試用する)] [OSS] [OSS (試用する)] [OSS (記号)]...
V1: [Nền] [Nền (99%)] [Nền] [Nền (14.09%)]... (LOCKED)
A1: [Audio 1]
A2: [Audio 2]
```

**Kết quả:**
- Extension sẽ phát hiện từng clip trên V2
- Xuất TỪNG ĐOẠN riêng biệt, bao gồm:
  - Nội dung từ V2 (clip chính)
  - Nội dung từ V1 (nền - dù đã bị lock)
  - Audio từ A1, A2, A3
- Output: `clip_001.mp4`, `clip_002.mp4`, ...

## 📁 Cấu trúc Files

```
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
└── README.md
```

## 🐛 Troubleshooting

### Extension không hiển thị trong menu:
- Kiểm tra đã bật PlayerDebugMode chưa
- Đảm bảo copy đúng folder path
- Restart Premiere Pro

### Không thể export:
- Đảm bảo Media Encoder đang chạy
- Kiểm tra quyền ghi vào output folder
- Thử chọn preset khác

### Clips không được phát hiện:
- Kiểm tra đã chọn đúng Reference Track chưa
- Đảm bảo timeline có clips thật sự
- Thử track khác

## 🔧 Customization

Bạn có thể tùy chỉnh:
- **Presets**: Thêm preset trong `jsx/hostscript.jsx` function `getPresetPath()`
- **UI Theme**: Chỉnh sửa `css/style.css`
- **Naming Logic**: Sửa function `generateFileName()` trong JSX

## 📝 Notes

- Extension này hoạt động với CSXS 11 (Premiere Pro 2021+)
- Nếu dùng phiên bản cũ hơn, sửa `CSXS.11` thành `CSXS.9` hoặc `CSXS.10`
- Tracks bị lock vẫn được render trong output (đây là tính năng, không phải bug!)

## 🤝 Credits

Dựa trên cấu trúc của [SIMPLE_QUEUE_TOOL_CEP](https://github.com/Mathsqrt2/SIMPLE_QUEUE_TOOL_CEP)

Special thanks to Hans for his contributions to this tool!

---

