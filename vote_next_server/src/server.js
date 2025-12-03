const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
  console.log(`Vote Next Server running on port ${PORT}`);
});
