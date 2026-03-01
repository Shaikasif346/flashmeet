const rooms = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room
    socket.on('join_room', ({ roomId, userId, username }) => {
      socket.join(roomId);
      if (!rooms[roomId]) rooms[roomId] = [];

      const user = { socketId: socket.id, userId, username };
      rooms[roomId] = rooms[roomId].filter(u => u.userId !== userId);
      rooms[roomId].push(user);

      // Tell existing users about new user
      socket.to(roomId).emit('user_joined', { socketId: socket.id, userId, username });

      // Send existing users to new user
      const existingUsers = rooms[roomId].filter(u => u.socketId !== socket.id);
      socket.emit('existing_users', existingUsers);

      // Update room participants
      io.to(roomId).emit('room_users', rooms[roomId]);

      socket.roomId = roomId;
      socket.userId = userId;
      socket.username = username;
    });

    // WebRTC Signaling
    socket.on('offer', ({ offer, to }) => {
      io.to(to).emit('offer', { offer, from: socket.id, username: socket.username });
    });

    socket.on('answer', ({ answer, to }) => {
      io.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice_candidate', ({ candidate, to }) => {
      io.to(to).emit('ice_candidate', { candidate, from: socket.id });
    });

    // Chat during call
    socket.on('chat_message', ({ roomId, message, username }) => {
      io.to(roomId).emit('chat_message', { message, username, time: new Date().toLocaleTimeString() });
    });

    // Media state changes
    socket.on('media_state', ({ roomId, video, audio }) => {
      socket.to(roomId).emit('media_state', { socketId: socket.id, video, audio });
    });

    // Screen sharing
    socket.on('screen_share_started', ({ roomId }) => {
      socket.to(roomId).emit('screen_share_started', { socketId: socket.id, username: socket.username });
    });

    socket.on('screen_share_stopped', ({ roomId }) => {
      socket.to(roomId).emit('screen_share_stopped', { socketId: socket.id });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const roomId = socket.roomId;
      if (roomId && rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
        io.to(roomId).emit('user_left', { socketId: socket.id, username: socket.username });
        io.to(roomId).emit('room_users', rooms[roomId]);
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
