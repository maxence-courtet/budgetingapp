"""Narration for the tutorial videos, with Kokoro (an offline neural text-to-speech model).

  python voice.py lines  <models-dir> <lines.json> <out-dir> [voice]
      Speaks each line of lines.json into out-dir/NN.wav and prints their durations as JSON.
  python voice.py mix    <timeline.json> <out.wav> <amps.json> <fps>
      Places each clip at its start time into one track, and writes the loudness per video frame
      (0..1) that drives the presenter's mouth.

Models (kokoro-v1.0.onnx, voices-v1.0.bin) come from the kokoro-onnx GitHub releases.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf


def lines(models, lines_file, out_dir, voice="af_heart"):
    from kokoro_onnx import Kokoro

    k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
    os.makedirs(out_dir, exist_ok=True)
    durations = []
    for i, text in enumerate(json.load(open(lines_file))):
        samples, sr = k.create(text, voice=voice, speed=1.0, lang="en-us")
        sf.write(os.path.join(out_dir, f"{i:02d}.wav"), samples, sr)
        durations.append(len(samples) / sr)
    print(json.dumps(durations))


def mix(timeline_file, out_wav, amps_file, fps):
    fps = int(fps)
    tl = json.load(open(timeline_file))
    sr = 24000
    track = np.zeros(int((tl["duration"] + 0.5) * sr), dtype=np.float32)
    for clip in tl["clips"]:
        data, rate = sf.read(clip["file"], dtype="float32")
        if data.ndim > 1:
            data = data.mean(axis=1)
        assert rate == sr, rate
        start = int(clip["start"] * sr)
        end = min(start + len(data), len(track))
        track[start:end] += data[: end - start]
    track = np.clip(track, -1, 1)
    sf.write(out_wav, track, sr)

    hop = sr // fps
    frames = int(tl["duration"] * fps)
    rms = np.array([np.sqrt(np.mean(track[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(track) else 0 for i in range(frames)])
    peak = np.percentile(rms[rms > 0], 95) if np.any(rms > 0) else 1
    amps = np.clip(rms / peak, 0, 1)
    # Smooth a little so the mouth doesn't flicker.
    amps = np.convolve(amps, [0.25, 0.5, 0.25], mode="same")
    json.dump([round(float(a), 3) for a in amps], open(amps_file, "w"))


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    {"lines": lines, "mix": mix}[cmd](*args)
