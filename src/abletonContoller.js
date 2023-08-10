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

module.exports = fetchCues;
