const fs = require('fs');
const file = 'public-sos-app/htmlStr.js';
let data = fs.readFileSync(file, 'utf8');

// 1. Add onclick to Audio Button
data = data.replace(
    /<!-- Audio Button -->\s*<div style="width:55px; height:45px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;">/g,
    `<!-- Audio Button -->
                                 <div id="audioBtn" onclick="core.toggleAudioRecord()" style="width:55px; height:45px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;">
                                     <span id="audioLabel" style="font-size:7px; font-weight:900; color:#2563eb; margin-top:1px; display:none;">AUDIO</span>`
);

// 2. Add state variables
data = data.replace(
    /sosImageData: null,/g,
    `sosImageData: null,
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],`
);

// 3. Add audio methods
const audioMethods = `
            toggleAudioRecord() {
                if (this.isRecording) {
                    this.stopAudioRecord();
                } else {
                    this.startAudioRecord();
                }
            },
            async startAudioRecord() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.mediaRecorder = new MediaRecorder(stream);
                    this.audioChunks = [];
                    this.mediaRecorder.ondataavailable = e => {
                        if (e.data.size > 0) this.audioChunks.push(e.data);
                    };
                    this.mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                        this._compressAudio(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };
                    this.mediaRecorder.start();
                    this.isRecording = true;
                    document.getElementById('audioBtn').style.background = '#fee2e2';
                    document.getElementById('audioBtn').style.borderColor = '#ef4444';
                    this.toast('RECORDING AUDIO...', '🎙️');
                } catch (err) {
                    this.toast('Microphone access denied', '❌');
                }
            },
            stopAudioRecord() {
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                    document.getElementById('audioBtn').style.background = '#dcfce7';
                    document.getElementById('audioBtn').style.borderColor = '#22c55e';
                    document.getElementById('audioLabel').style.display = 'block';
                    document.getElementById('audioLabel').style.color = '#16a34a';
                    document.getElementById('audioLabel').innerText = 'SAVED';
                    this.toast('AUDIO SAVED', '✅');
                }
            },
            _compressAudio(blob) {
                // Read blob as Data URL. For a short webm audio, it usually stays under 200kb if it's less than 15 secs.
                // To keep it simple, we just convert to Base64 directly since the recording is short.
                const reader = new FileReader();
                reader.onloadend = () => {
                    let base64data = reader.result;
                    // If it's too large, we could truncate or alert, but usually voice notes are small.
                    if (base64data.length > 200 * 1024) {
                        this.toast('Audio too long, will be truncated', '⚠️');
                        base64data = base64data.substring(0, 200 * 1024);
                    }
                    this.needs.audio = base64data;
                };
                reader.readAsDataURL(blob);
            },
`;

// Insert methods before _compressImage
data = data.replace(/_compressImage\(file/g, audioMethods + '\n            _compressImage(file');

fs.writeFileSync(file, data);
console.log('Patched public-sos-app/htmlStr.js');
