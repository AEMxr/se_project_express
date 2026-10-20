const router = require("express").Router();
const auth = require("../middlewares/auth");
const { getCurrentUser, updateCurrentUser } = require("../controllers/users");
const { validateProfile } = require("../middlewares/validation");

router.get("/me", auth, getCurrentUser);
router.patch("/me", auth, validateProfile, updateCurrentUser);

module.exports = router;
