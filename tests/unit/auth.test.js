const jwt = require("jsonwebtoken");
const auth = require("../../middlewares/auth");
const { JWT_SECRET } = require("../../utils/config");

describe("JWT authentication middleware", () => {
  test("accepts a valid token and attaches its user ID", () => {
    const token = jwt.sign({ _id: "test-user" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    auth(req, {}, next);
    expect(req.user._id).toBe("test-user");
    expect(next).toHaveBeenCalledWith();
  });
  test.each([undefined, "", "Basic abc", "Bearer ", "Bearer nonsense"])(
    "rejects missing or malformed authorization (%p)",
    (authorization) => {
      const next = jest.fn();
      auth({ headers: { authorization } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authorization required",
        })
      );
    }
  );
  test.each([
    ["expired", () => jwt.sign({ _id: "user" }, JWT_SECRET, { expiresIn: -1 })],
    ["wrong secret", () => jwt.sign({ _id: "user" }, "not-the-secret")],
  ])("rejects a token with %s", (_name, token) => {
    const next = jest.fn();
    auth({ headers: { authorization: `Bearer ${token()}` } }, {}, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});
