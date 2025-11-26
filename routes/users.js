const router = require("express").Router();
const { getCurrentUser, updateCurrentUser } = require("../controllers/users");

// app.post('/signin', login);
// app.post('/signup', createUser);

router.get("/me", getCurrentUser);
router.patch("/me", updateCurrentUser);

module.exports = router;
