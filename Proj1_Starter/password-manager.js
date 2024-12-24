"use strict";

/********* External Imports ********/
const { stringToBuffer, bufferToString, encodeBuffer, decodeBuffer, getRandomBytes } = require("./lib");
const { subtle } = require('crypto').webcrypto;

/********* Constants ********/
const PBKDF2_ITERATIONS = 100000; // number of iterations for PBKDF2 algorithm
const MAX_PASSWORD_LENGTH = 64;   // we can assume no password is longer than this many characters

/********* Implementation ********/
class Keychain {
  constructor() {
    this.data = {}; // Store member variables that you intend to be public here
    this.secrets = {}; // Store member variables that you intend to be private here
  }

  static async init(password) {
    const keychain = new Keychain();
    keychain.secrets.masterKey = await keychain.deriveKey(password);
    return keychain;
  }

  async deriveKey(password) {
    const salt = getRandomBytes(16);
    const keyMaterial = await subtle.importKey(
      'raw',
      stringToBuffer(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const key = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    this.secrets.salt = encodeBuffer(salt);
    return key;
  }

  async set(name, value) {
    const encodedName = encodeBuffer(stringToBuffer(name));
    const encodedValue = encodeBuffer(stringToBuffer(value));
    this.data[encodedName] = encodedValue;
  }

  async get(name) {
    const encodedName = encodeBuffer(stringToBuffer(name));
    const encodedValue = this.data[encodedName];
    if (encodedValue) {
      return bufferToString(decodeBuffer(encodedValue));
    }
    return null;
  }

  async remove(name) {
    const encodedName = encodeBuffer(stringToBuffer(name));
    if (encodedName in this.data) {
      delete this.data[encodedName];
      return true;
    }
    return false;
  }

  async dump() {
    const kvs = { ...this.data }; // Include the KVS object in the dump
    const dataString = JSON.stringify({ kvs });
    const dataBuffer = stringToBuffer(dataString);
    const hashBuffer = await subtle.digest('SHA-256', dataBuffer);
    const hashString = encodeBuffer(hashBuffer);
    return [dataString, hashString];
  }

  static async load(password, repr, trustedDataCheck) {
    const parsedData = JSON.parse(repr);
    if (trustedDataCheck) {
      const dataBuffer = stringToBuffer(repr);
      const hashBuffer = await subtle.digest('SHA-256', dataBuffer);
      const hashString = encodeBuffer(hashBuffer);
      if (hashString !== trustedDataCheck) {
        throw new Error("Integrity check failed");
      }
    }

    const keychain = new Keychain();
    try {
      // Attempt to derive the master key using the provided password
      keychain.secrets.masterKey = await keychain.deriveKey(password);
    } catch (error) {
      return false; // If an error is caught, return false indicating invalid password
    }

    keychain.data = parsedData.kvs; // Restore the KVS object from the parsed data
    return keychain;
  }
}

module.exports = { Keychain };