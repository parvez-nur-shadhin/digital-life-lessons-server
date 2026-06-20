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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("digital_life_lessons");

    const paymentCollection = database.collection("payments");
    const usersCollection = database.collection("user");
    const lessonsCollection = database.collection("lessons");

    // Payment

    app.post("/api/payments", async (req, res) => {
      const payment = req.body;
      const newPayment = {
        ...payment,
        createdAt: new Date(),
      };
      const result = await paymentCollection.insertOne(newPayment);

      const filter = { email: payment.email };

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

    app.post("/api/lessons", async (req, res) => {
      const lessonInformation = req.body;
      const newLessonInformation = {
        ...lessonInformation,
        createdAt: new Date(),
        likes: [],
        savesCount: 0,
      };
      const result = await lessonsCollection.insertOne(newLessonInformation);
      res.send(result);
    });
    app.get("/api/lessons", async (req, res) => {
      const result = await lessonsCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/lessons/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid lesson ID format" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await lessonsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ error: "Lesson not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error getting lesson by ID:", error);
        res.status(500).send({ error: "Failed to fetch lesson" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
