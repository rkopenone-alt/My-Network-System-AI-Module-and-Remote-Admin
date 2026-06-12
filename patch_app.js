const fs = require('fs');

function patchAppJs(appDir) {
    const path = appDir + '/App.js';
    let code = fs.readFileSync(path, 'utf8');

    // Add soundRef and play/stop functions
    const refCode = `  const soundRef = React.useRef(null);
  
  const stopFeedbackSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) { }
      soundRef.current = null;
    }
  };

  const playFeedbackSound = async (type) => {
    await stopFeedbackSound();
    try {
      let b64 = CONFIG_SND;
      let isLoop = false;
      if (type === 'siren_loop') { b64 = SIREN_LOOP; isLoop = true; }
      else if (type === 'siren') { b64 = SIREN; }
      else if (type === 'config') { b64 = CONFIG_SND; }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'data:audio/wav;base64,' + b64 }
      );
      soundRef.current = sound;
      await sound.setIsLoopingAsync(isLoop);
      await sound.playAsync();
      if (!isLoop) {
          sound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) {
                  sound.unloadAsync();
                  if (soundRef.current === sound) soundRef.current = null;
              }
          });
      }
    } catch(err) { console.log('Audio error:', err); }
  };
`;

    if (!code.includes('const stopFeedbackSound')) {
        code = code.replace('const [isConnected, setIsConnected] = useState(false);', 
                            'const [isConnected, setIsConnected] = useState(false);\n' + refCode);
    }

    const msgHandler = `
            if (data.type === 'PLAY_SOUND') {
              playFeedbackSound(data.sound);
              return;
            }
            if (data.type === 'STOP_SOUND') {
              stopFeedbackSound();
              return;
            }
`;

    if (!code.includes('PLAY_SOUND')) {
        code = code.replace("if (data.type === 'WS_STATUS') {", 
                            msgHandler + "            if (data.type === 'WS_STATUS') {");
    }

    fs.writeFileSync(path, code);
}

patchAppJs('rescuer-app');
patchAppJs('admin-app');
console.log('App.js patched successfully');
