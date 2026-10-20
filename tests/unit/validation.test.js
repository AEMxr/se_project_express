const supertest = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const User = require("../../models/user");
const ClothingItem = require("../../models/clothingItem");
const { JWT_SECRET } = require("../../utils/config");
const {
  validateSignup,
  validateSignin,
  validateProfile,
} = require("../../middlewares/validation");

const request = supertest(app);
const token = jwt.sign({ _id: "0123456789abcdef01234567" }, JWT_SECRET);
const signup = {
  name: "Test User",
  avatar: "https://example.com/avatar.jpg",
  email: "test@example.com",
  password: "Password1!",
};
let hash;
let createUser;
let findUser;
let createItem;
let updateUser;
let updateItem;
let findItem;

beforeEach(() => {
  // Any controller work for an invalid request is a failure, without touching a DB.
  const unexpected = () => {
    throw new Error("Validation allowed a controller operation");
  };
  hash = jest.spyOn(bcrypt, "hash").mockImplementation(unexpected);
  createUser = jest.spyOn(User, "create").mockImplementation(unexpected);
  findUser = jest
    .spyOn(User, "findUserByCredentials")
    .mockImplementation(unexpected);
  createItem = jest
    .spyOn(ClothingItem, "create")
    .mockImplementation(unexpected);
  updateUser = jest
    .spyOn(User, "findByIdAndUpdate")
    .mockImplementation(unexpected);
  updateItem = jest
    .spyOn(ClothingItem, "findByIdAndUpdate")
    .mockImplementation(unexpected);
  findItem = jest
    .spyOn(ClothingItem, "findById")
    .mockImplementation(unexpected);
});

afterEach(() => {
  [
    hash,
    createUser,
    findUser,
    createItem,
    updateUser,
    updateItem,
    findItem,
  ].forEach((operation) => expect(operation).not.toHaveBeenCalled());
});

describe("Signup validation runs before bcrypt or database work", () => {
  test.each([
    { name: undefined },
    { name: "x" },
    { name: "a".repeat(31) },
    { name: "  " },
    { name: 123 },
    { name: { $gt: "" } },
    { email: { $ne: null } },
    { email: "not-email" },
    { password: "short" },
    { password: 123 },
    { password: null },
    { avatar: "example.com/image.jpg" },
    { avatar: "ftp://example.com/image.jpg" },
    // eslint-disable-next-line no-script-url -- Reject script URLs at the request boundary.
    { avatar: "javascript:alert(1)" },
    { avatar: "data:image/png;base64,AAAA" },
    { avatar: "https://user:secret@example.com/image.jpg" },
    { avatar: "//example.com/image.jpg" },
    { avatar: "https://example/image.jpg" },
    { avatar: [] },
  ])("rejects invalid fields %p", async (changes) => {
    const result = await request
      .post("/signup")
      .send({ ...signup, ...changes })
      .expect(400);
    expect(result.body).toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    });
    expect(result.body.validation.body.keys.length).toBeGreaterThan(0);
    expect(typeof result.body.validation.body.message).toBe("string");
  });
  test("missing JSON bodies are rejected", async () => {
    await request.post("/signup").expect(400);
    await request.post("/signin").expect(400);
  });
  test.each([[], [signup], "null", "false"])(
    "rejects a non-object JSON body (%p)",
    async (body) => {
      const input = typeof body === "string" ? body : JSON.stringify(body);
      await request
        .post("/signup")
        .set("Content-Type", "application/json")
        .send(input)
        .expect(400);
    }
  );
  test("a body larger than the JSON parser limit gets a safe 413", async () => {
    await request
      .post("/signup")
      .send({ ...signup, name: "a".repeat(110 * 1024) })
      .expect(413, { message: "Request body is too large" });
  });
});

describe("Signin and profile validation", () => {
  test.each([
    { email: { $ne: null }, password: "Password1!" },
    { email: "test@example.com", password: {} },
    { email: "test@example.com", password: "" },
    { email: "bad-email", password: "Password1!" },
  ])("rejects invalid signin data %p", async (body) => {
    await request.post("/signin").send(body).expect(400);
  });
  test.each([
    {},
    { email: "new@example.com" },
    { name: "x" },
    { avatar: null },
    { name: 12 },
  ])("rejects invalid profile updates %p", async (body) => {
    await request
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(400);
  });
});

describe("Garment and ID validation", () => {
  test.each([
    {},
    { name: "Coat", weather: "snow", imageUrl: "https://example.com/a.jpg" },
    {
      name: "Coat",
      weather: "cold",
      imageUrl: { url: "https://example.com/a.jpg" },
    },
    { name: "Coat", weather: ["cold"], imageUrl: "https://example.com/a.jpg" },
    { name: "Coat", weather: "cold", imageUrl: "file:///image.jpg" },
  ])("rejects invalid garments %p", async (body) => {
    await request
      .post("/items")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(400);
  });
  test.each([
    ["delete", ""],
    ["put", "/likes"],
    ["delete", "/likes"],
  ])(
    "rejects 24-character IDs that are not hexadecimal (%s %s)",
    async (method, suffix) => {
      const result = await request[method](`/items/${"g".repeat(24)}${suffix}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      expect(result.body.validation.params.keys).toEqual(["itemId"]);
    }
  );
  test("authentication still runs before protected request validation", async () => {
    await request.post("/items").send({}).expect(401);
  });
});

describe("Valid payload boundaries and whitelisting", () => {
  async function validated(middleware, body) {
    const req = { method: "POST", body };
    const next = jest.fn();
    await middleware(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeFalsy();
    return req.body;
  }

  test("signup strips privileged fields and preserves password bytes", async () => {
    const body = await validated(validateSignup, {
      ...signup,
      password: " Password1! ",
      role: "admin",
      _id: "spoofed",
    });
    expect(body).toEqual({ ...signup, password: " Password1! " });
  });
  test.each(["ab", "a".repeat(30)])(
    "accepts name boundary %s",
    async (name) => {
      expect((await validated(validateSignup, { ...signup, name })).name).toBe(
        name
      );
    }
  );
  test("login accepts existing short passwords without signup restrictions", async () => {
    expect(
      await validated(validateSignin, { email: signup.email, password: "old" })
    ).toEqual({ email: signup.email, password: "old" });
  });
  test("partial profile updates retain only editable fields", async () => {
    expect(
      await validated(validateProfile, {
        name: "Updated User",
        email: "spoofed@example.com",
        _id: "spoofed",
      })
    ).toEqual({ name: "Updated User" });
  });
});
