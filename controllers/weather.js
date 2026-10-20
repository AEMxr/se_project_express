const { getWeather } = require("../services/weather");

module.exports.getCurrentWeather = (req, res, next) =>
  getWeather(req.query.lat, req.query.lon)
    .then((weather) => {
      res.set("Cache-Control", "no-store");
      return res.send(weather);
    })
    .catch(next);
