describe("Importing the Express app for SuperTest", () => {
  test("does not connect to MongoDB or listen on the production port", () => {
    const mongoose = require("mongoose");
    const express = require("express");
    const connect = jest.spyOn(mongoose, "connect");
    const listen = jest.spyOn(express.application, "listen");
    const app = require("../../app");
    expect(typeof app).toBe("function");
    expect(connect).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });
});
