const router = require("express").Router();
const User = require("../models/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");
const feedbackModel = require("../models/feedbackModel");
const bookingsModel = require("../models/bookingsModel");
const busModel = require("../models/busModel");
const usersModel = require("../models/usersModel");

// register new user

router.post("/register", async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.send({
        message: "User already exists",
        success: false,
        data: null,
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;
    const newUser = new User(req.body);
    await newUser.save();
    res.send({
      message: "User created successfully",
      success: true,
      data: null,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// login user

router.post("/login", async (req, res) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (!userExists) {
      return res.send({
        message: "User does not exist",
        success: false,
        data: null,
      });
    }

    if (userExists.isBlocked) {
      return res.send({
        message: "Your account is blocked , please contact admin",
        success: false,
        data: null,
      });
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      userExists.password
    );

    if (!passwordMatch) {
      return res.send({
        message: "Incorrect password",
        success: false,
        data: null,
      });
    }

    const token = jwt.sign({ userId: userExists._id }, process.env.jwt_secret, {
      expiresIn: "1d",
    });

    res.send({
      message: "User logged in successfully",
      success: true,
      data: token,
      user:userExists
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// get user by id

router.post("/get-user-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    res.send({
      message: "User fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// get all users
router.post("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    res.send({
      message: "Users fetched successfully",
      success: true,
      data: users,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});

// update user

router.post("/update-user-permissions", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body._id, req.body);
    res.send({
      message: "User permissions updated successfully",
      success: true,
      data: null,
    });
  } catch {
    res.send({
      message: error.message,
      success: false,
      data: null,
    });
  }
});



router.put("/edit", async (req, res) => {
  const { _id, name, email, password } = req.body;
  console.log(req.body)

  if (!_id) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const existingUser = await User.findById(_id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found." });
    }

    let updatedFields = {
      name: name || existingUser.name,
      email: email || existingUser.email,
    };

    // Only hash password if it's different
    const isSamePassword = await bcrypt.compare(password, existingUser.password);
    if (!isSamePassword) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    } else {
      updatedFields.password = existingUser.password;
    }

    const updatedUser = await User.findByIdAndUpdate(_id, updatedFields, {
      new: true,
    });

    const { password: _, ...userWithoutPassword } = updatedUser.toObject();

    res.status(200).json({
      message: "Profile updated successfully",
      updatedUser: userWithoutPassword,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error while updating profile." });
  }
});


router.post("/feedback", async (req, res) => {
  //console.log(req.body)
  try {
    const feedback = new feedbackModel(req.body);
    await feedback.save();
    res.status(200).send({ success: true, message: "Feedback submitted successfully" });
  } catch (error) {
    res.status(500).send({ success: false, message: "Something went wrong" });
  }
});


router.get("/feedback", async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? {
          $or: [
            { name: new RegExp(search, "i") },
            { email: new RegExp(search, "i") },
            { message: new RegExp(search, "i") },
          ],
        }
      : {};

    const feedbacks = await feedbackModel.find(query).sort({ createdAt: -1 });
    res.status(200).send({ success: true, data: feedbacks });
  } catch (error) {
    res.status(500).send({ success: false, message: "Error fetching feedbacks" });
  }
});



router.get("/dashboard-summary", async (req, res) => {
  try {
    const [totalBookings, totalBuses, totalUsers, totalEarnings] = await Promise.all([
      bookingsModel.countDocuments(),
      busModel.countDocuments(),
      usersModel.countDocuments(),
      bookingsModel.aggregate([
        { $match: { payment: true } },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount" } } // if stored as string
          }
        }
      ])
    ]);

    res.send({
      success: true,
      data: {
        totalBookings,
        totalBuses,
        totalUsers,
        totalEarnings: totalEarnings[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).send({ success: false, message: "Error fetching dashboard summary", error });
  }
});


module.exports = router;
