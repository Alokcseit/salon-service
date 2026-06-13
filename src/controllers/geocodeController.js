import axios from "axios";

export const geocodeAddress = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q, format: "json", limit: 1 },
      headers: {
        "Accept-Language": "en",
        "User-Agent": "SilverscisorSalonApp/1.0",
      },
    });

    res.json(response.data);
  } catch (error) {
    next(error);
  }
};
