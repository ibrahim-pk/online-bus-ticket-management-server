const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingsModel");
const Bus = require("../models/busModel");
const stripe = require("stripe")(process.env.stripe_key);
const { v4: uuidv4 } = require("uuid");
const SSLCommerzPayment = require("sslcommerz");
const axios =require("axios")

// book a seat

// router.post("/book-seat", authMiddleware, async (req, res) => {
//   try {
//     const newBooking = new Booking({
//       ...req.body,
//       user: req.body.userId,
//     });
//     await newBooking.save();
//     const bus = await Bus.findById(req.body.bus);
//     bus.seatsBooked = [...bus.seatsBooked, ...req.body.seats];
//     await bus.save();
//     res.status(200).send({
//       message: "Booking successful",
//       data: newBooking,
//       success: true,
//     });
//   } catch (error) {
//     res.status(500).send({
//       message: "Booking failed",
//       data: error,
//       success: false,
//     });
//   }
// });

// make payment

router.post("/make-payment", authMiddleware, async (req, res) => {
  console.log(req.body);
  const { token, amount, bus, seats } = req.body;
  const trx = uuidv4()
  try {
    const data = {
      total_amount: amount,
      currency: "BDT",
      tran_id: trx,
      success_url: `http://localhost:5000/api/bookings/success?busId=${bus}&seats=${seats}&trx=${trx}`,
      fail_url: `http://localhost:5000/api/bookings/fail?trx=${trx}`,
      cancel_url: `http://localhost:5000/api/bookings/cancel?trx=${trx}`,
      ipn_url: "http://yoursite.com/ipn",
      payment: false,
      shipping_method: "Courier",
      product_name: "Computer.",
      product_category: "Electronic",
      product_profile: "general",
      cus_name: "Customer Name",
      cus_email: "cust@yahoo.com",
      cus_add1: "Dhaka",
      cus_add2: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01711111111",
      cus_fax: "01711111111",
      ship_name: "Customer Name",
      ship_add1: "Dhaka",
      ship_add2: "Dhaka",
      ship_city: "Dhaka",
      ship_state: "Dhaka",
      ship_postcode: 1000,
      ship_country: "Bangladesh",
      multi_card_name: "mastercard",
      value_a: "ref001_A",
      value_b: "ref002_B",
      value_c: "ref003_C",
      value_d: "ref004_D",
    };


    const newBooking = new Booking({
      ...req.body,
      user: req.body.userId,
      transactionId: data.tran_id
    });
    await newBooking.save();


    const sslcommer = new SSLCommerzPayment(
      process.env.SSL_STORE_ID,
      process.env.SSL_SECRET_KEY,
      false
    ); //true for live default false for sandbox
    sslcommer.init(data).then((data) => {
      //process the response that got from sslcommerz
      //https://developer.sslcommerz.com/doc/v4/#returned-parameters
      // console.log(data);
      if (data.GatewayPageURL) {
        res.status(200).send({ paymentUrl: data.GatewayPageURL });
      } else {
        res.status(200).send({
          error: "SSL session was not successful",
        });
      }
    });




  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      success: false,
      error,
    });
  }
});


// router.post("/make-payment", authMiddleware, async (req, res) => {
//   try {
//     const { token, amount } = req.body;
//     const customer = await stripe.customers.create({
//       email: token.email,
//       source: token.id,
//     });
//     const payment = await stripe.charges.create(
//       {
//         amount: parseFloat(amount / 120),
//         currency: "USD",
//         description: "Bus seat booking for Lal Sobuj",
//         customer: customer.id,
//         receipt_email: token.email,
//       },
//       {
//         idempotencyKey: uuidv4(),
//       }
//     );

//     if (payment) {
//       res.status(200).send({
//         message: "Payment successful",
//         data: {
//           transactionId: payment.source.id,
//         },
//         success: true,
//       });
//     } else {
//       res.status(500).send({
//         message: "Payment failed",
//         data: error,
//         success: false,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({
//       message: "Payment failed",
//       data: error,
//       success: false,
//     });
//   }
// });

router.post("/success", async (req, res) => {
  const { busId, seats, trx } = req.query
  console.log("req", req.query)
  const bus = await Bus.findById(busId);
  const seatsList = seats.split(",").map(Number)
  console.log(seatsList)
  bus.seatsBooked = [...bus.seatsBooked, ...seatsList];
  await bus.save();

  await Booking.updateOne(
    { transactionId: trx },
    {
      $set: {
        payment: true,

      },
    }
  );

  res.redirect(`http://localhost:3000/order/success?location=${bus?.to}`);
});



router.get('/location', async (req, res) => {
   
  const {location}=req.query

  const GEMINI_API_KEY = 'AIzaSyDta1iEvZdET-CPfGJ-0sz8Y9inNWEc8V4';
    const UNSPLASH_ACCESS_KEY = 'nYkk7KwMV9JwMtygnjMiSm0NuR9V1O-MH1XGHH8QOak';
 try {
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Give 5 popular tourist places in ${location} in JSON format like [{ "name": "", "description": "" }]`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const text = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ success: false, message: 'Gemini API did not return any content' });
    }

    const places = JSON.parse(text.match(/\[.*\]/s)[0]);

    const withImages = await Promise.all(
      places.map(async (place) => {
        try {
          const imageResponse = await axios.get(`https://api.unsplash.com/search/photos`, {
            params: {
              query: place.name,
              per_page: 1,
            },
            headers: {
              Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
          });

          const imageUrl = imageResponse.data.results?.[0]?.urls?.small || null;
          return { ...place, image: imageUrl };
        } catch (error) {
          return { ...place, image: null };
        }
      })
    );

    res.json({ success: true, data: withImages });
  }catch (error) {
    console.error('Error fetching popular places:', error.message);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});







router.post("/fail", async (req, res) => {
  const { trx } = req.query
  await Booking.deleteOne({ transactionId: trx });
  res.redirect(`http://localhost:3000/`);
});

router.post("/cancel", async (req, res) => {
  const { trx } = req.query
  await Booking.deleteOne({ transactionId: trx });
  res.redirect(`http://localhost:3000/`);
});



// get bookings by user id
router.post("/get-bookings-by-user-id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.body.userId })
      .populate("bus")
      .populate("user");
    res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookings,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Bookings fetch failed",
      data: error,
      success: false,
    });
  }
});

// get all bookings
router.post("/get-all-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("bus").populate("user");
    res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookings,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: "Bookings fetch failed",
      data: error,
      success: false,
    });
  }
});


module.exports = router;
