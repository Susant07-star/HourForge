import wave
import base64
import os

with wave.open('silent.wav', 'w') as w:
    w.setnchannels(1)
    w.setsampwidth(2)  # 16-bit
    w.setframerate(8000)
    w.writeframes(b'\x00' * 8000 * 2 * 2)  # 2 seconds

with open('silent.wav', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

with open('js/silent_audio.js', 'w') as f:
    f.write(f"const SILENT_AUDIO_WAV = 'data:audio/wav;base64,{b64}';\n")

print("Created js/silent_audio.js")
