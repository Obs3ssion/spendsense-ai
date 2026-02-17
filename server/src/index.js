require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`SpendSense AI server running at http://localhost:${PORT}`);
});
