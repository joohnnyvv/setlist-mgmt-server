const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const WebSocket = require("ws");
const { Ableton } = require("ableton-js");
const { CuePoint } = require("ableton-js/ns/cue-point");
const { EventEmitter } = require("events");
const { clear } = require("console");

const server = http.createServer();

const wss = new WebSocket.Server({ server });

const ableton = new Ableton({ logger: console });

let globalMergedCues = [];
const selectedSongIndexEmitter = new EventEmitter();

ableton
  .start()
  .then(() => {
    console.log("Ableton client started successfully");
    ableton.song.addListener("current_song_time", (time) => {
      wss.clients.forEach(async (client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "song_time", time }));

          const currentIndex = globalMergedCues.findIndex(
            (cue) => cue.song[0].time <= time && cue.song[1].time >= time
          );
          selectedSongIndexEmitter.emit(
            "selectedSongIndexChanged",
            currentIndex
          );
          if (
            currentIndex !== -1 &&
            globalMergedCues[currentIndex].song[1].time ===
              parseInt(time.toFixed(0))
          ) {
            const nextIndex = currentIndex + 1;
            console.log(nextIndex);
            if (!globalMergedCues[currentIndex].doesStop) {
              selectedSongIndexEmitter.emit(
                "selectedSongIndexChanged",
                nextIndex
              );
              const cuePoint = new CuePoint(
                ableton,
                globalMergedCues[nextIndex].song[0]
              );
              await cuePoint.jump();
            } else {
              await ableton.song.stopPlaying();
              const cuePoint = new CuePoint(
                ableton,
                globalMergedCues[nextIndex].song[0]
              );
              await cuePoint.jump();
              selectedSongIndexEmitter.emit(
                "selectedSongIndexChanged",
                nextIndex
              );
            }
          }
        }
      });
    });

    ableton.song.addListener("is_playing", (isPlaying) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "is_playing", isPlaying }));
        }
      });
    });
    ableton.song.addListener("tempo", (tempo) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "tempo", tempo }));
        }
      });
    });
    ableton.song.addListener("loop", (isLooped) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "is_looped", isLooped }));
        }
      });
    });
    selectedSongIndexEmitter.on("selectedSongIndexChanged", (newIndex) => {
      console.log("Selected Song Index changed:", newIndex);
      const message = JSON.stringify({
        type: "selected_song_index",
        index: newIndex,
      });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  })
  .catch((error) => {
    console.error("Error starting Ableton client:", error);
  });

server.listen(8080, () => {
  console.log("Server listening on port 8080");
});

const extractAdditionalInfo = (name) => {
  const startIndex = name.indexOf("{");
  const endIndex = name.indexOf("}");
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const additionalInfoStr = name.substring(startIndex, endIndex + 1);
    console.log(additionalInfoStr);
    return JSON.parse(additionalInfoStr);
  }
  return {};
};

const mergeCues = (cues) => {
  const pairs = [];
  let currentSong = null;

  cues.forEach((cue) => {
    if (cue.name.includes("<end>")) {
      if (currentSong) {
        const addInfo = extractAdditionalInfo(currentSong.name);
        const calculatedSongLength =
          ((cue.time - currentSong.time) * 2) /
          (parseInt(addInfo.tempo.replace(/[^0-9]/g, "")) / 60);
        if (currentSong.name.includes("{") && currentSong.name.includes("}")) {
          const clearedCueName = currentSong.name.split("{").shift();
          currentSong.name = clearedCueName;
          console.log(clearedCueName);
        }
        pairs.push({
          song: [currentSong, cue],
          additionalInfo: addInfo,
          doesStop: false,
          songLengthInBars: cue.time - currentSong.time,
          songLengthInSec: calculatedSongLength,
        });
        currentSong = null;
      }
    } else {
      currentSong = cue;
    }
  });
  globalMergedCues = pairs;
  return pairs;
};

const fetchCues = async () => {
  try {
    await ableton.start();
    const cues = await ableton.song.get("cue_points");
    const mergedCues = mergeCues(cues.map((c) => c.raw));
    return mergedCues;
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
};

app.get("/cues", async (req, res) => {
  try {
    await ableton.start();
    const mergedCues = await fetchCues();
    res.setHeader("Content-Security-Policy", "script-src-attr 'self'");
    res.json(mergedCues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/start-playing", async (req, res) => {
  try {
    await ableton.start();
    await ableton.song.startPlaying();
    res.json({ message: "Playback started" });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Playback failed" });
  }
});

app.get("/stop-playing", async (req, res) => {
  try {
    await ableton.start();
    await ableton.song.stopPlaying();
    res.json({ message: "Playback stopped" });
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error: "Playback couldn't stop" });
  }
});

app.post("/update-cues", async (req, res) => {
  const { cues } = req.body;
  try {
    await ableton.start();
    console.log(cues);
    globalMergedCues = cues;
    res.status(200).json({ message: "Ceeue order updated successfully" });
  } catch (error) {
    console.error("Error updating cue order:", error);
    res.status(500).json({ error: "Failed to update cue order" });
  }
});

app.post("/set-loop-area", async (req, res) => {
  const loopData = req.body;
  try {
    await ableton.start();
    await ableton.song.set("loop_start", loopData.loopStart);
    await ableton.song.set("loop_length", loopData.loopLength);
    res.status(200).json({
      message: "Loop time set up in Ableton Live",
    });
  } catch (error) {
    console.error("Error setting loop time", error);
    res.status(500).send("Error setting loop time");
  }
});

app.post("/set-selected-song-index", async (req, res) => {
  const newIndex = req.body.newIndex;
  try {
    await ableton.start();
    const cuePoint = new CuePoint(ableton, globalMergedCues[newIndex].song[0]);
    await cuePoint.jump();
    res.status(200).json({
      message: "Cue received and processed in Ableton Live",
    });
  } catch (error) {
    console.error("Error processing cue:", error);
    res.status(500).send("Error processing cue");
  }
});

app.post("set-is-looped", async (req, res) => {
  try {
    await ableton.start();
    const currentLoopState = await ableton.song.get("loop");
    await ableton.song.set("loop", !currentLoopState);
    res.status(200).json({
      message: "Loop set up in Ableton Live",
    });
  } catch (error) {
    console.error("Error setting loop", error);
    res.status(500).send("Error setting loop");
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
