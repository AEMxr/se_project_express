const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../../models/user");
const ClothingItem = require("../../models/clothingItem");
const { useTestDatabase, seedUser, garment } = require("../helpers/database");

useTestDatabase();

describe("User persistence and credentials", () => {
  test("stores accounts but excludes passwords from ordinary queries", async () => {
    const { user, password } = await seedUser();
    const ordinary = await User.findById(user._id);
    expect(ordinary.password).toBeUndefined();
    const selected = await User.findById(user._id).select("+password");
    expect(selected.password).not.toBe(password);
    expect(await bcrypt.compare(password, selected.password)).toBe(true);
  });
  test("enforces the unique email index", async () => {
    await seedUser({ email: "unique@example.com" });
    await expect(
      seedUser({ email: "unique@example.com" })
    ).rejects.toHaveProperty("code", 11000);
  });
  test.each([
    { name: "" },
    { name: "a" },
    { name: "a".repeat(31) },
    { email: "not-an-email" },
    { avatar: "not-a-url" },
    { avatar: "" },
  ])("rejects invalid account data %p", async (overrides) => {
    await expect(seedUser(overrides)).rejects.toHaveProperty(
      "name",
      "ValidationError"
    );
  });
  test.each(["ab", "a".repeat(30)])(
    "accepts a name at a length boundary (%p)",
    async (name) => {
      expect((await seedUser({ name })).user.name).toBe(name);
    }
  );
  test("findUserByCredentials verifies the stored password hash", async () => {
    const account = await seedUser({ email: "signin@example.com" });
    const found = await User.findUserByCredentials(
      "signin@example.com",
      account.password
    );
    expect(found._id.toString()).toBe(account.user._id.toString());
  });
  test("wrong passwords and unknown emails have the same safe failure", async () => {
    await seedUser({ email: "signin@example.com" });
    await expect(
      User.findUserByCredentials("signin@example.com", "wrong")
    ).rejects.toThrow("Incorrect email or password");
    await expect(
      User.findUserByCredentials("missing@example.com", "wrong")
    ).rejects.toThrow("Incorrect email or password");
  });
  test("validated profile updates reject bad data without changing the record", async () => {
    const { user } = await seedUser();
    await expect(
      User.findByIdAndUpdate(user._id, { name: "x" }, { runValidators: true })
    ).rejects.toHaveProperty("name", "ValidationError");
    expect((await User.findById(user._id)).name).toBe("Test User");
  });
});

describe("Garment persistence and validation", () => {
  test("stores owner, creation time, and empty likes", async () => {
    const { user } = await seedUser();
    const item = await ClothingItem.create(garment(user._id));
    const stored = await ClothingItem.findById(item._id);
    expect(stored.owner.toString()).toBe(user._id.toString());
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.likes).toHaveLength(0);
  });
  test.each([
    { name: "" },
    { name: "x" },
    { name: "a".repeat(31) },
    { weather: "rain" },
    { weather: "" },
    { imageUrl: "bad-url" },
    { imageUrl: "" },
    { owner: undefined },
  ])("rejects invalid garment data %p", async (overrides) => {
    await expect(
      ClothingItem.create(garment(new mongoose.Types.ObjectId(), overrides))
    ).rejects.toHaveProperty("name", "ValidationError");
  });
  test.each(["hot", "warm", "cold"])(
    "persists the %s weather category",
    async (weather) => {
      const item = await ClothingItem.create(
        garment(new mongoose.Types.ObjectId(), { weather })
      );
      expect((await ClothingItem.findById(item._id)).weather).toBe(weather);
    }
  );
  test("add-to-set and pull persist likes without duplicates", async () => {
    const owner = new mongoose.Types.ObjectId();
    const item = await ClothingItem.create(garment(owner));
    await ClothingItem.findByIdAndUpdate(item._id, {
      $addToSet: { likes: owner },
    });
    await ClothingItem.findByIdAndUpdate(item._id, {
      $addToSet: { likes: owner },
    });
    expect((await ClothingItem.findById(item._id)).likes.map(String)).toEqual([
      owner.toString(),
    ]);
    await ClothingItem.findByIdAndUpdate(item._id, { $pull: { likes: owner } });
    expect((await ClothingItem.findById(item._id)).likes).toHaveLength(0);
  });
});
