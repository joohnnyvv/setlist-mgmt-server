# Setlist Management Server

This is the server component of the Setlist Management app, responsible for handling API requests and managing the backend functionality.

## References

For the client-side part of the Setlist Management app, refer to the [Client Repository](https://github.com/joohnnyvv/Ableton-Live-Setlist-Manager).

## Installation

Follow these steps to set up the server on your local machine:

1. **Clone the Repository:**
   
        git clone https://github.com/joohnnyvv/setlist-mgmt-server.git


2. **Install Dependencies:**

         npm install

3. **Run the Server**

         node ./src/server.js

## API Routes

The server provides the following API routes:

- `GET /cues`: Retrieve the list of cues (markers) for the setlist.
- `GET /is-playing`: Check if the music is currently playing.
- `GET /current-time`: Get the current playback time.
- `GET /start-playing`: Start playing the music.
- `GET /stop-playing`: Stop playing the music.
- `POST /send-cue`: Send a cue data to control playback.

## Contributing

Feel free to contribute to this project by submitting issues or pull requests. For major changes, please open an issue first to discuss what you would like to change.
