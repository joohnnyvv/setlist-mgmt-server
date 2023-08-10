const express = require("express");
const app = express();
const { Ableton } = require("ableton-js");

const ableton = new Ableton();

const fetchCues = async () => {
    try {
        await ableton.start();

        const cues = await ableton.song.get("cue_points");

        return cues.map(c => c.raw);
    } catch (error) {
        console.error("An error occurred:", error);
        throw error;
    }
};

app.get("/cues", async (req, res) => {
    try {
        const cues = await fetchCues();

        console.log("Fetched cues:", cues);

        res.json(cues);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
