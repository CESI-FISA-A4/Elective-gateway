require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');

const { applyServerConfig } = require('./config');

const app = express();

/** -------------------------------------------Main middlewares----------------------------------------- */
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());
/**----------------------------------------------------------------------------------------------------- */

applyServerConfig(app);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST;

app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});