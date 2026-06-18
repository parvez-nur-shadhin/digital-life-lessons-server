require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Is Running Succesfully");
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("digital_life_lessons");

    const paymentCollection = database.collection("payments");
    const usersCollection = database.collection("user");

    app.post("/api/payments", async (req, res) => {
      const payment = req.body;
      const newPayment = {
        ...payment,
        createdAt: new Date(),
      };
      const result = await paymentCollection.insertOne(newPayment);

      // update the user plan information
      const filter = { email: payment.email };
      // update the value of the 'quantity' field to 5
      const updateDocument = {
        $set: {
          plan: "premium",
        },
      };

      const updateResult = await usersCollection.updateOne(
        filter,
        updateDocument,
      );
      res.send(updateResult);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
