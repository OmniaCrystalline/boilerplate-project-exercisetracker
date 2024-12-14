/** @format */

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO);
  console.log("connected");
}

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
  },
  {
    versionKey: false,
  }
);

const exerciseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Format the date
const dateFromDb = (inputDate) => {
  const weekday = inputDate.toLocaleDateString("en-US", { weekday: "short" });
  const month = inputDate.toLocaleDateString("en-US", { month: "short" });
  const day = inputDate.getDate();
  const year = inputDate.getFullYear();
  return `${weekday} ${month} ${day} ${year}`;
};

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  return res.json(user);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { duration, description, date } = req.body;
  const { _id } = req.params;
  const user = await User.findById(_id);

  date = new Date(date).toDateString() === "Invalid Date"
    ? new Date().toDateString()
    : new Date(date).toDateString();
  
  if (!Number(duration)) {
    res.json({
      error: "duration must be a number",
    });
    return;
  }
  const exercise = {
    duration: Number(duration),
    description,
    date,
    username: user.username,
  };

  const result = await Exercise.create(exercise)
  if (!exercise) res.json({ error: 'server error' });
  else return res.json({
    _id: user._id,
    username: user.username,
    duration: result.duration,
    description: result.description,
    date: result.date
  });
})

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { limit, from, to } = req.query;
  const user = await User.findById(_id);

  let query = { username: user.username };

  const exercises = await Exercise.find(query)
    .select("-username")
    .limit(Number(limit));

  const log = exercises.map((e) => {
    const x = {
      date: dateFromDb(new Date(e.date)),
      duration: e.duration,
      description: e.description,
    };

    return x;
  });
  return res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
