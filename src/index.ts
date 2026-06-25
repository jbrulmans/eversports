import { app } from './app';

process.env.TZ = 'UTC';

const port = 3099;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${String(port)}`);
});
