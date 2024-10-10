import 'reflect-metadata';

import express from 'express';
import { createServer } from 'http';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const startServer = async () => {
  app.prepare().then(() => {
    const server = express();

    server.use(express.json());

    server.get('/custom-route', (req, res) => {
      res.send('This is a custom route!');
    });

    server.all('*', (req, res) => {
      return handle(req, res);
    });

    const httpServer = createServer(server);
    httpServer.listen({
      host: 'localhost',
      port: 80,
      exclusive: true,
    });
  });
};

startServer().catch((error) => {
  console.error('Error starting server:', error);
});
