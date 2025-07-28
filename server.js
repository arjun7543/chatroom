// Node.js + Express + ws + mongoose backend for ephemeral chatroom
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');

// MongoDB setup
mongoose.connect('mongodb+srv://rathorearjun3114:<db_password>@chatroomcluster.bwkar7v.mongodb.net/?retryWrites=true&w=majority&appName=chatroomCluster', { useNewUrlParser: true, useUnifiedTopology: true });

const RoomSchema = new mongoose.Schema({
  code: String,
  users: [String],
  messages: [{ user: String, text: String }]
});
const Room = mongoose.model('Room', RoomSchema);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {}; // { code: [ws, ...] }

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentUser = null;

  ws.on('message', async (msg) => {
    const data = JSON.parse(msg);

    // Create room
    if (data.type === 'create') {
      const code = data.code;
      currentRoom = code;
      currentUser = data.user;
      rooms[code] = rooms[code] || [];
      rooms[code].push(ws);
      await Room.create({ code, users: [currentUser], messages: [] });
      ws.send(JSON.stringify({ type: 'created', code }));
    }

    // Join room
    if (data.type === 'join') {
      const code = data.code;
      currentRoom = code;
      currentUser = data.user;
      rooms[code] = rooms[code] || [];
      rooms[code].push(ws);
      const room = await Room.findOne({ code });
      if (room && room.users.length < 10) {
        room.users.push(currentUser);
        await room.save();
        ws.send(JSON.stringify({ type: 'joined', code, users: room.users, messages: room.messages }));
        // Notify others
        rooms[code].forEach(client => {
          if (client !== ws) client.send(JSON.stringify({ type: 'user_joined', user: currentUser }));
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Room full or not found.' }));
      }
    }

    // Send message
    if (data.type === 'message') {
      const room = await Room.findOne({ code: currentRoom });
      if (room) {
        room.messages.push({ user: currentUser, text: data.text });
        await room.save();
        rooms[currentRoom].forEach(client => {
          client.send(JSON.stringify({ type: 'message', user: currentUser, text: data.text }));
        });
      }
    }

    // Leave room
    if (data.type === 'leave') {
      const room = await Room.findOne({ code: currentRoom });
      if (room) {
        room.users = room.users.filter(u => u !== currentUser);
        await room.save();
        rooms[currentRoom] = rooms[currentRoom].filter(client => client !== ws);
        rooms[currentRoom].forEach(client => {
          client.send(JSON.stringify({ type: 'user_left', user: currentUser }));
        });
        if (room.users.length === 0) {
          await Room.deleteOne({ code: currentRoom }); // Ephemeral deletion
          delete rooms[currentRoom];
        }
      }
      ws.close();
    }
  });

  ws.on('close', async () => {
    if (currentRoom && currentUser) {
      const room = await Room.findOne({ code: currentRoom });
      if (room) {
        room.users = room.users.filter(u => u !== currentUser);
        await room.save();
        rooms[currentRoom] = rooms[currentRoom].filter(client => client !== ws);
        rooms[currentRoom].forEach(client => {
          client.send(JSON.stringify({ type: 'user_left', user: currentUser }));
        });
        if (room.users.length === 0) {
          await Room.deleteOne({ code: currentRoom });
          delete rooms[currentRoom];
        }
      }
    }
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
