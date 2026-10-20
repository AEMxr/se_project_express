const router = require("express").Router();
const auth = require("../middlewares/auth");
const {
  createItem,
  deleteItem,
  likeItem,
  dislikeItem,
} = require("../controllers/clothingItems");
const { validateItem, validateItemId } = require("../middlewares/validation");

router.post("/", auth, validateItem, createItem);
router.delete("/:itemId", auth, validateItemId, deleteItem);
router.put("/:itemId/likes", auth, validateItemId, likeItem);
router.delete("/:itemId/likes", auth, validateItemId, dislikeItem);

module.exports = router;
