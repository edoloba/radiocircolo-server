const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs").promises;
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5002;

// Define the origins you want to allow
const allowOrigins = ["https://radiocircolo.onrender.com"];

app.use(express.json());

// Use cors middleware with allowOrigins option
app.use(cors({
  origin: allowOrigins
}));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../radiocircolo-client/build")));

// Parse JSON bodies
app.use(bodyParser.json());

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

const podcastSchema = new mongoose.Schema({
  slug: String,
  name: String,
  description: String,
  members: Array,
  linkName: Array,
  link: Array,
  trackList: Array
});


// Define the Podcast model and specify the collection name
const Podcast = mongoose.model('Podcast', podcastSchema, "podcasts");

// Define API endpoint to fetch podcasts data
// app.get("/", async (req, res) => {
//   try {
//     // Fetch podcasts data from Mixcloud API
//     const username = process.env.MIXCLOUD_USERNAME;
//     const clientID = process.env.MIXCLOUD_CLIENT_ID;
//     const mixcloudResponse = await axios.get(
//       `https://api.mixcloud.com/${username}/cloudcasts/?limit=100&client_id=${clientID}`
//     );


//     // Extract relevant data from Mixcloud response
//     const mixcloudPodcasts = mixcloudResponse.data.data.map(
//       (mixcloudPodcast) => ({
//         name: mixcloudPodcast.name,
//         picture: {
//           normal: mixcloudPodcast.pictures["1024wx1024h"],
//           extra_large: mixcloudPodcast.pictures.extra_large,
//         },
//         audio: mixcloudPodcast.url,
//         id: mixcloudPodcast.key,
//         slug: mixcloudPodcast.slug,
//       })
//       );
//       res.json(mixcloudPodcasts);
//   } catch (error) {
//     console.error("Error fetching podcasts:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.get("/", async (req, res) => {
  try {
    // Fetch podcasts data from Mixcloud API
    const username = process.env.MIXCLOUD_USERNAME;
    const clientID = process.env.MIXCLOUD_CLIENT_ID;
    const mixcloudResponse = await axios.get(
      `https://api.mixcloud.com/${username}/cloudcasts/?limit=100&client_id=${clientID}`
    );

    // Extract relevant data from Mixcloud response
    const mixcloudPodcasts = mixcloudResponse.data.data.map(
      (mixcloudPodcast) => ({
        name: mixcloudPodcast.name,
        picture: {
          normal: mixcloudPodcast.pictures["1024wx1024h"],
          extra_large: mixcloudPodcast.pictures.extra_large,
        },
        audio: mixcloudPodcast.url,
        id: mixcloudPodcast.key,
        slug: mixcloudPodcast.slug,
      })
    );

    // Fetch additional data from MongoDB
    const mongoPodcasts = await Podcast.find({}); // Fetch all documents from MongoDB

    // Combine data from Mixcloud API and MongoDB
    const combinedPodcasts = mixcloudPodcasts.map((mixcloudPodcast) => {
      const mongoPodcast = mongoPodcasts.find(
        (mongoPodcast) => mongoPodcast.slug === mixcloudPodcast.slug
      );
      return {
        ...mixcloudPodcast,
        ...(mongoPodcast && { ...mongoPodcast._doc }),
      };
    });

    res.json(combinedPodcasts);
  } catch (error) {
    console.error("Error fetching podcasts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// const Podcast = mongoose.model('Podcast', podcastSchema);

app.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("slug", slug)
    const username = process.env.MIXCLOUD_USERNAME;
    const clientID = process.env.MIXCLOUD_CLIENT_ID;
    
    // Fetch podcast data from Mixcloud API
    const mixcloudResponse = await axios.get(`https://api.mixcloud.com/${username}/cloudcasts/?limit=100&client_id=${clientID}`);
    const mixcloudPodcast = mixcloudResponse.data.data.find(podcast => podcast.slug === slug);
    
    // Fetch additional data from MongoDB
    const mongoPodcast = await Podcast.findOne({ slug });
    
    if (!mixcloudPodcast) {
      return res.status(404).json({ error: "Podcast not found" });
    }
    
    // Combine data from Mixcloud API and MongoDB
    const combinedPodcast = {
      name: mixcloudPodcast.name,
      picture: {
        normal: mixcloudPodcast.pictures["1024x1024"],
        extra_large: mixcloudPodcast.pictures.extra_large
      },
      audio: mixcloudPodcast.url,
      ...mongoPodcast._doc
    }
    console.log("combine", combinedPodcast)
    res.json(combinedPodcast);
  } catch (error) {
    console.error("Error fetching podcast details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// console.log("Current working directory:", process.cwd());

// All other routes should serve the React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

