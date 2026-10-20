const { celebrate, Joi, Segments } = require("celebrate");
const validator = require("validator");

const name = Joi.string().trim().min(2).max(30);
const imageUrl = Joi.string()
  .custom((value, helpers) => {
    if (
      !validator.isURL(value, {
        protocols: ["http", "https"],
        require_protocol: true,
        allow_protocol_relative_urls: false,
        disallow_auth: true,
      })
    ) {
      return helpers.error("string.uri");
    }
    return value;
  })
  .messages({
    "string.uri": "{{#label}} must be a valid HTTP or HTTPS image URL",
  });
const email = Joi.string().email({ tlds: { allow: false } });

// Discard fields outside the API's whitelist (owner, likes, email on profile
// updates, etc.). Never coerce objects/numbers into strings before validation.
const options = {
  abortEarly: false,
  convert: false,
  stripUnknown: { objects: true },
};

const validateSignup = celebrate(
  {
    [Segments.BODY]: Joi.object({
      name: name.required(),
      avatar: imageUrl.required(),
      email: email.required(),
      password: Joi.string().min(8).required(),
    }).required(),
  },
  options
);

const validateSignin = celebrate(
  {
    [Segments.BODY]: Joi.object({
      email: email.required(),
      // Existing accounts must still be able to use their original password.
      password: Joi.string().min(1).required(),
    }).required(),
  },
  options
);

const validateProfile = celebrate(
  {
    [Segments.BODY]: Joi.object({
      name,
      avatar: imageUrl,
    })
      .min(1)
      .required(),
  },
  options
);

const validateItem = celebrate(
  {
    [Segments.BODY]: Joi.object({
      name: name.required(),
      weather: Joi.string().valid("hot", "warm", "cold").required(),
      imageUrl: imageUrl.required(),
    }).required(),
  },
  options
);

const validateItemId = celebrate(
  {
    [Segments.PARAMS]: Joi.object({
      itemId: Joi.string().hex().length(24).required(),
    }).required(),
  },
  options
);

const validateWeatherQuery = celebrate(
  {
    [Segments.QUERY]: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lon: Joi.number().min(-180).max(180).required(),
    }).required(),
  },
  { abortEarly: false, convert: true }
);

module.exports = {
  validateWeatherQuery,
  validateSignup,
  validateSignin,
  validateProfile,
  validateItem,
  validateItemId,
};
