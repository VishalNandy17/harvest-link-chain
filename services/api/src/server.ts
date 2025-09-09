import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import path from 'path';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use('/public/qr', express.static(path.join(__dirname, '../public/qr')));

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
