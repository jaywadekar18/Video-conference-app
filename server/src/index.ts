import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins a room
  socket.on('join-room', (roomId: string, userId: string) => {
    socket.join(roomId);
    console.log(`User ${userId} (socket ${socket.id}) joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // Relay offer
  socket.on('offer', (payload: { target: string, caller: string, sdp: any }) => {
    io.to(payload.target).emit('offer', payload);
  });

  // Relay answer
  socket.on('answer', (payload: { target: string, caller: string, sdp: any }) => {
    io.to(payload.target).emit('answer', payload);
  });

  // Relay ICE candidate
  socket.on('ice-candidate', (payload: { target: string, candidate: any }) => {
    io.to(payload.target).emit('ice-candidate', payload);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
