const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://musiqueplayer.netlify.app/", // Update with your React app's origin
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // Store audioUrl and isAudioPlaying for each room
const messages = {}; // Store chat messages for each room

io.on("connection", (socket) => {
  console.log("This ran-->")

  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);

    // When a new user joins a room, send them the current audioUrl if available
    if (rooms[data]) {
      const { audioUrl, isAudioPlaying } = rooms[data];
      socket.emit("receive_audio", { audioUrl, isAudioPlaying });
    }

    // Send chat history to the new user if available
    if (messages[data]) {
      socket.emit("receive_messages", messages[data]);
    }
  });

  socket.on('receive_current_track_img', (data) => {
    // Broadcast the image URL to all clients in the same room
    io.to(data.room).emit('receive_current_track_img', {
      currentSelectedTrackImg: data.currentSelectedTrackImg,
    });
  });

  socket.on("send_audio", (data) => {
    const { audioUrl, room, isAudioPlaying } = data;
    rooms[room] = { audioUrl, isAudioPlaying };
    socket.to(room).emit("receive_audio", { audioUrl, isAudioPlaying });
  });

  // Listen for play/pause state changes from clients and broadcast to the room
  socket.on("toggle_play_pause", (data) => {
    const { room, isAudioPlaying } = data;
    rooms[room] = { ...rooms[room], isAudioPlaying };
    socket.to(room).emit("toggle_play_pause", { isAudioPlaying });
  });

  // Broadcast to all users in a room when a new user joins
  socket.on("user_joined", (room) => {
    socket.to(room).emit("user_joined");
  });

  // Handle chat messages
  socket.on("send_message", (data) => {
    const { message, room, username } = data;
    if (!messages[room]) {
      messages[room] = [];
    }
    messages[room].push({ username, text: message });
    socket.to(room).emit("receive_message", { username, text: message });
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});
