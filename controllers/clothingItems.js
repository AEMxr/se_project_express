const ClothingItem = require("../models/clothingItem");
const { ForbiddenError, created } = require("../utils/errors");

module.exports.likeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $addToSet: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch(next);

module.exports.dislikeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $pull: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch(next);

module.exports.getItems = (req, res, next) =>
  ClothingItem.find({})
    .then((items) => res.send(items))
    .catch(next);

module.exports.createItem = (req, res, next) => {
  const { name, weather, imageUrl } = req.body;
  return ClothingItem.create({ name, weather, imageUrl, owner: req.user._id })
    .then((item) => created(res, item))
    .catch(next);
};

module.exports.deleteItem = (req, res, next) =>
  ClothingItem.findById(req.params.itemId)
    .orFail()
    .then((item) => {
      if (item.owner.toString() !== req.user._id) {
        throw new ForbiddenError();
      }
      return item.deleteOne().then(() => res.send(item));
    })
    .catch(next);
