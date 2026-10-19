const supertest = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const User = require("../../models/user");
const ClothingItem = require("../../models/clothingItem");
const { JWT_SECRET } = require("../../utils/config");
const { useTestDatabase, seedUser, garment } = require("../helpers/database");

useTestDatabase();
const request = supertest(app);
const signup = {
  name: "New User",
  avatar: "https://example.com/avatar.jpg",
  email: "new@example.com",
  password: "Password1!",
};
let owner;
let other;
let item;

beforeEach(async () => {
  owner = await seedUser({ name: "Account A", email: "a@example.com" });
  other = await seedUser({ name: "Account B", email: "b@example.com" });
  item = await ClothingItem.create(garment(owner.user._id));
});
const authorize = (call, account = owner) =>
  call.set("Authorization", `Bearer ${account.token}`);

describe("Public endpoints and registration", () => {
  test("health and garment listing work without a JWT", async () => {
    await request.get("/").expect(200, { status: "ok" });
    const result = await request.get("/items").expect(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0]).toMatchObject({
      name: "Test Sweater",
      owner: owner.user._id.toString(),
    });
  });
  test("signup hashes passwords and never returns them", async () => {
    const result = await request.post("/signup").send(signup).expect(201);
    expect(result.body).toMatchObject({
      name: signup.name,
      email: signup.email,
      avatar: signup.avatar,
    });
    expect(result.body.password).toBeUndefined();
    const stored = await User.findById(result.body._id).select("+password");
    expect(stored.password).not.toBe(signup.password);
    expect(await bcrypt.compare(signup.password, stored.password)).toBe(true);
  });
  test("duplicate email returns 409", async () => {
    await request
      .post("/signup")
      .send({ ...signup, email: "a@example.com" })
      .expect(409);
  });
  test("concurrent duplicate registrations create exactly one account", async () => {
    const results = await Promise.all([
      request.post("/signup").send(signup),
      request.post("/signup").send(signup),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await User.countDocuments({ email: signup.email })).toBe(1);
  });
  test.each([
    { email: undefined },
    { password: undefined },
    { name: "x" },
    { avatar: "not-a-url" },
    { email: "bad-email" },
    { name: "a".repeat(31) },
  ])("rejects invalid signup data %p", async (overrides) => {
    await request
      .post("/signup")
      .send({ ...signup, ...overrides })
      .expect(400);
  });
  test("malformed JSON is a 400 response", async () => {
    await request
      .post("/signup")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400, { message: "Invalid data" });
  });
});

describe("Signing in and token authorization", () => {
  test("signin returns a usable signed JWT", async () => {
    const result = await request
      .post("/signin")
      .send({ email: "a@example.com", password: owner.password })
      .expect(200);
    expect(jwt.verify(result.body.token, JWT_SECRET)._id).toBe(
      owner.user._id.toString()
    );
    const profile = await request
      .get("/users/me")
      .set("Authorization", `Bearer ${result.body.token}`)
      .expect(200);
    expect(profile.body.email).toBe("a@example.com");
    expect(profile.body.password).toBeUndefined();
  });
  test.each([
    { email: "a@example.com", password: "wrong" },
    { email: "missing@example.com", password: "wrong" },
  ])("rejects incorrect credentials %p", async (credentials) => {
    await request
      .post("/signin")
      .send(credentials)
      .expect(401, { message: "Incorrect email or password" });
  });
  test.each([{}, { email: "a@example.com" }, { password: "Password1!" }])(
    "rejects missing credentials %p",
    async (credentials) => {
      await request.post("/signin").send(credentials).expect(400);
    }
  );
  test.each([
    ["get", "/users/me"],
    ["patch", "/users/me"],
    ["post", "/items"],
    ["delete", "/items/000000000000000000000001"],
    ["put", "/items/000000000000000000000001/likes"],
    ["delete", "/items/000000000000000000000001/likes"],
  ])("%s %s requires authorization", async (method, endpoint) => {
    await request[method](endpoint).send({}).expect(401);
  });
  test.each(["invalid", "expired", "wrong-secret"])(
    "rejects an %s token",
    async (kind) => {
      const token =
        kind === "invalid"
          ? "nonsense"
          : jwt.sign(
              { _id: owner.user._id },
              kind === "wrong-secret" ? "wrong" : JWT_SECRET,
              { expiresIn: kind === "expired" ? -1 : 60 }
            );
      await request
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);
    }
  );
  test("a deleted account cannot load its profile", async () => {
    await User.deleteOne({ _id: owner.user._id });
    await authorize(request.get("/users/me")).expect(404);
  });
});

describe("Profile updates", () => {
  test("updates only the authenticated account's name and avatar", async () => {
    const values = {
      name: "Updated User",
      avatar: "https://example.com/updated.jpg",
    };
    const result = await authorize(request.patch("/users/me"))
      .send({
        ...values,
        _id: other.user._id,
        email: "spoofed@example.com",
        password: "spoofed",
      })
      .expect(200);
    expect(result.body).toMatchObject({
      ...values,
      _id: owner.user._id.toString(),
      email: "a@example.com",
    });
    expect(result.body.password).toBeUndefined();
    expect((await User.findById(owner.user._id)).name).toBe(values.name);
    expect((await User.findById(other.user._id)).name).toBe("Account B");
  });
  test.each([{ name: "x" }, { avatar: "bad-url" }])(
    "rejects invalid updates %p without changing saved values",
    async (invalid) => {
      await authorize(request.patch("/users/me")).send(invalid).expect(400);
      expect((await User.findById(owner.user._id)).name).toBe("Account A");
    }
  );
});

