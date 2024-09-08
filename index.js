const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post(
  "/api/generate-test-instructions",
  upload.array("images"),
  async (req, res) => {
    try {
      const context = req.body.context;
      const images = req.files;

      if (!images || images.length === 0) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      // Process images and context here
      const captions = await Promise.all(
        images.map(async (image) => {
          const imageData = fs.readFileSync(image.path);
          const caption = await generateImageCaption(imageData);

          return caption;
        })
      );
      console.log("captions:", captions);
      const testInstructions = await generateTestInstructions(
        captions,
        context
      );

      res.json({ testInstructions });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Functions for generating image captions and test instructions
const generateImageCaption = async (imageData) => {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large",
      imageData,
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
      }
    );
    return response.data[0].generated_text;
  } catch (error) {
    console.error(
      "Error generating image caption:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to generate image caption");
  }
};
const generateTestInstructions = async (captions, context = "") => {
  // Multi-shot prompt with detailed examples based on Red Bus features
  const multiShotExamples = `
Example 1:
Feature: Route Selection (Bangalore to Chennai)
Test Case 1:
  - Pre-condition: User is on the travel booking home screen.
  - Steps:
    1. Open the app.
    2. Enter "Bangalore" in the "From" field.
    3. Enter "Chennai" in the "To" field.
    4. Select the travel date (e.g., 10th September).
    5. Click the "Search" button.
  - Expected: The app should display available bus/train/flight options from Bangalore to Chennai on the selected date.

Example 2:
Feature: Bus Selection for Bangalore to Chennai Route
Test Case 2:
  - Pre-condition: User has searched for buses from Bangalore to Chennai.
  - Steps:
    1. From the search results, select a bus operator.
    2. Choose a bus based on timing or fare.
    3. Select the desired seat on the seat map.
    4. Click "Proceed" to continue with the booking.
  - Expected: The app should display selected bus details, including timing, fare, and seat number, and allow the user to proceed with the booking.

Example 3:
Feature: Booking Confirmation for Bangalore to Chennai Route
Test Case 3:
  - Pre-condition: User has selected a bus and seat for the Bangalore to Chennai route.
  - Steps:
    1. Confirm the selected bus and seat details.
    2. Enter passenger details (e.g., name, age, etc.).
    3. Choose a payment method and complete the transaction.
    4. Click "Confirm Booking".
  - Expected: The app should confirm the booking and show a booking reference number along with travel details.

Example 4:
Feature: Bus Availability Notification for Bangalore to Chennai Route
Test Case 4:
  - Pre-condition: User has searched for buses from Bangalore to Chennai, and no buses are available.
  - Steps:
    1. Search for buses for the selected date (e.g., 10th September).
  - Expected: The app should display a message notifying the user that no buses are available for the selected route and offer alternative dates or routes.

`;
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/openai-community/gpt2",
    { inputs: multiShotExamples },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
    }
  );

  return response.data[0].generated_text;
};

// Example 1:
// Feature: Source, Destination, Date Selection
// Test Case 1:
//   - Pre-condition: User is on the home screen.
//   - Steps:
//     1. Open the app.
//     2. Enter source in "From".
//     3. Enter destination in "To".
//     4. Select travel date.
//     5. Confirm selections.
//   - Expected: The app shows selected source, destination, and date.

// Example 2:
// Feature: Bus Selection
// Test Case 2:
//   - Pre-condition: User has selected source, destination, and date.
//   - Steps:
//     1. Navigate to the bus selection screen.
//     2. Select a bus.
//   - Expected: The app displays available buses and allows bus selection.
// Provide the test cases below:
