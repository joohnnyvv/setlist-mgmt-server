const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const { Ableton } = require("ableton-js");
const { CuePoint } = require("ableton-js/ns/cue-point");

const ableton = new Ableton();

const fetchCues = async () => {
  try {
    await ableton.start();

    const cues = await ableton.song.get("cue_points");

    return cues.map((c) => c.raw);
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
};

app.get("/cues", async (req, res) => {
  try {
    const cues = await fetchCues();

    console.log("Fetched cues:", cues);

    res.setHeader("Content-Security-Policy", "script-src-attr 'self'");
    res.json(cues);
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

app.post("/send-cue", async (req, res) => {
  const cueData = req.body;
  console.log("Received cue data:", cueData);

  try {
    await ableton.start();
    const cuePoint = new CuePoint(ableton, cueData);
    await cuePoint.jump();
    res.status(200).send("Cue received and processed in Ableton Live");
  } catch (error) {
    console.error("Error processing cue:", error);
    res.status(500).send("Error processing cue");
  }
});

app.get("/get-tempo", async (req, res) => {
  try {
    await ableton.start();
    console.log("Ableton connection established");

    const songTempo = await ableton.song.get("tempo");
    console.log("Song tempo retrieved:", songTempo);

    res.json({ songTempo });
    console.log("Response sent");
  } catch (error) {
    console.error("Error when fetching song tempo", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/is-playing", async (req, res) => {
  try {
    await ableton.start();
    const isPlaying = await ableton.song.get("is_playing");
    res.json({ isPlaying });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});
app.get("/current-time", async (req, res) => {
  try {
    await ableton.start();
    const currentTime = await ableton.song.get("current_song_time");
    res.json({ currentTime });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