describe("Garment creation and deletion", () => {
  test("creates garments for the authenticated owner and lists the saved record", async () => {
    const values = garment(other.user._id, {
      name: "New Coat",
      weather: "cold",
      likes: [other.user._id],
    });
    const result = await authorize(request.post("/items"))
      .send(values)
      .expect(201);
    expect(result.body).toMatchObject({
      name: "New Coat",
      weather: "cold",
      owner: owner.user._id.toString(),
      likes: [],
    });
    const saved = await ClothingItem.findById(result.body._id);
    expect(saved.owner.toString()).toBe(owner.user._id.toString());
    const listing = await request.get("/items").expect(200);
    expect(listing.body.some((entry) => entry._id === result.body._id)).toBe(
      true
    );
  });
  test.each([
    { name: "" },
    { name: "x" },
    { weather: "snow" },
    { imageUrl: "bad-url" },
  ])("rejects invalid garments %p", async (invalid) => {
    await authorize(request.post("/items"))
      .send(garment(owner.user._id, invalid))
      .expect(400);
    expect(await ClothingItem.countDocuments()).toBe(1);
  });
  test("missing garment fields produce a 400 response", async () => {
    await authorize(request.post("/items")).send({}).expect(400);
  });
  test("another account cannot delete a garment", async () => {
    await authorize(request.delete(`/items/${item._id}`), other).expect(403, {
      message: "Forbidden",
    });
    expect(await ClothingItem.findById(item._id)).not.toBeNull();
  });
  test("the owner can delete it, and a repeated deletion is 404", async () => {
    await authorize(request.delete(`/items/${item._id}`)).expect(200);
    expect(await ClothingItem.findById(item._id)).toBeNull();
    await authorize(request.delete(`/items/${item._id}`)).expect(404);
  });
  test.each(["delete", "put", "unlike"])(
    "handles malformed and nonexistent IDs for %s",
    async (operation) => {
      const method = operation === "unlike" ? "delete" : operation;
      const suffix = operation === "delete" ? "" : "/likes";
      await authorize(request[method](`/items/invalid-id${suffix}`)).expect(
        400
      );
      await authorize(
        request[method](`/items/${new mongoose.Types.ObjectId()}${suffix}`)
      ).expect(404);
    }
  );
});

describe("Likes persist and remain isolated by account", () => {
  test("repeated likes are idempotent and unlike removes only the current user's ID", async () => {
    const endpoint = `/items/${item._id}/likes`;
    await authorize(request.put(endpoint)).expect(200);
    await authorize(request.put(endpoint)).expect(200);
    await authorize(request.put(endpoint), other).expect(200);
    let saved = await ClothingItem.findById(item._id);
    expect(saved.likes.map(String).sort()).toEqual(
      [owner.user._id.toString(), other.user._id.toString()].sort()
    );
    await authorize(request.delete(endpoint)).expect(200);
    await authorize(request.delete(endpoint)).expect(200);
    saved = await ClothingItem.findById(item._id);
    expect(saved.likes.map(String)).toEqual([other.user._id.toString()]);
    const listing = await request.get("/items").expect(200);
    expect(listing.body[0].likes).toEqual([other.user._id.toString()]);
  });
});

describe("Failure handling and complete lifecycle", () => {
  test("unexpected database failures return a safe 500 response", async () => {
    jest
      .spyOn(ClothingItem, "find")
      .mockRejectedValue(new Error("Private database details"));
    const result = await request.get("/items").expect(500);
    expect(result.body).toEqual({
      message: "An error has occurred on the server.",
    });
  });
  test("unknown authenticated routes return 404", async () => {
    await authorize(request.get("/not-a-route")).expect(404);
  });
  test.each([400, 401, 403, 409, 422, 429, 500, 502, 503, 504])(
    "the debug %s route returns structured errors",
    async (status) => {
      const result = await request.get(`/test-errors/${status}`).expect(status);
      expect(typeof result.body.message).toBe("string");
      if (status === 500)
        expect(result.body.message).not.toContain("Internal test error");
    }
  );
  test("register, sign in, update profile, create, like, and delete a saved garment", async () => {
    await request.post("/signup").send(signup).expect(201);
    const signed = await request
      .post("/signin")
      .send({ email: signup.email, password: signup.password })
      .expect(200);
    const token = `Bearer ${signed.body.token}`;
    await request
      .patch("/users/me")
      .set("Authorization", token)
      .send({ name: "Lifecycle User", avatar: signup.avatar })
      .expect(200);
    const created = await request
      .post("/items")
      .set("Authorization", token)
      .send(garment(owner.user._id))
      .expect(201);
    await request
      .put(`/items/${created.body._id}/likes`)
      .set("Authorization", token)
      .expect(200);
    expect((await ClothingItem.findById(created.body._id)).likes).toHaveLength(
      1
    );
    await request
      .delete(`/items/${created.body._id}`)
      .set("Authorization", token)
      .expect(200);
    expect(await ClothingItem.findById(created.body._id)).toBeNull();
    expect((await User.findOne({ email: signup.email })).name).toBe(
      "Lifecycle User"
    );
  });
});

describe("Malformed request bodies", () => {
  test("garment creation without any request body is a client error", async () => {
    await authorize(request.post("/items")).expect(400);
  });
  test.each([123, [], {}])(
    "signup rejects non-string passwords (%p)",
    async (password) => {
      await request
        .post("/signup")
        .send({ ...signup, password })
        .expect(400);
    }
  );
  test.each([123, [], {}])(
    "signin rejects non-string passwords (%p)",
    async (password) => {
      await request
        .post("/signin")
        .send({ email: "a@example.com", password })
        .expect(400);
    }
  );
});
