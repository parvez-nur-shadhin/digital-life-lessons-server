require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) =>{
    res.send("Server Is Running Succesfully")
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
