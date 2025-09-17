const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); //

// Middleware
app.use(cors());
app.use(express.json());

//Mongo Code //
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vhdpi0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    //DB Collections //
    const db = client.db("parcelDB");
    const parcelCollection = db.collection("parcel");

    //  GET all parcels
    app.get("/parcels", async (req, res) => {
      const parcels = await parcelCollection.find().toArray();
      res.send(parcels);
    });

    // GET all parcels OR filter by createdBy email
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email; // optional query parameter
        let query = {};

        if (email) {
          query = { createdBy: email }; // filter by email if provided
        }

        const parcels = await parcelCollection
          .find(query)
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.json({
          success: true,
          count: parcels.length,
          data: parcels,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    //  POST API -> Add new parcel
    app.post("/parcels", async (req, res) => {
      try {
        const parcelData = req.body;

        // Add default fields
        parcelData.status = "Pending";
        parcelData.trackingId = new ObjectId().toString(); // unique tracking id
        parcelData.createdAt = new Date();

        const result = await parcelCollection.insertOne(parcelData); // ✅ fixed collection name
        res.status(201).json({
          success: true,
          message: "Parcel created successfully!",
          data: { ...parcelData, _id: result.insertedId },
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Connect the client to the server
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB Connected Successfully!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// sample route
app.get("/", (req, res) => {
  res.send("TrackMate server is tracking....");
});

// server running
app.listen(port, () => {
  console.log(`🚀 TrackMate Server running on PORT: ${port}`);
});
