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
    const favoritesCollection = database.collection("favorites");
    const flaggedCollection = database.collection("flagged");

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

    app.put("/api/lessons/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid lesson ID format" });
        }

        const filter = { _id: new ObjectId(id) };

        delete updatedData._id;

        const updateDoc = {
          $set: updatedData,
        };

        const result = await lessonsCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Lesson not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).send({ error: "Failed to update lesson" });
      }
    });

    app.delete("/api/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.deleteOne(query);
      res.send(result);
    });

    // Favorites

    app.post("/api/favorites", async (req, res) => {
      try {
        const favoriteLesson = req.body;

        if (favoriteLesson._id) {
          favoriteLesson.lessonId = favoriteLesson._id;
          delete favoriteLesson._id;
        }

        const result = await favoritesCollection.insertOne(favoriteLesson);
        res.send(result);
      } catch (error) {
        console.error("Error saving favorite:", error);
        res.status(500).send({ error: "Failed to save favorite" });
      }
    });

    app.get("/api/favorites", async (req, res) => {
      const result = await favoritesCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/favorites/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favoritesCollection.findOne(query);
      res.send(result);
    });

    app.delete("/api/favorites/:id", async (req, res) => {
      try {
        const id = req.params.id;

        let query;
        if (ObjectId.isValid(id)) {
          query = {
            $or: [{ _id: id }, { _id: new ObjectId(id) }],
          };
        } else {
          query = { _id: id };
        }

        const result = await favoritesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting favorite:", error);
        res.status(500).send({ error: "Failed to delete" });
      }
    });

    // Users

    app.get("/api/user", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Flagged Content
    app.get("/api/flagged", async (req, res) => {
      const result = await flaggedCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/user", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();

        const lessonCounts = await lessonsCollection
          .aggregate([{ $group: { _id: "$creatorEmail", count: { $sum: 1 } } }])
          .toArray();

        const countsMap = {};
        lessonCounts.forEach((lc) => {
          countsMap[lc._id] = lc.count;
        });

        const usersWithCounts = users.map((user) => ({
          ...user,
          totalLessons: countsMap[user.email] || 0,
        }));

        res.send(usersWithCounts);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.patch("/api/user/:id/role", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        if (!ObjectId.isValid(id))
          return res.status(400).send({ error: "Invalid ID format" });

        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { role: role },
        };

        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).send({ error: "Failed to update role" });
      }
    });

    app.delete("/api/user/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id))
          return res.status(400).send({ error: "Invalid ID format" });

        const query = { _id: new ObjectId(id) };
        const result = await usersCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    app.patch("/api/user/:id/profile", async (req, res) => {
      try {
        const id = req.params.id;
        const { name, image } = req.body;

        let query;
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { _id: id }, { id: id }] };
        } else {
          query = { $or: [{ _id: id }, { id: id }] };
        }

        const updateDoc = {
          $set: {
            name: name,
            image: image,
            updatedAt: new Date(),
          },
        };

        const result = await usersCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "User not found in database" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send({ error: "Failed to update profile" });
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
