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
  Feature: Source, Destination, and Date Selection
  Test Case 1:
    - Pre-conditions: The user is on the home screen of the Red Bus mobile app.
    - Step-by-step instructions:
      1. Open the Red Bus app on your mobile device.
      2. On the home screen, tap on the "From" field and enter the source location.
      3. Tap on the "To" field and enter the destination location.
      4. Tap on the "Date" field and select the travel date.
      5. Confirm the source, destination, and date selections.
    - Expected result: The app should correctly display the selected source, destination, and date, and allow the user to proceed to the bus selection screen.

  Example 2:
  Feature: Bus Selection
  Test Case 2:
    - Pre-conditions: The user has selected source, destination, and travel date.
    - Step-by-step instructions:
      1. After selecting the source, destination, and date, the user is directed to the bus selection screen.
      2. Scroll through the list of available buses.
      3. Select a bus by tapping on the bus name or details.
    - Expected result: The app should display a list of available buses for the selected route and allow the user to view details and select a specific bus.

  Example 3:
  Feature: Seat Selection
  Test Case 3:
    - Pre-conditions: The user has selected a bus from the available list.
    - Step-by-step instructions:
      1. After selecting a bus, navigate to the seat selection screen.
      2. View the seat map and select an available seat by tapping on it.
      3. Confirm the seat selection.
    - Expected result: The app should allow the user to select an available seat and confirm the selection, with the selected seat visually highlighted.

  Example 4:
  Feature: Pick-up and Drop-off Point Selection
  Test Case 4:
    - Pre-conditions: The user has selected a seat on the bus.
    - Step-by-step instructions:
      1. After selecting a seat, proceed to the pick-up and drop-off point selection screen.
      2. Choose a pick-up point from the available options.
      3. Choose a drop-off point from the available options.
      4. Confirm the pick-up and drop-off points.
    - Expected result: The app should allow the user to select valid pick-up and drop-off points and confirm the selection.

  Example 5:
  Feature: Offers and Promotions
  Test Case 5:
    - Pre-conditions: The user has navigated to the payment screen.
    - Step-by-step instructions:
      1. After selecting the pick-up and drop-off points, proceed to the payment screen.
      2. Look for available offers or discounts on the payment screen.
      3. Apply any valid offers by entering the promo code or selecting an available offer.
    - Expected result: The app should display applicable offers and allow the user to apply them successfully.

  Example 6:
  Feature: Filters for Bus Selection
  Test Case 6:
    - Pre-conditions: The user is on the bus selection screen.
    - Step-by-step instructions:
      1. On the bus selection screen, locate the filter options (e.g., time, price, amenities).
      2. Apply a filter (e.g., filter buses by time or price).
      3. Confirm that the list of buses updates based on the selected filter.
    - Expected result: The app should update the list of available buses according to the selected filters.

  Example 7:
  Feature: Bus Information
  Test Case 7:
    - Pre-conditions: The user is viewing a specific bus on the bus selection screen.
    - Step-by-step instructions:
      1. Select a bus from the available list.
      2. Tap on the "Bus Information" section to view details about the bus.
      3. Check for bus amenities, photos, and user reviews.
    - Expected result: The app should display detailed information about the selected bus, including amenities, photos, and user reviews.
  
  Captions: ${captions.join("\n")}
  Context: ${context || "No additional context."}

  Provide the test cases below:`;
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
