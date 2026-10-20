const router = require("express").Router();
const { getCurrentUser, updateCurrentUser } = require("../controllers/users");
const { validateProfile } = require("../middlewares/validation");

router.get("/me", getCurrentUser);
router.patch("/me", validateProfile, updateCurrentUser);

module.exports = router;
