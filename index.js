const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vhdpi0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("parcelDB");
    const parcelCollection = db.collection("parcel");
    const paymentCollection = db.collection("payments");

    //GET all parcels (optionally filter by email)
    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email;
        let query = {};
        if (email) query = { createdBy: email };

        const parcels = await parcelCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.json(parcels); // return raw array
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //  GET single parcel by _id
    app.get("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid parcel ID" });
        }

        const parcel = await parcelCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!parcel) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        res.json(parcel); // return raw parcel object
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //  POST new parcel
    app.post("/parcels", async (req, res) => {
      try {
        const parcelData = req.body;
        parcelData.status = "Pending";
        parcelData.trackingId = new ObjectId().toString();
        parcelData.createdAt = new Date();

        const result = await parcelCollection.insertOne(parcelData);
        res.status(201).json({ ...parcelData, _id: result.insertedId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //  DELETE parcel by ID
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid parcel ID" });
        }

        const result = await parcelCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        res.json({ message: "Parcel deleted successfully" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //  Confirm payment & update parcel
    app.post("/confirm-payment", async (req, res) => {
      try {
        const { parcelId, paymentIntentId, amount, createdBy } = req.body;

        if (!ObjectId.isValid(parcelId)) {
          return res.status(400).json({ message: "Invalid Parcel ID" });
        }

        const updateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          { $set: { status: "Paid", paymentIntentId } }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        const paymentData = {
          parcelId: new ObjectId(parcelId),
          createdBy,
          amount,
          paymentIntentId,
          status: "Succeeded",
          createdAt: new Date(),
          paid_at: new Date(),
        };

        const insertResult = await paymentCollection.insertOne(paymentData);

        res.json({ ...paymentData, _id: insertResult.insertedId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //  GET payment history (optionally filter by email)
    app.get("/payments", async (req, res) => {
      try {
        const email = req.query.email;
        let query = {};
        if (email) query = { createdBy: email };

        const payments = await paymentCollection
          .find(query)
          .sort({ paid_at: -1 })
          .toArray();

        res.json(payments); // return raw array
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });



   // POST /tracking -> add a new tracking update
app.post("/tracking", async (req, res) => {
  try {
    const { parcelId, trackingId, status, location } = req.body;

    if (!parcelId || !trackingId || !status) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const trackingData = {
      parcelId: new ObjectId(parcelId),
      trackingId,
      status,
      location: location || "Unknown",
      updatedAt: new Date(),
    };

    const result = await trackingCollection.insertOne(trackingData);

    res.status(201).json({
      success: true,
      message: "Tracking update added",
      data: { ...trackingData, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


    //  Create Stripe Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { amountInCents } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Connect MongoDB
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB Connected Successfully!");
  } finally {
    // leave client open
  }
}
run().catch(console.dir);

// Root Route
app.get("/", (req, res) => {
  res.send("TrackMate server is tracking....");
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 TrackMate Server running on PORT: ${port}`);
});
