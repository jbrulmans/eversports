import { app } from './app';

const port = 3099;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${String(port)}`);
});
