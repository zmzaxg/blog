import { createServer } from 'vite';

const server = await createServer({
  server: { port: 5173 },
});
await server.listen();
server.printUrls();
