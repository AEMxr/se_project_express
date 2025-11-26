const ClothingItem = require("../models/clothingItem");
const {
  BAD_REQUEST,
  FORBIDDEN,
  handleMongooseError,
  created,
} = require("../utils/errors");

module.exports.likeItem = (req, res) => {
  if (!req.user || !req.user._id) {
    console.error({
      msg: "like_missing_user",
      userId: req.user?._id,
      itemId: req.params.itemId,
      ts: new Date().toISOString(),
    });
    return res.status(BAD_REQUEST).send({ message: "Invalid data" });
  }

  return ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $addToSet: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "likeItem",
        itemId: req.params.itemId,
        userId: req.user?._id,
      })
    );
};

module.exports.dislikeItem = (req, res) => {
  if (!req.user || !req.user._id) {
    console.error({
      msg: "dislike_missing_user",
      userId: req.user?._id,
      itemId: req.params.itemId,
      ts: new Date().toISOString(),
    });
    return res.status(BAD_REQUEST).send({ message: "Invalid data" });
  }

  return ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $pull: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "dislikeItem",
        itemId: req.params.itemId,
        userId: req.user?._id,
      })
    );
};

module.exports.getItems = (req, res) => {
  ClothingItem.find({})
    .then((items) => res.send(items))
    .catch((err) => handleMongooseError(res, err, { op: "getItems" }));
};

module.exports.createItem = (req, res) => {
  const { name, weather, imageUrl } = req.body;

  ClothingItem.create({ name, weather, imageUrl, owner: req.user._id })
    .then((item) => created(res, item))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "createItem",
        bodyKeys: Object.keys(req.body || {}),
        userId: req.user?._id,
      })
    );
};

module.exports.deleteItem = (req, res) => {
  const { itemId } = req.params;

  ClothingItem.findById(itemId)
    .orFail()
    .then((item) => {
      if (item.owner.toString() !== req.user._id) {
        return res
          .status(FORBIDDEN)
          .send({ message: "Forbidden" });
      }
      return item.deleteOne().then(() => res.send(item));
    })
    // .then((deleted) => res.send(deleted))
    .catch((err) =>
      handleMongooseError(res, err, { op: "deleteItem", itemId })
    );
};
