// src/utils/hashids.js
const Hashids = require('hashids/cjs');

const salt = process.env.TABLE_SLUG_SALT || 'change-me';
const min = parseInt(process.env.TABLE_SLUG_MINLEN || '6', 10);

module.exports = new Hashids(salt, min);
