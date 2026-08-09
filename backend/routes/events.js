import express from 'express';

const router = express.Router();
let clients = [];

router.get('/', (req, res) => {
  // Required headers for SSE (Server Sent Events)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Unique ID for the client
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial connected payload safely
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'NOVA Proactive Tunnel Established' })}\n\n`);

  // Remove client on disconnect
  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Function to push events to all connected UI clients
export const triggerProactiveEvent = (type, payload) => {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
  });
};

export default router;
